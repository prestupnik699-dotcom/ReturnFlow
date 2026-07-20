import { useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import {
  useDeleteSupplier,
  useToggleSupplierFavorite,
} from '@/features/suppliers/hooks/useSupplierMutations';
import { useSupplierReturnCounts } from '@/features/suppliers/hooks/useSupplierReturnCounts';
import { useSupplierDeliveryCounts } from '@/features/suppliers/hooks/useSupplierDeliveryCounts';
import { useSupplierReliability } from '@/features/suppliers/hooks/useSupplierReliability';
import { SupplierFormSheet } from '@/features/suppliers/screens/SupplierFormSheet';
import { SupplierListRow } from '@/features/suppliers/components/SupplierListRow';
import type { Supplier, SupplierSort } from '@/features/suppliers/services/suppliers.service';
import { SkeletonList } from '@/components/Skeleton';

const EDIT_ROLES = ['Owner', 'Administrator', 'StoreManager', 'Receiver'] as const;
type FilterMode = 'all' | 'favorites' | 'attention';

export function SuppliersScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const tabBarClearance = useTabBarClearance();
  const canAdd = useHasRole([...EDIT_ROLES]);
  const [searchInput, setSearchInput] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SupplierSort>('name');
  const { data: allSuppliers, isLoading, isError } = useSuppliers(filterMode === 'favorites', sort);
  const { data: returnCounts } = useSupplierReturnCounts();
  const { data: deliveryCounts } = useSupplierDeliveryCounts();
  const { data: reliability } = useSupplierReliability();
  const deleteMutation = useDeleteSupplier();
  const favoriteMutation = useToggleSupplierFavorite();
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);
  const styles = createStyles(theme);

  const query = searchInput.trim().toLowerCase();
  const filtered = (allSuppliers ?? [])
    .filter((s) => !query || s.name.toLowerCase().includes(query))
    .filter((s) => filterMode !== 'attention' || (returnCounts?.[s.id]?.urgent ?? 0) > 0);

  const totalReturns = Object.values(returnCounts ?? {}).reduce((sum, c) => sum + c.total, 0);

  const handleAdd = () => {
    setEditingId(null);
    setFormVisible(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormVisible(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={[styles.container, { padding: theme.spacing.xl }]}>
          <SkeletonList />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('suppliers.title')}</Text>
          <Pressable
            style={styles.sortButton}
            onPress={() => setSort((s) => (s === 'name' ? 'recent' : 'name'))}
            hitSlop={8}
          >
            <Ionicons name="swap-vertical" size={18} color={theme.colors.primary} />
          </Pressable>
        </View>

        <LinearGradient
          colors={[theme.colors.card, theme.colors.surfaceVariant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryStat}>
            <Ionicons name="cube-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.summaryValue}>{allSuppliers?.length ?? 0}</Text>
            <Text style={styles.summaryLabel}>{t('suppliers.summarySuppliers')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Ionicons name="repeat-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.summaryValue}>{totalReturns}</Text>
            <Text style={styles.summaryLabel}>{t('suppliers.summaryReturns')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('suppliers.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <FilterChip
            label={t('suppliers.filterAll')}
            active={filterMode === 'all'}
            onPress={() => setFilterMode('all')}
            theme={theme}
          />
          <FilterChip
            label={t('suppliers.favoritesOnly')}
            active={filterMode === 'favorites'}
            onPress={() => setFilterMode('favorites')}
            theme={theme}
          />
          <FilterChip
            label={t('suppliers.filterAttention')}
            active={filterMode === 'attention'}
            onPress={() => setFilterMode('attention')}
            theme={theme}
          />
        </ScrollView>

        {isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: tabBarClearance + 80 },
              filtered.length === 0 && styles.listEmptyGrow,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="cube-outline"
                  title={t('suppliers.empty')}
                  message={t('suppliers.emptyMessage')}
                />
              </View>
            }
            renderItem={({ item, index }) => {
              const counts = returnCounts?.[item.id] ?? { total: 0, urgent: 0 };
              return (
                <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
                  <SupplierListRow
                    supplier={item}
                    returnsTotal={counts.total}
                    returnsUrgent={counts.urgent}
                    deliveriesTotal={deliveryCounts?.[item.id] ?? 0}
                    reliability={reliability?.[item.id]}
                    onEdit={() => handleEdit(item)}
                    onToggleFavorite={() =>
                      favoriteMutation.mutate({ supplierId: item.id, favorite: !item.favorite })
                    }
                    onRequestDelete={() => setPendingDelete(item)}
                  />
                </Animated.View>
              );
            }}
          />
        )}

        {canAdd ? (
          <FAB
            onPress={handleAdd}
            style={[styles.fab, { bottom: tabBarClearance + theme.spacing.md }]}
          />
        ) : null}
      </View>

      <SupplierFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        supplierId={editingId}
      />

      <ConfirmDialog
        visible={!!pendingDelete}
        title={t('suppliers.deleteConfirmTitle')}
        message={t('suppliers.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

type Theme = ReturnType<typeof useTheme>;

function FilterChip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  const styles = createChipStyles(theme);

  return (
    <Pressable onPress={onPress} style={styles.chipWrap}>
      <View style={[styles.chip, !active && styles.chipInactive]}>
        {active ? (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
      </View>
    </Pressable>
  );
}

function createChipStyles(theme: Theme) {
  return StyleSheet.create({
    chipWrap: { marginRight: theme.spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xsPlus,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.smPlus,
      overflow: 'hidden',
    },
    chipInactive: { backgroundColor: theme.colors.card },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
    },
    chipTextActive: {
      color: theme.colors.onPrimary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
    },
  });
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    sortButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    summaryStat: { flex: 1, alignItems: 'center', gap: 4 },
    summaryDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
    summaryValue: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    summaryLabel: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
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
    filterScroll: { height: 44, flexGrow: 0, flexShrink: 0, marginBottom: theme.spacing.sm },
    filterRow: { alignItems: 'center' },
    list: { gap: theme.spacing.sm },
    flatList: { flex: 1 },
    listEmptyGrow: { flexGrow: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    fab: { position: 'absolute', right: 0 },
  });
}
