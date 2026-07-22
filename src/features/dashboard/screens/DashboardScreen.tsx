import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useReturns } from '@/features/returns/hooks/useReturns';
import { usePendingSyncCount } from '@/features/statistics/hooks/usePendingSyncCount';
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount';
import { ReturnFormSheet } from '@/features/returns/screens/ReturnFormSheet';
import type { ReturnItem } from '@/features/returns/services/returns.service';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// A handful of pronounced left-right rotations, replayed every time this
// screen regains focus (not just once per app session — tab screens in
// Expo Router stay mounted after the first visit, so a plain "entering"
// animation would otherwise never play again after leaving and coming
// back to this tab). Ionicons is kept here deliberately — Feather has no
// hand/wave glyph, so this is the one intentional exception to the
// Feather-icon switch across the rest of this screen.
function WavingHand({
  size,
  color,
  replayKey,
}: {
  size: number;
  color: string;
  replayKey: number;
}) {
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = 0;
    rotate.value = withDelay(
      600,
      withSequence(
        withTiming(32, { duration: 220 }),
        withTiming(-22, { duration: 220 }),
        withTiming(28, { duration: 220 }),
        withTiming(-18, { duration: 220 }),
        withTiming(14, { duration: 180 }),
        withTiming(0, { duration: 180 }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: replayKey is the only thing that should re-trigger this
  }, [replayKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="hand-left-outline" size={size} color={color} />
    </Animated.View>
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
  const [greetingReplayKey, setGreetingReplayKey] = useState(0);
  const styles = createStyles(theme);

  useFocusEffect(
    useCallback(() => {
      setGreetingReplayKey((k) => k + 1);
    }, []),
  );

  const { data: allReturns, isLoading } = useReturns();
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

  // No active store yet — this isn't "no returns", it's a setup step the
  // person hasn't completed. Say that plainly and point at the fix,
  // rather than showing a generic empty-returns state that implies data
  // just hasn't been created yet.
  if (!activeStoreId) {
    return (
      <Screen>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="shopping-bag"
            title={t('dashboard.noStoreTitle')}
            message={t('dashboard.noStoreMessage')}
            actionLabel={t('dashboard.noStoreButton')}
            onAction={() => router.push('/stores')}
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
              <Feather name="bell" size={20} color={theme.colors.primary} />
              {unreadCount > 0 ? <View style={styles.headerBadge} /> : null}
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.push('/profile-settings')}
              hitSlop={8}
            >
              <Feather name="settings" size={20} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        <Animated.View key={`greeting-${greetingReplayKey}`} entering={FadeInDown.duration(450)}>
          <Text
            style={styles.greeting}
            numberOfLines={language === 'ka' ? 1 : undefined}
            adjustsFontSizeToFit={language === 'ka'}
            minimumFontScale={0.75}
          >
            {greeting}{' '}
            <WavingHand size={26} color={theme.colors.textPrimary} replayKey={greetingReplayKey} />
          </Text>
        </Animated.View>
        <Animated.Text
          key={`subtitle-${greetingReplayKey}`}
          entering={FadeInDown.delay(150).duration(450)}
          style={styles.subtitle}
        >
          {t('dashboard.subtitle')}
        </Animated.Text>

        {totalCount === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="repeat"
              title={t('dashboard.emptyTitle')}
              actionLabel={t('returns.addButton')}
              onAction={() => setFormVisible(true)}
            />
          </View>
        ) : (
          <>
            <View style={styles.bentoRow}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bentoHero}
              >
                <Feather name="repeat" size={22} color={theme.colors.onPrimary} />
                <AnimatedNumber value={totalCount} style={styles.bentoHeroValue} />
                <Text style={styles.bentoHeroLabel}>{t('dashboard.overviewTotal')}</Text>
              </LinearGradient>
              <View style={styles.bentoSide}>
                <Feather name="calendar" size={18} color={theme.colors.accent} />
                <AnimatedNumber value={todayCount} style={styles.bentoSideValue} />
                <Text style={styles.bentoSideLabel}>{t('dashboard.overviewToday')}</Text>
              </View>
            </View>

            <View style={styles.quickActionsRow}>
              <QuickAction
                icon="plus-circle"
                label={t('dashboard.actionCreateReturn')}
                onPress={() => setFormVisible(true)}
                theme={theme}
              />
              <QuickAction
                icon="maximize"
                label={t('dashboard.actionScanner')}
                onPress={() => router.push('/scanner')}
                theme={theme}
              />
              <QuickAction
                icon="bar-chart-2"
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
                    onPress={() =>
                      router.push({ pathname: '/returns', params: { status: 'urgent' } })
                    }
                    theme={theme}
                    pulse
                  />
                ) : null}
                {todayCount > 0 ? (
                  <AttentionCard
                    icon="calendar"
                    color={theme.colors.accent}
                    text={t('dashboard.attentionToday', { count: todayCount })}
                    onPress={() =>
                      router.push({ pathname: '/returns', params: { createdToday: '1' } })
                    }
                    theme={theme}
                  />
                ) : null}
                {(pendingSyncCount ?? 0) > 0 ? (
                  <AttentionCard
                    icon="upload-cloud"
                    color={theme.colors.warning}
                    text={t('dashboard.attentionPendingSync', { count: pendingSyncCount })}
                    onPress={() => router.push('/returns')}
                    theme={theme}
                  />
                ) : null}
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
                    <PressableScale onPress={() => router.push(`/return/${item.id}`)}>
                      <Card>
                        <View style={styles.recentRow}>
                          <View style={styles.recentIconWrap}>
                            <Feather name="repeat" size={16} color={theme.colors.primary} />
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
                    </PressableScale>
                  </Animated.View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ReturnFormSheet visible={formVisible} onClose={() => setFormVisible(false)} />
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
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  const styles = createQuickActionStyles(theme);
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={styles.tileIconWrap}>
        <Feather name={icon} size={22} color={theme.colors.primary} />
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
      height: 108,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    tileIconWrap: {
      width: 44,
      height: 44,
      marginTop: -2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileLabel: {
      // Fixed to exactly two lines' worth of height, regardless of
      // whether this particular label actually wraps to one line or
      // two — otherwise a one-line label (e.g. "Сканер") sits shorter
      // than a two-line one (e.g. "Быстрая запись"), and since the
      // tile centers its content as a block, the icon above ends up at
      // a different height from tile to tile.
      height: 28,
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
  pulse,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  text: string;
  onPress: () => void;
  theme: Theme;
  pulse?: boolean;
}) {
  const styles = createAttentionStyles(theme);
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    if (!pulse) return;
    pulseValue.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false,
    );
  }, [pulse, pulseValue]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse ? pulseValue.value : 1 }],
  }));

  return (
    <PressableScale onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <Animated.View style={[styles.iconWrap, { backgroundColor: color + '1F' }, pulseStyle]}>
            <Feather name={icon} size={18} color={color} />
          </Animated.View>
          <Text style={styles.text}>{text}</Text>
          <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
        </View>
      </Card>
    </PressableScale>
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
      fontFamily: theme.fontFamily.display,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.md,
    },
    subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    emptyWrap: { alignItems: 'center', gap: theme.spacing.lg, paddingTop: theme.spacing['3xl'] },
    bentoRow: { flexDirection: 'row', gap: theme.spacing.sm },
    bentoHero: {
      flex: 1.4,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      justifyContent: 'space-between',
      minHeight: 120,
    },
    bentoHeroValue: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      fontFamily: theme.fontFamily.display,
      color: theme.colors.onPrimary,
    },
    bentoHeroLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.onPrimary, opacity: 0.85 },
    bentoSide: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      justifyContent: 'space-between',
      minHeight: 120,
    },
    bentoSideValue: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      fontFamily: theme.fontFamily.display,
      color: theme.colors.textPrimary,
    },
    bentoSideLabel: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
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
