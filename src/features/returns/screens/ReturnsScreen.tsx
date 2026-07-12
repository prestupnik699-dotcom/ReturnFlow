import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useReturns } from '@/features/returns/hooks/useReturns';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { ReturnFormSheet } from '@/features/returns/screens/ReturnFormSheet';
import { useMembershipStore } from '@/stores/membership.store';
import type {
  ReturnItem,
  ReturnStatus,
  ReturnPriority,
} from '@/features/returns/services/returns.service';

const STATUSES: ReturnStatus[] = ['pending', 'urgent', 'returned', 'archived'];
type SortMode = 'recent' | 'oldest';

export function ReturnsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const {
    data: allReturns,
    isLoading,
    isError,
  } = useReturns(statusFilter ? [statusFilter] : undefined);
  const { data: suppliers } = useSuppliers(false, 'name');
  const [formVisible, setFormVisible] = useState(false);
  const styles = createStyles(theme);

  const query = searchInput.trim().toLowerCase();
  const filtered = query
    ? allReturns?.filter(
        (r) =>
          r.title.toLowerCase().includes(query) || r.supplierName.toLowerCase().includes(query),
      )
    : allReturns;
  const sorted = filtered
    ? [...filtered].sort((a, b) => {
        if (a.pendingSync && !b.pendingSync) return -1;
        if (!a.pendingSync && b.pendingSync) return 1;
        return sortMode === 'recent'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
    : filtered;

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

  const handlePress = (item: ReturnItem) => {
    if (item.pendingSync) return;
    router.push(`/return/${item.id}`);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t('returns.title')}</Text>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('suppliers.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
          />
          <Pressable
            onPress={() => setSortMode((s) => (s === 'recent' ? 'oldest' : 'recent'))}
            hitSlop={8}
          >
            <Ionicons name="swap-vertical" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.filterRow}>
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
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarClearance }]}
            ListEmptyComponent={<EmptyState icon="repeat-outline" title={t('returns.empty')} />}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
                <Pressable onPress={() => handlePress(item)}>
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
                      {item.pendingSync ? (
                        <View style={styles.pendingBadge}>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={12}
                            color={theme.colors.warning}
                          />
                          <Text style={styles.pendingBadgeText}>{t('returns.pendingSync')}</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: statusColors[item.status] + '22' },
                          ]}
                        >
                          <Text
                            style={[styles.statusPillText, { color: statusColors[item.status] }]}
                          >
                            {statusLabels[item.status]}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </Pressable>
              </Animated.View>
            )}
          />
        )}

        <View style={[styles.footer, { paddingBottom: tabBarClearance }]}>
          {!suppliers || suppliers.length === 0 ? (
            <Text style={styles.warningText}>{t('returns.noSuppliers')}</Text>
          ) : (
            <Button
              label={t('returns.addButton')}
              icon="add"
              onPress={() => setFormVisible(true)}
            />
          )}
        </View>
      </View>

      <ReturnFormSheet visible={formVisible} onClose={() => setFormVisible(false)} />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
    title: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    emptyStateText: { color: theme.colors.textSecondary, textAlign: 'center' },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSizes.md,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    filterDot: { width: 6, height: 6, borderRadius: 3 },
    filterChipActive: { backgroundColor: theme.colors.primary },
    filterChipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.medium,
    },
    filterChipTextActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
    list: { gap: theme.spacing.sm },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    warningText: { color: theme.colors.warning, textAlign: 'center', fontSize: theme.fontSizes.sm },
    footer: { paddingTop: theme.spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    priorityBar: {
      width: 4,
      alignSelf: 'stretch',
      borderTopLeftRadius: theme.radius.lg,
      borderBottomLeftRadius: theme.radius.lg,
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
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      marginRight: theme.spacing.lg,
    },
    statusPillText: { fontSize: theme.fontSizes.xs, fontWeight: theme.fontWeights.semiBold },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.warning + '22',
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      marginRight: theme.spacing.lg,
    },
    pendingBadgeText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.warning,
    },
  });
}
