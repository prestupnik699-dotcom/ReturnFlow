import { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useReturns } from '@/features/returns/hooks/useReturns';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { ReturnFormSheet } from '@/features/returns/screens/ReturnFormSheet';
import { SupplierFilterSheet } from '@/features/returns/screens/SupplierFilterSheet';
import { BatchReturnSheet } from '@/features/returns/screens/BatchReturnSheet';
import { ReturnListRow } from '@/features/returns/components/ReturnListRow';
import { SkeletonList } from '@/components/Skeleton';
import {
  useBulkMarkReturned,
  useBulkArchive,
  useBulkDeleteReturns,
} from '@/features/returns/hooks/useBulkReturnActions';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import { useMembershipStore } from '@/stores/membership.store';
import type { ReturnItem, ReturnStatus } from '@/features/returns/services/returns.service';

const STATUSES: ReturnStatus[] = ['pending', 'urgent', 'returned', 'archived'];
type SortMode = 'recent' | 'oldest';

export function ReturnsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const canDelete = useHasRole(['Owner', 'Administrator', 'StoreManager']);
  const params = useLocalSearchParams<{
    status?: string;
    supplierId?: string;
    createdToday?: string;
  }>();
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | null>(
    (params.status as ReturnStatus) ?? null,
  );
  const [supplierFilter, setSupplierFilter] = useState<string | null>(params.supplierId ?? null);

  // Tab screens like this one typically stay mounted between visits, so
  // re-navigating here with new params (e.g. from a Dashboard attention
  // card) doesn't re-run the useState initializers above — without this,
  // the filter would silently keep whatever was set on a previous visit.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing from an incoming navigation param, not a derived render value
    if (params.status) setStatusFilter(params.status as ReturnStatus);
  }, [params.status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing from an incoming navigation param, not a derived render value
    if (params.supplierId) setSupplierFilter(params.supplierId);
  }, [params.supplierId]);

  const [supplierSheetVisible, setSupplierSheetVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const {
    data: allReturns,
    isLoading,
    isError,
  } = useReturns(statusFilter ? [statusFilter] : undefined);
  // Unfiltered fetch for the stat row so the totals always reflect the
  // whole store regardless of which status chip is currently selected.
  // Same query the default (no-filter) view already uses, so when no
  // chip is active this is served from the same cache entry — no extra
  // network round trip in the common case.
  const { data: statsReturns } = useReturns();
  const { data: suppliers } = useSuppliers(false, 'name');
  const [formVisible, setFormVisible] = useState(false);
  const [batchVisible, setBatchVisible] = useState(false);
  const bulkMarkReturnedMutation = useBulkMarkReturned();
  const bulkArchiveMutation = useBulkArchive();
  const bulkDeleteMutation = useBulkDeleteReturns();
  const styles = createStyles(theme);

  const selectionMode = selectedIds.length > 0;

  const query = searchInput.trim().toLowerCase();
  const isToday = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };
  const filtered = (allReturns ?? [])
    .filter((r) => !supplierFilter || r.supplierId === supplierFilter)
    .filter((r) => params.createdToday !== '1' || isToday(r.createdAt))
    .filter(
      (r) =>
        !query ||
        r.title.toLowerCase().includes(query) ||
        r.supplierName.toLowerCase().includes(query),
    );
  const sorted = [...filtered].sort((a, b) => {
    if (a.pendingSync && !b.pendingSync) return -1;
    if (!a.pendingSync && b.pendingSync) return 1;
    return sortMode === 'recent'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const totalCount = statsReturns?.length ?? 0;
  const pendingCount = statsReturns?.filter((r) => r.status === 'pending').length ?? 0;
  const urgentCount = statsReturns?.filter((r) => r.status === 'urgent').length ?? 0;

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

  const selectedSupplierName = supplierFilter
    ? suppliers?.find((s) => s.id === supplierFilter)?.name
    : null;

  const selectedItems = sorted.filter((r) => selectedIds.includes(r.id));
  const allSelectedAreReturned =
    selectedItems.length > 0 && selectedItems.every((r) => r.status === 'returned');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleLongPress = (item: ReturnItem) => {
    if (item.pendingSync) return;
    toggleSelect(item.id);
  };

  const handlePress = (item: ReturnItem) => {
    if (item.pendingSync) return;
    if (selectionMode) {
      toggleSelect(item.id);
      return;
    }
    router.push(`/return/${item.id}`);
  };

  const handleBulkAction = () => {
    const ids = [...selectedIds];
    if (allSelectedAreReturned) {
      bulkArchiveMutation.mutate(ids, { onSuccess: () => setSelectedIds([]) });
    } else {
      bulkMarkReturnedMutation.mutate(ids, { onSuccess: () => setSelectedIds([]) });
    }
  };

  const confirmBulkDelete = () => {
    const ids = [...selectedIds];
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedIds([]);
        setDeleteConfirmVisible(false);
      },
    });
  };

  const canAdd = !!suppliers && suppliers.length > 0;

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
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('returns.title')}</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => setBatchVisible(true)}
              hitSlop={8}
            >
              <Ionicons name="flash-outline" size={20} color={theme.colors.primary} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.push('/scanner')}
              hitSlop={8}
            >
              <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text
              style={styles.statNumber}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {totalCount}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {t('returns.statsTotal')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={styles.statNumber}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {pendingCount}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {t('returns.statsPending')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={styles.statNumber}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {urgentCount}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {t('returns.statsUrgent')}
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('suppliers.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchInput}
            onChangeText={setSearchInput}
          />
          <Pressable onPress={() => setSupplierSheetVisible(true)} hitSlop={8}>
            <Ionicons
              name="funnel-outline"
              size={18}
              color={supplierFilter ? theme.colors.primary : theme.colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => setSortMode((s) => (s === 'recent' ? 'oldest' : 'recent'))}
            hitSlop={8}
          >
            <Ionicons name="swap-vertical" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {selectedSupplierName ? (
          <Pressable style={styles.activeSupplierChipWrap} onPress={() => setSupplierFilter(null)}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryPressed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeSupplierChip}
            >
              <Text style={styles.activeSupplierChipText}>{selectedSupplierName}</Text>
              <Ionicons name="close-circle" size={16} color={theme.colors.onPrimary} />
            </LinearGradient>
          </Pressable>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <FilterChip
            label={t('returns.statusAll')}
            active={statusFilter === null}
            onPress={() => setStatusFilter(null)}
            theme={theme}
          />
          {STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={statusLabels[status]}
              dotColor={statusColors[status]}
              active={statusFilter === status}
              onPress={() => setStatusFilter(status)}
              theme={theme}
            />
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={{ paddingHorizontal: theme.spacing.xl, flex: 1 }}>
            <SkeletonList />
          </View>
        ) : isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: selectionMode ? tabBarClearance : tabBarClearance + 80 },
              sorted.length === 0 && styles.listEmptyGrow,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="repeat-outline"
                  title={t('returns.empty')}
                  message={t('returns.emptyMessage')}
                />
              </View>
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
                <ReturnListRow
                  item={item}
                  statusLabels={statusLabels}
                  statusColors={statusColors}
                  pendingLabel={t('returns.pendingSync')}
                  onPress={() => handlePress(item)}
                  onLongPress={() => handleLongPress(item)}
                  selectionMode={selectionMode}
                  selected={selectedIds.includes(item.id)}
                />
              </Animated.View>
            )}
          />
        )}

        {selectionMode ? (
          <View
            style={[styles.footer, styles.footerSelectionMode, { paddingBottom: tabBarClearance }]}
          >
            <View style={styles.bulkBar}>
              <View style={styles.bulkBarTop}>
                <Pressable style={styles.cancelButton} onPress={() => setSelectedIds([])}>
                  <Text style={styles.cancelText}>{t('returns.cancelSelection')}</Text>
                </Pressable>
                <Text style={styles.countText}>
                  {t('returns.selectedCount', { count: selectedIds.length })}
                </Text>
              </View>
              <View style={styles.bulkBarActions}>
                {canDelete ? (
                  <Pressable
                    style={styles.deleteIconButton}
                    onPress={() => setDeleteConfirmVisible(true)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </Pressable>
                ) : null}
                <Button
                  label={
                    allSelectedAreReturned
                      ? t('returns.bulkArchive')
                      : t('returns.bulkMarkReturned')
                  }
                  onPress={handleBulkAction}
                  loading={bulkMarkReturnedMutation.isPending || bulkArchiveMutation.isPending}
                  style={styles.flexButton}
                />
              </View>
            </View>
          </View>
        ) : !canAdd ? (
          <View style={[styles.footer, { paddingBottom: tabBarClearance }]}>
            <Text style={styles.warningText}>{t('returns.noSuppliers')}</Text>
          </View>
        ) : (
          <FAB
            onPress={() => setFormVisible(true)}
            style={[styles.fab, { bottom: tabBarClearance + theme.spacing.md }]}
          />
        )}
      </View>

      <ReturnFormSheet visible={formVisible} onClose={() => setFormVisible(false)} />
      <BatchReturnSheet visible={batchVisible} onClose={() => setBatchVisible(false)} />
      <SupplierFilterSheet
        visible={supplierSheetVisible}
        onClose={() => setSupplierSheetVisible(false)}
        selectedSupplierId={supplierFilter}
        onSelect={setSupplierFilter}
      />
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('returns.bulkDeleteConfirmTitle')}
        message={t('returns.bulkDeleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={bulkDeleteMutation.isPending}
        onConfirm={confirmBulkDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
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
  dotColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: Theme;
  dotColor?: string;
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
        {dotColor && !active ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
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
    dot: { width: 6, height: 6, borderRadius: 3 },
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: { color: theme.colors.textSecondary, textAlign: 'center' },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    statCard: {
      flex: 1,
      minHeight: 68,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xxs,
    },
    statNumber: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      width: '100%',
    },
    statLabel: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeights.medium,
    },
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
    activeSupplierChipWrap: { alignSelf: 'flex-start', marginBottom: theme.spacing.sm },
    activeSupplierChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xsPlus,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xsPlus,
    },
    activeSupplierChipText: {
      color: theme.colors.onPrimary,
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
    },
    filterScroll: { height: 44, flexGrow: 0, flexShrink: 0, marginBottom: theme.spacing.sm },
    filterRow: {
      alignItems: 'center',
    },
    list: { gap: theme.spacing.sm },
    flatList: { flex: 1 },
    listEmptyGrow: { flexGrow: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    warningText: { color: theme.colors.warning, textAlign: 'center', fontSize: theme.fontSizes.sm },
    footer: { paddingTop: theme.spacing.md },
    footerSelectionMode: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    fab: {
      position: 'absolute',
      right: 0,
    },
    bulkBar: { gap: theme.spacing.md },
    bulkBarTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
    countText: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
    },
    bulkBarActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    deleteIconButton: {
      width: 52,
      height: 52,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flexButton: { flex: 1 },
  });
}
