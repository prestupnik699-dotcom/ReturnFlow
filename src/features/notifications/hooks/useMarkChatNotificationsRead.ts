import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markChatNotificationsRead } from '@/features/notifications/services/notifications.service';
import { useAuthStore } from '@/stores/auth.store';

export function useMarkChatNotificationsRead() {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const result = await markChatNotificationsRead(profile.id);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
    },
  });
}
