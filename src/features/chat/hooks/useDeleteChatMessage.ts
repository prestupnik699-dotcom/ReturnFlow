import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteChatMessage } from '@/features/chat/services/chat.service';

export function useDeleteChatMessage(roomId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const result = await deleteChatMessage(messageId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', roomId] });
    },
  });
}
