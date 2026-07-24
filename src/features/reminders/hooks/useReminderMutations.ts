import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createReminder,
  updateReminderStatus,
  deleteReminder,
  type ReminderStatus,
} from '@/features/reminders/services/reminders.service';
import { useMembershipStore } from '@/stores/membership.store';
import { useAuthStore } from '@/stores/auth.store';

function useInvalidateReminders() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['reminders', activeOrganizationId] });
}

type CreateReminderValues = {
  title: string;
  dueDate: string;
  relatedSupplierId: string | null;
  recipientProfileIds: string[];
};

export function useCreateReminder() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const profile = useAuthStore((state) => state.profile);
  const invalidate = useInvalidateReminders();

  return useMutation({
    mutationFn: async (values: CreateReminderValues) => {
      if (!activeOrganizationId || !profile) throw new Error('No active organization');
      const result = await createReminder({
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        title: values.title,
        dueDate: values.dueDate,
        relatedSupplierId: values.relatedSupplierId,
        createdBy: profile.id,
        recipientProfileIds: values.recipientProfileIds,
      });
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateReminderStatus() {
  const invalidate = useInvalidateReminders();

  return useMutation({
    mutationFn: async ({ reminderId, status }: { reminderId: string; status: ReminderStatus }) => {
      const result = await updateReminderStatus(reminderId, status);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteReminder() {
  const invalidate = useInvalidateReminders();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const result = await deleteReminder(reminderId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}
