import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const tabBarClearance = useTabBarClearance();
  const { data: notifications, isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();
  const styles = createStyles(theme);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const bodyOrTitle = (n: AppNotification) =>
    n.type === 'chat_message' ? t('chat.newMessage') : n.title;

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('common.notifications')}</Text>
          {unreadCount > 0 ? (
            <Pressable onPress={() => markAllMutation.mutate()}>
              <Text style={styles.markAllText}>{t('chat.markAllRead')}</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
            ListEmptyComponent={<EmptyState icon="notifications-outline" title={t('chat.empty')} />}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 40).duration(220)}>
                <Pressable onPress={() => !item.isRead && markReadMutation.mutate(item.id)}>
                  <Card>
                    <View style={styles.row}>
                      {!item.isRead ? (
                        <View style={styles.unreadDot} />
                      ) : (
                        <View style={styles.dotSpacer} />
                      )}
                      <View style={styles.info}>
                        <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
                          {bodyOrTitle(item)}
                        </Text>
                        <Text style={styles.notifBody} numberOfLines={2}>
                          {item.body}
                        </Text>
                        <Text style={styles.notifMeta}>{formatDateTime(item.createdAt)}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </Animated.View>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    markAllText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeights.medium,
    },
    list: { gap: theme.spacing.sm },
    row: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.lg },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      marginTop: 6,
    },
    dotSpacer: { width: 8 },
    info: { flex: 1, gap: 2 },
    notifTitle: { fontSize: theme.fontSizes.md, color: theme.colors.textSecondary },
    notifTitleUnread: { color: theme.colors.textPrimary, fontWeight: theme.fontWeights.semiBold },
    notifBody: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    notifMeta: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary, marginTop: 2 },
  });
}
