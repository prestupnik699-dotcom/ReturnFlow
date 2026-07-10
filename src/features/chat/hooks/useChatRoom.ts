import { useQuery } from '@tanstack/react-query';
import { fetchRoomForStore } from '@/features/chat/services/chat.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useChatRoom() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['chatRoom', activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');
      const result = await fetchRoomForStore(activeStoreId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeStoreId,
  });
}
