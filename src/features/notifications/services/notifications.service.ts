import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function fetchNotifications(
  profileId: string,
): Promise<ServiceResult<AppNotification[]>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, type, is_read, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return fromCaughtError(error, 'FETCH_NOTIFICATIONS_FAILED');
  }

  return { success: true, data: (data as NotificationRow[]).map(mapNotification) };
}

export async function markNotificationRead(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);

  if (error) {
    return fromCaughtError(error, 'MARK_READ_FAILED');
  }

  return { success: true, data: null };
}

// Used by the Notification Center's "mark all read" — deliberately
// excludes chat_message rows, which have their own separate read path
// (opening Chat) and their own badge on the Chat entry point. Marking
// them read here too would make that badge disappear without the person
// ever having seen the messages.
export async function markAllNotificationsRead(profileId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', profileId)
    .eq('is_read', false)
    .neq('type', 'chat_message');

  if (error) {
    return fromCaughtError(error, 'MARK_ALL_READ_FAILED');
  }

  return { success: true, data: null };
}

// Chat messages create notification rows (for unread-count purposes) but
// are surfaced as a badge on the Chat entry point rather than as list
// items in the Notification Center — opening Chat should clear that
// badge the same way opening the notification list clears the bell.
export async function markChatNotificationsRead(profileId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', profileId)
    .eq('type', 'chat_message')
    .eq('is_read', false);

  if (error) {
    return fromCaughtError(error, 'MARK_CHAT_READ_FAILED');
  }

  return { success: true, data: null };
}
