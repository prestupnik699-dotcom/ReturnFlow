import { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { useBrandedRefreshProps } from '@/components/BrandedRefreshControl';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRouter } from 'expo-router';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useBulkDeleteSuppliers } from '@/features/suppliers/hooks/useBulkSupplierActions';
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
import { useResponsiveTitleSize } from '@/hooks/useResponsiveTitleSize';

const EDIT_ROLES = ['Owner', 'StoreManager', 'Employee'] as const;
type FilterMode = 'all' | 'favorites' | 'attention';

export function SuppliersScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const tabBarClearance = useTabBarClearance();
  const router = useRouter();
  const canAdd = useHasRole([...EDIT_ROLES]);
  const [searchInput, setSearchInput] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SupplierSort>('name');
  const {
    data: allSuppliers,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useSuppliers(filterMode === 'favorites', sort);
  const refreshProps = useBrandedRefreshProps(isRefetching, refetch);
  const { data: returnCounts } = useSupplierReturnCounts();
  const { data: deliveryCounts } = useSupplierDeliveryCounts();
  const { data: reliability } = useSupplierReliability();
  const deleteMutation = useDeleteSupplier();
  const favoriteMutation = useToggleSupplierFavorite();
  const bulkDeleteMutation = useBulkDeleteSuppliers();
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmVisible, setBulkDeleteConfirmVisible] = useState(false);
  const titleFontSize = useResponsiveTitleSize();
  const styles = createStyles(theme, titleFontSize);

  const selectionMode = selectedIds.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const confirmBulkDelete = () => {
    const ids = [...selectedIds];
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedIds([]);
        setBulkDeleteConfirmVisible(false);
      },
    });
  };

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
            <Feather name="chevrons-down" size={18} color={theme.colors.primary} />
          </Pressable>
        </View>

        <LinearGradient
          colors={[theme.colors.card, theme.colors.surfaceVariant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryStat}>
            <Feather name="box" size={18} color={theme.colors.accent} />
            <Text style={styles.summaryValue}>{allSuppliers?.length ?? 0}</Text>
            <Text style={styles.summaryLabel}>{t('suppliers.summarySuppliers')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Feather name="repeat" size={18} color={theme.colors.accent} />
            <Text style={styles.summaryValue}>{totalReturns}</Text>
            <Text style={styles.summaryLabel}>{t('suppliers.summaryReturns')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.searchRow}>
          <Feather name="search" size={18} color={theme.colors.textSecondary} />
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
            refreshControl={<RefreshControl {...refreshProps} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="box"
                  title={t('suppliers.empty')}
                  message={t('suppliers.emptyMessage')}
                />
              </View>
            }
            renderItem={({ item, index }) => {
              const counts = returnCounts?.[item.id] ?? { total: 0, urgent: 0 };
              return (
                <AnimatedListItem index={index}>
                  <SupplierListRow
                    supplier={item}
                    returnsTotal={counts.total}
                    returnsUrgent={counts.urgent}
                    deliveriesTotal={deliveryCounts?.[item.id] ?? 0}
                    reliability={reliability?.[item.id]}
                    onEdit={() => handleEdit(item)}
                    onOpenCatalog={() => router.push(`/supplier/${item.id}`)}
                    onToggleFavorite={() =>
                      favoriteMutation.mutate({ supplierId: item.id, favorite: !item.favorite })
                    }
                    onRequestDelete={() => setPendingDelete(item)}
                    selectionMode={selectionMode}
                    selected={selectedIds.includes(item.id)}
                    onLongPress={() => toggleSelect(item.id)}
                    onPressWhileSelecting={() => toggleSelect(item.id)}
                  />
                </AnimatedListItem>
              );
            }}
          />
        )}

        {selectionMode ? (
          <View style={[styles.footerSelectionMode, { paddingBottom: tabBarClearance }]}>
            <View style={styles.bulkBar}>
              <Text style={styles.countText}>
                {t('suppliers.selectedCount', { count: selectedIds.length })}
              </Text>
              <View style={styles.bulkBarTop}>
                <Pressable style={styles.cancelButton} onPress={() => setSelectedIds([])}>
                  <Text style={styles.cancelText}>{t('suppliers.cancelSelection')}</Text>
                </Pressable>
                <Pressable
                  style={styles.selectAllButton}
                  onPress={() =>
                    setSelectedIds(
                      selectedIds.length === filtered.length ? [] : filtered.map((s) => s.id),
                    )
                  }
                >
                  <Text style={styles.selectAllText}>
                    {selectedIds.length === filtered.length
                      ? t('suppliers.deselectAll')
                      : t('suppliers.selectAll')}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.deleteIconButton}
                  onPress={() => setBulkDeleteConfirmVisible(true)}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={16} color={theme.colors.danger} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : canAdd ? (
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

      <ConfirmDialog
        visible={bulkDeleteConfirmVisible}
        title={t('suppliers.bulkDeleteConfirmTitle', { count: selectedIds.length })}
        message={t('suppliers.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={bulkDeleteMutation.isPending}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteConfirmVisible(false)}
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

function createStyles(theme: Theme, titleFontSize: number) {
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
      fontSize: titleFontSize,
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
    footerSelectionMode: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    bulkBar: { gap: theme.spacing.sm },
    bulkBarTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    cancelText: {
      color: theme.colors.textPrimary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
    },
    selectAllButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    selectAllText: {
      color: theme.colors.primary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
    },
    countText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      textAlign: 'center',
    },
    deleteIconButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
