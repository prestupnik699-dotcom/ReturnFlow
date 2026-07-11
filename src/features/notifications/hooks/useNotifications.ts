import { useEffect, useId } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchNotifications } from '@/features/notifications/services/notifications.service';
import { useAuthStore } from '@/stores/auth.store';

export function useNotifications() {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();
  // Each mounted instance of this hook needs its own realtime channel name —
  // it can be called from multiple places at once (tab badge + the screen
  // itself), and Supabase refuses a second subscribe() on the same channel name.
  const instanceId = useId();

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
      .channel(`notifications:${profile.id}:${instanceId}`)
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
      .subscribe((status) => {
        if (__DEV__) console.log('[notifications realtime]', status, profile.id);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, instanceId, queryClient]);

  return query;
}
