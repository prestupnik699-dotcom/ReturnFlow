import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/features/notifications/services/notifications.service';
import { useAuthStore } from '@/stores/auth.store';

export function useMarkNotificationRead() {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await markNotificationRead(id);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] }),
  });
}

export function useMarkAllNotificationsRead() {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('No profile');
      const result = await markAllNotificationsRead(profile.id);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] }),
  });
}
