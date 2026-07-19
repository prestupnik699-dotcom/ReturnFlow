import { View, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications/hooks/useNotificationActions';
import type { AppNotification } from '@/features/notifications/services/notifications.service';

type Theme = ReturnType<typeof useTheme>;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type TypeVisual = { icon: keyof typeof Ionicons.glyphMap; color: (theme: Theme) => string };

const TYPE_VISUALS: Record<string, TypeVisual> = {
  urgent_return_created: { icon: 'alert-circle', color: (t) => t.colors.danger },
  return_created: { icon: 'repeat-outline', color: (t) => t.colors.primary },
  delivery_created: { icon: 'download-outline', color: (t) => t.colors.accent },
};

const DEFAULT_VISUAL: TypeVisual = {
  icon: 'notifications-outline',
  color: (t) => t.colors.textSecondary,
};

type ListItem =
  | { kind: 'divider'; id: string; label: string }
  | { kind: 'notification'; id: string; notification: AppNotification };

export function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  // Chat messages get their own badge on the Chat entry point (Ещё) instead
  // of showing up here — this list only ever fetches/renders non-chat rows.
  const { data: allNotifications, isLoading, isError, error } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();
  const styles = createStyles(theme);

  const notifications = (allNotifications ?? []).filter((n) => n.type !== 'chat_message');
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dayKey(iso) === dayKey(now.toISOString())) return t('chat.dateToday');
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return t('chat.dateYesterday');
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  };

  const listItems: ListItem[] = [];
  let lastDay: string | null = null;
  for (const notification of notifications) {
    const day = dayKey(notification.createdAt);
    if (day !== lastDay) {
      listItems.push({
        kind: 'divider',
        id: `divider-${day}`,
        label: dayLabel(notification.createdAt),
      });
      lastDay = day;
    }
    listItems.push({ kind: 'notification', id: notification.id, notification });
  }

  const handlePress = (item: AppNotification) => {
    if (!item.isRead) markReadMutation.mutate(item.id);
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'divider') {
      return (
        <View style={styles.dividerRow}>
          <View style={styles.dividerPill}>
            <Text style={styles.dividerText}>{item.label}</Text>
          </View>
        </View>
      );
    }

    const notification = item.notification;
    const visual = TYPE_VISUALS[notification.type] ?? DEFAULT_VISUAL;
    const color = visual.color(theme);

    return (
      <Animated.View entering={FadeInDown.duration(200)}>
        <PressableScale onPress={() => handlePress(notification)}>
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: color + '1F' }]}>
                <Ionicons name={visual.icon} size={18} color={color} />
              </View>
              <View style={styles.info}>
                <Text
                  style={[styles.notifTitle, !notification.isRead && styles.notifTitleUnread]}
                  numberOfLines={1}
                >
                  {t(notification.title)}
                </Text>
                <Text style={styles.notifBody} numberOfLines={2}>
                  {notification.body}
                </Text>
              </View>
              <View style={styles.metaCol}>
                {!notification.isRead ? <View style={styles.unreadDot} /> : null}
                <Text style={styles.notifTime}>{formatTime(notification.createdAt)}</Text>
              </View>
            </View>
          </Card>
        </PressableScale>
      </Animated.View>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('common.notifications')}</Text>
          {unreadCount > 0 ? (
            <Pressable onPress={() => markAllMutation.mutate()}>
              <Text style={styles.markAllText}>{t('chat.markAllRead')}</Text>
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
            ListEmptyComponent={
              <EmptyState
                icon="notifications-outline"
                title={t('notifications.emptyTitle')}
                message={t('notifications.emptyMessage')}
              />
            }
            renderItem={renderItem}
          />
        )}
      </View>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, paddingTop: theme.spacing.xl },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    markAllText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeights.medium,
    },
    spacer: { width: 36 },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    list: { gap: theme.spacing.sm },
    dividerRow: { alignItems: 'center', marginVertical: theme.spacing.sm },
    dividerPill: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 4,
    },
    dividerText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 2 },
    notifTitle: { fontSize: theme.fontSizes.md, color: theme.colors.textSecondary },
    notifTitleUnread: { color: theme.colors.textPrimary, fontWeight: theme.fontWeights.semiBold },
    notifBody: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    metaCol: { alignItems: 'flex-end', gap: 4 },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    notifTime: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
  });
}
