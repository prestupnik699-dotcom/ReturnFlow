import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clearChatMessages } from '@/features/chat/services/chat.service';

export function useClearChat(roomId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!roomId) throw new Error('No room id');
      const result = await clearChatMessages(roomId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', roomId] });
    },
  });
}
