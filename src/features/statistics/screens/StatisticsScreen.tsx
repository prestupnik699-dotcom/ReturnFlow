import { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { StatBar } from '@/components/StatBar';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { useReturnStats, type StatsPeriod } from '@/features/statistics/hooks/useReturnStats';
import { useExportReturns } from '@/features/statistics/hooks/useExportReturns';
import { useWeeklyActivity } from '@/features/statistics/hooks/useWeeklyActivity';
import { useLanguageStore } from '@/stores/language.store';
import { useMembershipStore } from '@/stores/membership.store';
import type { ReturnStatus, ReturnPriority } from '@/features/returns/services/returns.service';

const PERIODS: StatsPeriod[] = ['today', 'week', 'month', 'all'];
const STATUSES: ReturnStatus[] = ['pending', 'urgent', 'returned', 'archived'];
const LOCALE_MAP: Record<string, string> = { ka: 'ka-GE', en: 'en-US', ru: 'ru-RU' };

function periodToSinceIso(period: StatsPeriod): string | null {
  const now = new Date();
  if (period === 'today')
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }
  return null;
}

export function StatisticsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguageStore((state) => state.language);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const { data: stats, isLoading } = useReturnStats(period);
  const { data: weeklyActivity } = useWeeklyActivity();
  const styles = createStyles(theme);

  const statusLabels: Record<ReturnStatus, string> = {
    pending: t('returns.statusPending'),
    urgent: t('returns.statusUrgent'),
    returned: t('returns.statusReturned'),
    archived: t('returns.statusArchived'),
  };

  const priorityLabels: Record<ReturnPriority, string> = {
    low: t('returns.priorityLow'),
    normal: t('returns.priorityNormal'),
    high: t('returns.priorityHigh'),
    critical: t('returns.priorityCritical'),
  };

  const {
    runExport,
    isExporting,
    error: exportError,
  } = useExportReturns(activeStoreId, periodToSinceIso(period), {
    columns: {
      title: t('returns.create.titleLabel'),
      supplier: t('returns.create.supplierLabel'),
      quantity: t('returns.create.quantityLabel'),
      unitPrice: t('returns.create.priceLabel'),
      total: t('statistics.export.totalColumn'),
      status: t('statistics.byStatus'),
      priority: t('returns.create.priorityLabel'),
      barcode: t('returns.create.barcodeLabel'),
      exchange: t('returns.create.exchangeLabel'),
      reason: t('returns.create.reasonLabel'),
      date: t('statistics.export.dateColumn'),
    },
    statusLabels,
    priorityLabels,
    yes: t('statistics.export.yes'),
    no: t('statistics.export.no'),
    reportTitle: t('statistics.export.reportTitle'),
    grandTotalLabel: t('statistics.export.grandTotalLabel'),
  });

  const periodLabels: Record<StatsPeriod, string> = {
    today: t('statistics.periodToday'),
    week: t('statistics.periodWeek'),
    month: t('statistics.periodMonth'),
    all: t('statistics.periodAll'),
  };

  const statusColors: Record<ReturnStatus, string> = {
    pending: theme.colors.textSecondary,
    urgent: theme.colors.danger,
    returned: theme.colors.success,
    archived: theme.colors.textSecondary,
  };

  const maxStatusValue = stats ? Math.max(...STATUSES.map((s) => stats.byStatus[s]), 1) : 1;
  const maxSupplierValue =
    stats && stats.bySupplier.length > 0 ? Math.max(...stats.bySupplier.map((s) => s.count)) : 1;
  const maxActivity = Math.max(...(weeklyActivity ?? []).map((p) => p.count), 1);

  const dayLabel = (isoDate: string) => {
    const d = new Date(`${isoDate}T00:00:00`);
    const locale = LOCALE_MAP[language] ?? 'en-US';
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('statistics.title')} />

        <View style={styles.chipRow}>
          {PERIODS.map((p) => (
            <Chip
              key={p}
              label={periodLabels[p]}
              selected={period === p}
              onPress={() => setPeriod(p)}
            />
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : !stats || stats.totalCount === 0 ? (
          <EmptyState
            icon="bar-chart-2"
            title={t('statistics.noData')}
            message={t('statistics.noDataMessage')}
          />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Card>
                <View style={styles.summaryCard}>
                  <AnimatedNumber value={stats.totalCount} style={styles.summaryValue} />
                  <Text style={styles.summaryLabel}>{t('statistics.totalReturns')}</Text>
                </View>
              </Card>
              <Card>
                <View style={styles.summaryCard}>
                  <AnimatedNumber value={stats.totalQuantity} style={styles.summaryValue} />
                  <Text style={styles.summaryLabel}>{t('statistics.totalQuantity')}</Text>
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('statistics.byStatus')}</Text>
              <Card>
                <View style={styles.statList}>
                  {STATUSES.map((status) => (
                    <StatBar
                      key={status}
                      label={statusLabels[status]}
                      value={stats.byStatus[status]}
                      maxValue={maxStatusValue}
                      color={statusColors[status]}
                      onPress={
                        stats.byStatus[status] > 0
                          ? () => router.push({ pathname: '/returns', params: { status } })
                          : undefined
                      }
                    />
                  ))}
                </View>
              </Card>
            </View>

            {stats.bySupplier.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('statistics.topSuppliers')}</Text>
                <Card>
                  <View style={styles.statList}>
                    {stats.bySupplier.map((s) => (
                      <StatBar
                        key={s.supplierId}
                        label={s.supplierName}
                        value={s.count}
                        maxValue={maxSupplierValue}
                        onPress={() =>
                          router.push({
                            pathname: '/returns',
                            params: { supplierId: s.supplierId },
                          })
                        }
                      />
                    ))}
                  </View>
                </Card>
              </View>
            ) : null}

            {weeklyActivity ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('dashboard.activityTitle')}</Text>
                <Card>
                  <View style={styles.chartCard}>
                    <View style={styles.chartBars}>
                      {weeklyActivity.map((point, index) => (
                        <View key={point.date} style={styles.chartBarColumn}>
                          <View style={styles.chartBarTrack}>
                            <AnimatedChartBarFill
                              heightPercent={Math.max(
                                (point.count / maxActivity) * 100,
                                point.count > 0 ? 6 : 2,
                              )}
                              color={theme.colors.primary}
                              delay={index * 50}
                              style={styles.chartBarFill}
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
              <Text style={styles.sectionTitle}>{t('statistics.export.title')}</Text>
              <View style={styles.exportRow}>
                <Pressable
                  style={styles.exportButton}
                  onPress={() => runExport('csv')}
                  disabled={isExporting !== null}
                >
                  {isExporting === 'csv' ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Feather name="grid" size={18} color={theme.colors.primary} />
                  )}
                  <Text style={styles.exportButtonText}>{t('statistics.export.csv')}</Text>
                </Pressable>
                <Pressable
                  style={styles.exportButton}
                  onPress={() => runExport('pdf')}
                  disabled={isExporting !== null}
                >
                  {isExporting === 'pdf' ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Feather name="file-text" size={18} color={theme.colors.primary} />
                  )}
                  <Text style={styles.exportButtonText}>{t('statistics.export.pdf')}</Text>
                </Pressable>
              </View>
              {exportError === 'EMPTY' ? (
                <Text style={styles.exportErrorText}>{t('statistics.export.empty')}</Text>
              ) : exportError === 'PERMISSION_DENIED' ? (
                <Text style={styles.exportErrorText}>
                  {t('statistics.export.permissionDenied')}
                </Text>
              ) : exportError ? (
                <Text style={styles.exportErrorText}>{exportError}</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function AnimatedChartBarFill({
  heightPercent,
  color,
  delay,
  style,
}: {
  heightPercent: number;
  color: string;
  delay: number;
  style: StyleProp<ViewStyle>;
}) {
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withDelay(delay, withTiming(heightPercent, { duration: 600 }));
  }, [heightPercent, delay, animatedHeight]);

  const animatedStyle = useAnimatedStyle(() => ({ height: `${animatedHeight.value}%` }));

  return <Animated.View style={[style, { backgroundColor: color }, animatedStyle]} />;
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { gap: theme.spacing.xl, paddingBottom: theme.spacing['2xl'] },
    center: { paddingVertical: theme.spacing['2xl'], alignItems: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    summaryRow: { flexDirection: 'row', gap: theme.spacing.md },
    summaryCard: { padding: theme.spacing.lg, alignItems: 'center', flex: 1, gap: 4 },
    summaryValue: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      fontFamily: theme.fontFamily.display,
      color: theme.colors.textPrimary,
    },
    summaryLabel: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    section: { gap: theme.spacing.md },
    sectionTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
    },
    statList: { padding: theme.spacing.lg, gap: theme.spacing.md },
    chartCard: { padding: theme.spacing.lg },
    chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, height: 100 },
    chartBarColumn: { flex: 1, alignItems: 'center', gap: theme.spacing.xsPlus, height: '100%' },
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
    exportRow: { flexDirection: 'row', gap: theme.spacing.md },
    exportButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
    },
    exportButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
    },
    exportErrorText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.danger,
      textAlign: 'center',
    },
  });
}
