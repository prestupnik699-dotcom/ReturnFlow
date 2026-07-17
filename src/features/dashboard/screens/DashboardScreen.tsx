import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useReturns } from '@/features/returns/hooks/useReturns';
import { useWeeklyActivity } from '@/features/statistics/hooks/useWeeklyActivity';
import { usePendingSyncCount } from '@/features/statistics/hooks/usePendingSyncCount';
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount';
import { ReturnFormSheet } from '@/features/returns/screens/ReturnFormSheet';
import { BatchReturnSheet } from '@/features/returns/screens/BatchReturnSheet';
import type { ReturnItem } from '@/features/returns/services/returns.service';

const LOCALE_MAP: Record<string, string> = { ka: 'ka-GE', en: 'en-US', ru: 'ru-RU' };

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DashboardScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const profile = useAuthStore((state) => state.profile);
  const language = useLanguageStore((state) => state.language);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const unreadCount = useUnreadCount();
  const [formVisible, setFormVisible] = useState(false);
  const [batchVisible, setBatchVisible] = useState(false);
  const styles = createStyles(theme);

  const { data: allReturns, isLoading } = useReturns();
  const { data: weeklyActivity } = useWeeklyActivity();
  const { data: pendingSyncCount } = usePendingSyncCount();

  const today = new Date();
  const totalCount = allReturns?.length ?? 0;
  const todayCount = allReturns?.filter((r) => isSameDay(new Date(r.createdAt), today)).length ?? 0;
  const urgentCount = allReturns?.filter((r) => r.status === 'urgent').length ?? 0;
  const recentReturns = (allReturns ?? []).slice(0, 5);

  const hour = today.getHours();
  const greeting =
    hour < 5
      ? t('dashboard.greetingNight', { name: profile?.firstName ?? '' })
      : hour < 12
        ? t('dashboard.greetingMorning', { name: profile?.firstName ?? '' })
        : hour < 18
          ? t('dashboard.greetingDay', { name: profile?.firstName ?? '' })
          : t('dashboard.greetingEvening', { name: profile?.firstName ?? '' });

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : '?';

  const maxActivity = Math.max(...(weeklyActivity ?? []).map((p) => p.count), 1);

  const formatRelativeTime = (iso: string) => {
    const diffMs = today.getTime() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t('dashboard.timeJustNow');
    if (minutes < 60) return t('dashboard.timeMinutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('dashboard.timeHoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('dashboard.timeDaysAgo', { count: days });
  };

  const dayLabel = (isoDate: string) => {
    const d = new Date(`${isoDate}T00:00:00`);
    const locale = LOCALE_MAP[language] ?? 'en-US';
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  };

  // No active store yet — this isn't "no returns", it's a setup step the
  // person hasn't completed. Say that plainly and point at the fix,
  // rather than showing a generic empty-returns state that implies data
  // just hasn't been created yet.
  if (!activeStoreId) {
    return (
      <Screen>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="storefront-outline"
            title={t('dashboard.noStoreTitle')}
            message={t('dashboard.noStoreMessage')}
          />
          <Button
            label={t('dashboard.noStoreButton')}
            icon="arrow-forward"
            onPress={() => router.push('/stores')}
          />
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: tabBarClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.push('/notifications')}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              {unreadCount > 0 ? <View style={styles.headerBadge} /> : null}
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.push('/profile-settings')}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.greeting}>
          {greeting}{' '}
          <Ionicons name="hand-left-outline" size={20} color={theme.colors.textPrimary} />
        </Text>
        <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>

        {totalCount === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState icon="repeat-outline" title={t('dashboard.emptyTitle')} />
            <Button
              label={t('returns.addButton')}
              icon="add"
              onPress={() => setFormVisible(true)}
            />
          </View>
        ) : (
          <>
            <LinearGradient
              colors={[theme.colors.card, theme.colors.surfaceVariant]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.overviewCard}
            >
              <View style={styles.overviewStat}>
                <Ionicons name="repeat-outline" size={20} color={theme.colors.accent} />
                <Text style={styles.overviewValue}>{totalCount}</Text>
                <Text style={styles.overviewLabel}>{t('dashboard.overviewTotal')}</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewStat}>
                <Ionicons name="today-outline" size={20} color={theme.colors.accent} />
                <Text style={styles.overviewValue}>{todayCount}</Text>
                <Text style={styles.overviewLabel}>{t('dashboard.overviewToday')}</Text>
              </View>
            </LinearGradient>

            <View style={styles.quickActionsRow}>
              <QuickAction
                icon="add-circle-outline"
                label={t('dashboard.actionCreateReturn')}
                onPress={() => setFormVisible(true)}
                theme={theme}
              />
              <QuickAction
                icon="scan-outline"
                label={t('dashboard.actionScanner')}
                onPress={() => router.push('/scanner')}
                theme={theme}
              />
              <QuickAction
                icon="flash-outline"
                label={t('dashboard.actionBatch')}
                onPress={() => setBatchVisible(true)}
                theme={theme}
              />
              <QuickAction
                icon="bar-chart-outline"
                label={t('dashboard.actionStatistics')}
                onPress={() => router.push('/statistics')}
                theme={theme}
              />
            </View>

            {urgentCount > 0 || todayCount > 0 || (pendingSyncCount ?? 0) > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('dashboard.attentionTitle')}</Text>
                {urgentCount > 0 ? (
                  <AttentionCard
                    icon="alert-circle"
                    color={theme.colors.danger}
                    text={t('dashboard.attentionUrgent', { count: urgentCount })}
                    onPress={() => router.push('/returns')}
                    theme={theme}
                  />
                ) : null}
                {todayCount > 0 ? (
                  <AttentionCard
                    icon="today"
                    color={theme.colors.accent}
                    text={t('dashboard.attentionToday', { count: todayCount })}
                    onPress={() => router.push('/returns')}
                    theme={theme}
                  />
                ) : null}
                {(pendingSyncCount ?? 0) > 0 ? (
                  <AttentionCard
                    icon="cloud-upload"
                    color={theme.colors.warning}
                    text={t('dashboard.attentionPendingSync', { count: pendingSyncCount })}
                    onPress={() => router.push('/returns')}
                    theme={theme}
                  />
                ) : null}
              </View>
            ) : null}

            {weeklyActivity ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('dashboard.activityTitle')}</Text>
                <Card>
                  <View style={styles.chartCard}>
                    <View style={styles.chartBars}>
                      {weeklyActivity.map((point) => (
                        <View key={point.date} style={styles.chartBarColumn}>
                          <View style={styles.chartBarTrack}>
                            <View
                              style={[
                                styles.chartBarFill,
                                {
                                  height: `${Math.max((point.count / maxActivity) * 100, point.count > 0 ? 6 : 2)}%`,
                                  backgroundColor: theme.colors.primary,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.chartBarLabel}>{dayLabel(point.date)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Card>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('dashboard.recentTitle')}</Text>
                <Pressable onPress={() => router.push('/returns')}>
                  <Text style={styles.seeAllText}>{t('dashboard.recentSeeAll')}</Text>
                </Pressable>
              </View>
              {recentReturns.length === 0 ? (
                <Text style={styles.emptyRecentText}>{t('dashboard.recentEmpty')}</Text>
              ) : (
                recentReturns.map((item: ReturnItem, index: number) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(index * 40).duration(200)}
                  >
                    <Pressable onPress={() => router.push(`/return/${item.id}`)}>
                      <Card>
                        <View style={styles.recentRow}>
                          <View style={styles.recentIconWrap}>
                            <Ionicons
                              name="repeat-outline"
                              size={16}
                              color={theme.colors.primary}
                            />
                          </View>
                          <View style={styles.recentInfo}>
                            <Text style={styles.recentTitle}>{t('dashboard.returnCreated')}</Text>
                            <Text style={styles.recentSubtitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                          </View>
                          <Text style={styles.recentTime}>
                            {formatRelativeTime(item.createdAt)}
                          </Text>
                        </View>
                      </Card>
                    </Pressable>
                  </Animated.View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ReturnFormSheet visible={formVisible} onClose={() => setFormVisible(false)} />
      <BatchReturnSheet visible={batchVisible} onClose={() => setBatchVisible(false)} />
    </Screen>
  );
}

type Theme = ReturnType<typeof useTheme>;

function QuickAction({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  const styles = createQuickActionStyles(theme);
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={styles.tileIconWrap}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function createQuickActionStyles(theme: Theme) {
  return StyleSheet.create({
    tile: {
      flex: 1,
      minHeight: 92,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tileIconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileLabel: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
  });
}

function AttentionCard({
  icon,
  color,
  text,
  onPress,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
  onPress: () => void;
  theme: Theme;
}) {
  const styles = createAttentionStyles(theme);
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: color + '1F' }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={styles.text}>{text}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </View>
      </Card>
    </Pressable>
  );
}

function createAttentionStyles(theme: Theme) {
  return StyleSheet.create({
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
    text: {
      flex: 1,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textPrimary,
    },
  });
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: theme.spacing.lg, paddingTop: theme.spacing.sm },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.onPrimary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.bold,
    },
    headerActions: { flexDirection: 'row', gap: theme.spacing.sm },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.danger,
      borderWidth: 1.5,
      borderColor: theme.colors.background,
    },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    greeting: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.md,
    },
    subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    emptyWrap: { alignItems: 'center', gap: theme.spacing.lg, paddingTop: theme.spacing['3xl'] },
    overviewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
    },
    overviewStat: { flex: 1, alignItems: 'center', gap: 4 },
    overviewDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
    overviewValue: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    overviewLabel: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    quickActionsRow: { flexDirection: 'row', gap: theme.spacing.sm },
    section: { gap: theme.spacing.sm },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
    },
    seeAllText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeights.medium,
    },
    chartCard: { padding: theme.spacing.lg },
    chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, height: 100 },
    chartBarColumn: { flex: 1, alignItems: 'center', gap: 6, height: '100%' },
    chartBarTrack: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.sm,
      overflow: 'hidden',
    },
    chartBarFill: { width: '100%', borderRadius: theme.radius.sm },
    chartBarLabel: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    emptyRecentText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingVertical: theme.spacing.lg,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    recentIconWrap: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentInfo: { flex: 1, gap: 2 },
    recentTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    recentSubtitle: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    recentTime: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
  });
}
