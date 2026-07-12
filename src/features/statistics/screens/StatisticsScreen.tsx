import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { StatBar } from '@/components/StatBar';
import { EmptyState } from '@/components/EmptyState';
import { useReturnStats, type StatsPeriod } from '@/features/statistics/hooks/useReturnStats';
import type { ReturnStatus } from '@/features/returns/services/returns.service';

const PERIODS: StatsPeriod[] = ['today', 'week', 'month', 'all'];
const STATUSES: ReturnStatus[] = ['pending', 'urgent', 'returned', 'archived'];

export function StatisticsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const { data: stats, isLoading } = useReturnStats(period);
  const styles = createStyles(theme);

  const periodLabels: Record<StatsPeriod, string> = {
    today: t('statistics.periodToday'),
    week: t('statistics.periodWeek'),
    month: t('statistics.periodMonth'),
    all: t('statistics.periodAll'),
  };

  const statusLabels: Record<ReturnStatus, string> = {
    pending: t('returns.statusPending'),
    urgent: t('returns.statusUrgent'),
    returned: t('returns.statusReturned'),
    archived: t('returns.statusArchived'),
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
          <EmptyState icon="bar-chart-outline" title={t('statistics.noData')} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Card>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{stats.totalCount}</Text>
                  <Text style={styles.summaryLabel}>{t('statistics.totalReturns')}</Text>
                </View>
              </Card>
              <Card>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{stats.totalQuantity}</Text>
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
                      />
                    ))}
                  </View>
                </Card>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
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
  });
}
