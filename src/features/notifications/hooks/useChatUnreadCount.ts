import { useNotifications } from '@/features/notifications/hooks/useNotifications';

export function useChatUnreadCount(): number {
  const { data } = useNotifications();
  return data?.filter((n) => !n.isRead && n.type === 'chat_message').length ?? 0;
}
