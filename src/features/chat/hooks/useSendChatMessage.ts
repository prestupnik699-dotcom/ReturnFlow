import { useMutation } from '@tanstack/react-query';
import { sendChatMessage } from '@/features/chat/services/chat.service';
import { useAuthStore } from '@/stores/auth.store';

export function useSendChatMessage(roomId: string) {
  const profile = useAuthStore((state) => state.profile);

  return useMutation({
    mutationFn: async (message: string) => {
      if (!profile) throw new Error('No profile');
      const result = await sendChatMessage(roomId, profile.id, message);
      if (!result.success) throw new Error(result.error.message);
    },
    // No manual cache update needed — the realtime subscription in
    // useChatMessages picks up the INSERT and refetches automatically.
  });
}
