import { useNotifications } from '@/features/notifications/hooks/useNotifications';

// Chat messages are surfaced as a badge on the Chat entry point instead
// of showing up in the Notification Center list — so they're excluded
// from the bell's count, and useChatUnreadCount below tracks them
// separately.
export function useUnreadCount(): number {
  const { data } = useNotifications();
  return data?.filter((n) => !n.isRead && n.type !== 'chat_message').length ?? 0;
}
