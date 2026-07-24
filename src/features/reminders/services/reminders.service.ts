import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ReminderStatus = 'active' | 'done' | 'dismissed';

export type Reminder = {
  id: string;
  organizationId: string;
  storeId: string | null;
  title: string;
  dueDate: string;
  status: ReminderStatus;
  relatedSupplierId: string | null;
  relatedSupplierName: string | null;
  createdBy: string;
  createdAt: string;
  recipientProfileIds: string[];
};

type ReminderRow = {
  id: string;
  organization_id: string;
  store_id: string | null;
  title: string;
  due_date: string;
  status: ReminderStatus;
  related_supplier_id: string | null;
  created_by: string;
  created_at: string;
  suppliers: { name: string } | null;
  reminder_recipients: { profile_id: string }[];
};

const SELECT_FIELDS =
  'id, organization_id, store_id, title, due_date, status, related_supplier_id, created_by, created_at, suppliers(name), reminder_recipients(profile_id)';

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    title: row.title,
    dueDate: row.due_date,
    status: row.status,
    relatedSupplierId: row.related_supplier_id,
    relatedSupplierName: row.suppliers?.name ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    recipientProfileIds: (row.reminder_recipients ?? []).map((r) => r.profile_id),
  };
}

export async function fetchReminders(organizationId: string): Promise<ServiceResult<Reminder[]>> {
  const { data, error } = await supabase
    .from('reminders')
    .select(SELECT_FIELDS)
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: true });

  if (error) {
    return fromCaughtError(error, 'FETCH_REMINDERS_FAILED');
  }

  return { success: true, data: (data as unknown as ReminderRow[]).map(mapReminder) };
}

type CreateReminderInput = {
  organizationId: string;
  storeId: string | null;
  title: string;
  dueDate: string;
  relatedSupplierId: string | null;
  createdBy: string;
  recipientProfileIds: string[];
};

export async function createReminder(input: CreateReminderInput): Promise<ServiceResult<Reminder>> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      organization_id: input.organizationId,
      store_id: input.storeId,
      title: input.title,
      due_date: input.dueDate,
      related_supplier_id: input.relatedSupplierId,
      created_by: input.createdBy,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_REMINDER_FAILED');
  }

  // The creator is always a recipient, plus whichever teammates were
  // additionally selected — deduplicated via a Set since the creator may
  // also appear in the chosen list.
  const recipientIds = Array.from(new Set([input.createdBy, ...input.recipientProfileIds]));
  const { error: recipientsError } = await supabase
    .from('reminder_recipients')
    .insert(recipientIds.map((profileId) => ({ reminder_id: data.id, profile_id: profileId })));

  if (recipientsError) {
    return fromCaughtError(recipientsError, 'CREATE_REMINDER_RECIPIENTS_FAILED');
  }

  return {
    success: true,
    data: mapReminder({
      ...(data as unknown as ReminderRow),
      reminder_recipients: recipientIds.map((id) => ({ profile_id: id })),
    }),
  };
}

type UpdateReminderInput = {
  title: string;
  dueDate: string;
  relatedSupplierId: string | null;
  createdBy: string;
  recipientProfileIds: string[];
};

export async function updateReminder(
  reminderId: string,
  input: UpdateReminderInput,
): Promise<ServiceResult<null>> {
  // Resetting both notified_*_at flags whenever a reminder is edited —
  // not just when the date changes — is the safe default: if the person
  // is editing it at all, the dispatcher should re-evaluate it fresh on
  // the next hourly pass rather than silently honoring a stale "already
  // sent" flag from before the edit.
  const { error: updateError } = await supabase
    .from('reminders')
    .update({
      title: input.title,
      due_date: input.dueDate,
      related_supplier_id: input.relatedSupplierId,
      notified_before_at: null,
      notified_due_at: null,
    })
    .eq('id', reminderId);

  if (updateError) {
    return fromCaughtError(updateError, 'UPDATE_REMINDER_FAILED');
  }

  const { error: deleteRecipientsError } = await supabase
    .from('reminder_recipients')
    .delete()
    .eq('reminder_id', reminderId);

  if (deleteRecipientsError) {
    return fromCaughtError(deleteRecipientsError, 'UPDATE_REMINDER_RECIPIENTS_FAILED');
  }

  const recipientIds = Array.from(new Set([input.createdBy, ...input.recipientProfileIds]));
  const { error: insertRecipientsError } = await supabase
    .from('reminder_recipients')
    .insert(recipientIds.map((profileId) => ({ reminder_id: reminderId, profile_id: profileId })));

  if (insertRecipientsError) {
    return fromCaughtError(insertRecipientsError, 'UPDATE_REMINDER_RECIPIENTS_FAILED');
  }

  return { success: true, data: null };
}

export async function updateReminderStatus(
  reminderId: string,
  status: ReminderStatus,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('reminders').update({ status }).eq('id', reminderId);

  if (error) {
    return fromCaughtError(error, 'UPDATE_REMINDER_STATUS_FAILED');
  }

  return { success: true, data: null };
}

export async function deleteReminder(reminderId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('reminders').delete().eq('id', reminderId);

  if (error) {
    return fromCaughtError(error, 'DELETE_REMINDER_FAILED');
  }

  return { success: true, data: null };
}
