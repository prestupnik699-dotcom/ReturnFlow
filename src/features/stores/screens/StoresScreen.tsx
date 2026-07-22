import { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { Text } from '@/components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import { useStores } from '@/features/stores/hooks/useStores';
import { useDeleteStore } from '@/features/stores/hooks/useDeleteStore';
import { useStoreReturnCounts } from '@/features/stores/hooks/useStoreReturnCounts';
import { useStoreDeliveryCounts } from '@/features/stores/hooks/useStoreDeliveryCounts';
import { StoreFormSheet } from '@/features/stores/screens/StoreFormSheet';
import { StoreListRow } from '@/features/stores/components/StoreListRow';
import { useMembershipStore } from '@/stores/membership.store';
import type { Store } from '@/features/stores/services/stores.service';
import { SkeletonList } from '@/components/Skeleton';

type FilterMode = 'all' | 'attention';

function storeSubtitle(store: Store, fallback: string): string {
  const parts = [store.city, store.address].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : fallback;
}

export function StoresScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ new?: string }>();
  const autoOpenedRef = useRef(false);
  const tabBarClearance = useTabBarClearance();
  const canAdd = useHasRole(['Owner']);
  const { data: stores, isLoading, isError } = useStores();
  const { data: returnCounts } = useStoreReturnCounts();
  const { data: deliveryCounts } = useStoreDeliveryCounts();
  const deleteMutation = useDeleteStore();
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const setActiveContext = useMembershipStore((state) => state.setActiveContext);
  const [searchInput, setSearchInput] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [formVisible, setFormVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Store | null>(null);
  const styles = createStyles(theme);

  const query = searchInput.trim().toLowerCase();
  const filtered = (stores ?? [])
    .filter(
      (s) =>
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.city ?? '').toLowerCase().includes(query) ||
        (s.address ?? '').toLowerCase().includes(query),
    )
    .filter((s) => filterMode === 'all' || (returnCounts?.[s.id]?.urgent ?? 0) > 0);

  const totalReturns = Object.values(returnCounts ?? {}).reduce((sum, c) => sum + c.total, 0);

  const handleAdd = () => {
    setEditingStore(null);
    setFormVisible(true);
  };

  // Coming straight from creating a new organization (?new=1) — open the
  // add-store form immediately instead of making a first-time user find
  // and tap the button themselves.
  useEffect(() => {
    if (params.new === '1' && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      handleAdd();
    }
  }, [params.new]);

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormVisible(true);
  };

  const handleSelectCurrent = (store: Store) => {
    setActiveContext(activeOrganizationId, store.id);
  };

  const handleOpenChat = (store: Store) => {
    setActiveContext(activeOrganizationId, store.id);
    router.push('/chat');
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
          <Text style={styles.title}>{t('stores.title')}</Text>
        </View>

        <LinearGradient
          colors={[theme.colors.card, theme.colors.surfaceVariant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryStat}>
            <Ionicons name="storefront-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.summaryValue}>{stores?.length ?? 0}</Text>
            <Text style={styles.summaryLabel}>{t('stores.summaryStores')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Ionicons name="repeat-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.summaryValue}>{totalReturns}</Text>
            <Text style={styles.summaryLabel}>{t('stores.summaryReturns')}</Text>
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
            label={t('stores.filterAll')}
            active={filterMode === 'all'}
            onPress={() => setFilterMode('all')}
            theme={theme}
          />
          <FilterChip
            label={t('stores.filterAttention')}
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
                  icon="shopping-bag"
                  title={t('stores.empty')}
                  message={t('stores.emptyMessage')}
                />
              </View>
            }
            renderItem={({ item, index }) => {
              const counts = returnCounts?.[item.id] ?? { total: 0, urgent: 0 };
              return (
                <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
                  <StoreListRow
                    store={item}
                    isCurrent={activeStoreId === item.id}
                    returnsTotal={counts.total}
                    returnsUrgent={counts.urgent}
                    deliveriesTotal={deliveryCounts?.[item.id] ?? 0}
                    subtitle={storeSubtitle(item, t('stores.noAddress'))}
                    onSelectCurrent={() => handleSelectCurrent(item)}
                    onEdit={() => handleEdit(item)}
                    onOpenChat={() => handleOpenChat(item)}
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

      <StoreFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        store={editingStore}
      />

      <ConfirmDialog
        visible={!!pendingDelete}
        title={t('stores.deleteConfirmTitle')}
        message={t('stores.deleteConfirmMessage')}
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
