import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchNotifications } from '@/features/notifications/services/notifications.service';
import { useAuthStore } from '@/stores/auth.store';

export function useNotifications() {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile) throw new Error('No profile');
      const result = await fetchNotifications(profile.id);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!profile,
  });

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, queryClient]);

  return query;
}
