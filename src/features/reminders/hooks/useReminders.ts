import { useQuery } from '@tanstack/react-query';
import { fetchReminders } from '@/features/reminders/services/reminders.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useReminders() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['reminders', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) throw new Error('No active organization');
      const result = await fetchReminders(activeOrganizationId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}
