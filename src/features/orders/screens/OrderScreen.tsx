import { useState } from 'react';
import { View, ScrollView, Pressable, FlatList, StyleSheet, Share } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useSupplierCatalog } from '@/features/suppliers/hooks/useSupplierCatalog';
import { usePlaceCatalogOrder } from '@/features/suppliers/hooks/useCatalogMutations';
import { useOrderDraftStore } from '@/stores/orderDraft.store';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import type { Supplier } from '@/features/suppliers/services/suppliers.service';

// The order draft lives in a global store (useOrderDraftStore), not
// screen-local state — switching between suppliers here, or leaving this
// screen entirely and coming back, must not lose quantities already
// chosen for a supplier that isn't currently active.
export function OrderScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: suppliers } = useSuppliers(false, 'name');
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
  const drafts = useOrderDraftStore((state) => state.drafts);
  const setQuantity = useOrderDraftStore((state) => state.setQuantity);
  const styles = createStyles(theme);

  const activeSupplier = suppliers?.find((s) => s.id === activeSupplierId) ?? null;
  const pendingSupplierIds = Object.entries(drafts)
    .filter(([, items]) => Object.values(items).some((qty) => qty > 0))
    .map(([supplierId]) => supplierId);

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('orders.title')} />

        {!suppliers || suppliers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="shopping-bag"
              title={t('orders.noSuppliers')}
              message={t('orders.noSuppliersMessage')}
            />
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.supplierRow}
            >
              {suppliers.map((supplier) => (
                <SupplierChip
                  key={supplier.id}
                  supplier={supplier}
                  active={supplier.id === activeSupplierId}
                  hasDraft={pendingSupplierIds.includes(supplier.id)}
                  onPress={() => {
                    hapticSelection();
                    setActiveSupplierId(supplier.id);
                  }}
                  theme={theme}
                />
              ))}
            </ScrollView>

            {activeSupplier ? (
              <SupplierCatalogPicker
                supplierId={activeSupplier.id}
                quantities={drafts[activeSupplier.id] ?? {}}
                onSetQuantity={(itemId, qty) => setQuantity(activeSupplier.id, itemId, qty)}
                theme={theme}
                t={t}
              />
            ) : (
              <View style={styles.hintWrap}>
                <Text style={styles.hintText}>{t('orders.pickSupplierHint')}</Text>
              </View>
            )}

            {pendingSupplierIds.length > 0 ? (
              <View style={styles.pendingSection}>
                <Text style={styles.pendingTitle}>{t('orders.readyToSend')}</Text>
                <FlatList
                  data={suppliers.filter((s) => pendingSupplierIds.includes(s.id))}
                  keyExtractor={(s) => s.id}
                  contentContainerStyle={styles.pendingList}
                  renderItem={({ item: supplier }) => (
                    <PendingOrderRow supplierId={supplier.id} supplierName={supplier.name} />
                  )}
                />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function SupplierChip({
  supplier,
  active,
  hasDraft,
  onPress,
  theme,
}: {
  supplier: Supplier;
  active: boolean;
  hasDraft: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const styles = createChipStyles(theme);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {supplier.name}
      </Text>
      {hasDraft ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

function createChipStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.smPlus,
      marginRight: theme.spacing.sm,
    },
    chipActive: { backgroundColor: theme.colors.primary },
    chipText: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    chipTextActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.warning },
  });
}

function SupplierCatalogPicker({
  supplierId,
  quantities,
  onSetQuantity,
  theme,
  t,
}: {
  supplierId: string;
  quantities: Record<string, number>;
  onSetQuantity: (itemId: string, quantity: number) => void;
  theme: ReturnType<typeof useTheme>;
  t: (key: string) => string;
}) {
  const { data: catalog, isLoading } = useSupplierCatalog(supplierId);
  const styles = createPickerStyles(theme);

  if (isLoading) return null;

  if (!catalog || catalog.length === 0) {
    return (
      <View style={styles.emptyCatalog}>
        <Text style={styles.emptyCatalogText}>{t('orders.supplierCatalogEmpty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={catalog}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const quantity = quantities[item.id] ?? 0;
        return (
          <Card>
            <View style={styles.row}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => {
                    hapticSelection();
                    onSetQuantity(item.id, Math.max(0, quantity - 1));
                  }}
                  hitSlop={8}
                >
                  <Feather name="minus" size={16} color={theme.colors.primary} />
                </Pressable>
                <Text style={styles.stepperValue}>{quantity}</Text>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => {
                    hapticSelection();
                    onSetQuantity(item.id, quantity + 1);
                  }}
                  hitSlop={8}
                >
                  <Feather name="plus" size={16} color={theme.colors.primary} />
                </Pressable>
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}

function createPickerStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    list: { gap: theme.spacing.sm, paddingVertical: theme.spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    itemName: {
      flex: 1,
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    stepperButton: { padding: 4 },
    stepperValue: {
      minWidth: 24,
      textAlign: 'center',
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    emptyCatalog: { padding: theme.spacing.xl, alignItems: 'center' },
    emptyCatalogText: { color: theme.colors.textSecondary, textAlign: 'center' },
  });
}

function PendingOrderRow({
  supplierId,
  supplierName,
}: {
  supplierId: string;
  supplierName: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: catalog } = useSupplierCatalog(supplierId);
  const draft = useOrderDraftStore((state) => state.drafts[supplierId] ?? {});
  const clearSupplier = useOrderDraftStore((state) => state.clearSupplier);
  const placeOrderMutation = usePlaceCatalogOrder(supplierId);
  const styles = createPendingStyles(theme);

  const lines = Object.entries(draft)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => {
      const item = catalog?.find((c) => c.id === itemId);
      return { catalogItemId: itemId, title: item?.name ?? '', quantity };
    });

  const handleSend = () => {
    const shareText = lines
      .map((line, index) => `${index + 1}. ${line.title} — ${line.quantity} pcs`)
      .join('\n');

    placeOrderMutation.mutate(lines, {
      onSuccess: async () => {
        hapticSuccess();
        clearSupplier(supplierId);
        try {
          await Share.share({ message: shareText });
        } catch {
          // The order is already saved by this point — a dismissed or
          // failed share sheet doesn't need to roll anything back.
        }
      },
    });
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.supplierName} numberOfLines={1}>
            {supplierName}
          </Text>
          <Text style={styles.itemCount}>{t('orders.itemCount', { count: lines.length })}</Text>
        </View>
        <Button
          label={t('orders.send')}
          icon="share-2"
          onPress={handleSend}
          loading={placeOrderMutation.isPending}
        />
      </View>
    </Card>
  );
}

function createPendingStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    info: { flex: 1, gap: 2 },
    supplierName: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    itemCount: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
  });
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    supplierRow: { paddingBottom: theme.spacing.md },
    hintWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hintText: { color: theme.colors.textSecondary, textAlign: 'center' },
    pendingSection: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
    pendingTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
    },
    pendingList: { gap: theme.spacing.sm },
  });
}
