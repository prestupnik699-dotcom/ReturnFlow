import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useReturns } from '@/features/returns/hooks/useReturns';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { CreateReturnSheet } from '@/features/returns/screens/CreateReturnSheet';
import { useMembershipStore } from '@/stores/membership.store';
import type { ReturnStatus, ReturnPriority } from '@/features/returns/services/returns.service';

const STATUSES: ReturnStatus[] = ['pending', 'urgent', 'returned', 'archived'];

export function ReturnsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | null>(null);
  const {
    data: returns,
    isLoading,
    isError,
  } = useReturns(statusFilter ? [statusFilter] : undefined);
  const { data: suppliers } = useSuppliers(false, 'name');
  const [formVisible, setFormVisible] = useState(false);
  const styles = createStyles(theme);

  const statusLabels: Record<ReturnStatus, string> = {
    pending: t('returns.statusPending'),
    urgent: t('returns.statusUrgent'),
    returned: t('returns.statusReturned'),
    archived: t('returns.statusArchived'),
  };

  const priorityColors: Record<ReturnPriority, string> = {
    low: theme.colors.textSecondary,
    normal: theme.colors.primary,
    high: theme.colors.warning,
    critical: theme.colors.danger,
  };

  const statusColors: Record<ReturnStatus, string> = {
    pending: theme.colors.textSecondary,
    urgent: theme.colors.danger,
    returned: theme.colors.success,
    archived: theme.colors.textSecondary,
  };

  if (!activeStoreId) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.emptyStateText}>{t('returns.noStore')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t('returns.title')}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setStatusFilter(null)}
            style={[styles.filterChip, statusFilter === null && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterChipText, statusFilter === null && styles.filterChipTextActive]}
            >
              {t('returns.statusAll')}
            </Text>
          </Pressable>
          {STATUSES.map((status) => (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            >
              <View style={[styles.filterDot, { backgroundColor: statusColors[status] }]} />
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {statusLabels[status]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={returns}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('returns.empty')}</Text>}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
                <Card>
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.priorityBar,
                        { backgroundColor: priorityColors[item.priority] },
                      ]}
                    />
                    <View style={styles.info}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="cube-outline"
                          size={12}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.meta}>{item.supplierName}</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.meta}>×{item.quantity}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusColors[item.status] + '22' },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: statusColors[item.status] }]}>
                        {statusLabels[item.status]}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            )}
          />
        )}

        {!suppliers || suppliers.length === 0 ? (
          <Text style={styles.warningText}>{t('returns.noSuppliers')}</Text>
        ) : (
          <Button
            label={t('returns.addButton')}
            icon="add"
            onPress={() => setFormVisible(true)}
            style={{ marginBottom: insets.bottom + theme.spacing.lg }}
          />
        )}
      </View>

      <CreateReturnSheet visible={formVisible} onClose={() => setFormVisible(false)} />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.sm },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    emptyStateText: { color: theme.colors.textSecondary, textAlign: 'center' },
    filterRow: { gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    filterDot: { width: 6, height: 6, borderRadius: 3 },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { color: theme.colors.textPrimary, fontSize: theme.fontSizes.sm },
    filterChipTextActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
    empty: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    warningText: { color: theme.colors.warning, textAlign: 'center', fontSize: theme.fontSizes.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    priorityBar: {
      width: 4,
      alignSelf: 'stretch',
      borderTopLeftRadius: 16,
      borderBottomLeftRadius: 16,
    },
    info: { flex: 1, gap: 3, paddingVertical: theme.spacing.lg },
    itemTitle: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    meta: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    metaDot: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    statusPill: {
      borderRadius: 8,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      marginRight: theme.spacing.lg,
    },
    statusPillText: { fontSize: theme.fontSizes.xs, fontWeight: theme.fontWeights.semiBold },
  });
}
