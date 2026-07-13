import { useEffect, useId } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchMessages } from '@/features/chat/services/chat.service';

export function useChatMessages(roomId: string | null) {
  const queryClient = useQueryClient();
  const instanceId = useId();

  const query = useQuery({
    queryKey: ['chatMessages', roomId],
    queryFn: async () => {
      if (!roomId) throw new Error('No room id');
      const result = await fetchMessages(roomId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!roomId,
  });

  useEffect(() => {
    if (!roomId) return;

    // Listens to every change type (not just INSERT) — a soft-delete is an
    // UPDATE (deleted_at gets set), and both single-message delete and
    // clear-whole-chat rely on this to actually reach other people's
    // screens in real time, not just the device that performed the action.
    const channel = supabase
      .channel(`chat_messages:${roomId}:${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chatMessages', roomId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, instanceId, queryClient]);

  return query;
}
