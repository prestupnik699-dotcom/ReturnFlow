import { useNotifications } from '@/features/notifications/hooks/useNotifications';

export function useUnreadCount(): number {
  const { data } = useNotifications();
  return data?.filter((n) => !n.isRead).length ?? 0;
}
