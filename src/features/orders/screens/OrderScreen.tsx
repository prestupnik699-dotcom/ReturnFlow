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
import { Chip } from '@/components/Chip';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useSupplierCatalog } from '@/features/suppliers/hooks/useSupplierCatalog';
import { usePlaceCatalogOrder } from '@/features/suppliers/hooks/useCatalogMutations';
import { useOrderDraftStore } from '@/stores/orderDraft.store';
import { hapticSelection, hapticSuccess, hapticImpactLight } from '@/lib/haptics';

// The order draft lives in a global, persisted store (useOrderDraftStore),
// not screen-local state — switching between suppliers here, leaving this
// screen, or closing the app entirely and coming back later must not
// lose quantities already chosen for a supplier.
export function OrderScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: suppliers } = useSuppliers(false, 'name');
  const tabBarClearance = useTabBarClearance();
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
  const [reviewSupplierId, setReviewSupplierId] = useState<string | null>(null);
  const drafts = useOrderDraftStore((state) => state.drafts);
  const setQuantity = useOrderDraftStore((state) => state.setQuantity);
  const styles = createStyles(theme);

  const activeSupplier = suppliers?.find((s) => s.id === activeSupplierId) ?? null;
  const reviewSupplier = suppliers?.find((s) => s.id === reviewSupplierId) ?? null;
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
              style={styles.supplierScroll}
            >
              {suppliers.map((supplier) => (
                <View key={supplier.id} style={styles.chipWrap}>
                  <Chip
                    label={supplier.name}
                    selected={supplier.id === activeSupplierId}
                    onPress={() => {
                      hapticSelection();
                      setActiveSupplierId(supplier.id);
                    }}
                  />
                  {pendingSupplierIds.includes(supplier.id) ? (
                    <View style={styles.chipDot} />
                  ) : null}
                </View>
              ))}
            </ScrollView>

            <View style={styles.catalogArea}>
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
            </View>

            {pendingSupplierIds.length > 0 ? (
              <View style={[styles.pendingBar, { marginBottom: tabBarClearance }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pendingScrollContent}
                >
                  {suppliers
                    .filter((s) => pendingSupplierIds.includes(s.id))
                    .map((supplier) => (
                      <PendingPill
                        key={supplier.id}
                        supplierId={supplier.id}
                        supplierName={supplier.name}
                        onPress={() => {
                          hapticImpactLight();
                          setReviewSupplierId(supplier.id);
                        }}
                      />
                    ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
      </View>

      <OrderReviewSheet
        visible={!!reviewSupplier}
        onClose={() => setReviewSupplierId(null)}
        supplierId={reviewSupplier?.id ?? null}
        supplierName={reviewSupplier?.name ?? ''}
      />
    </Screen>
  );
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
      style={styles.flatList}
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
    flatList: { flex: 1 },
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

function PendingPill({
  supplierId,
  supplierName,
  onPress,
}: {
  supplierId: string;
  supplierName: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const draft = useOrderDraftStore((state) => state.drafts[supplierId] ?? {});
  const itemCount = Object.values(draft).filter((qty) => qty > 0).length;
  const styles = createPendingStyles(theme);

  return (
    <Pressable style={styles.pill} onPress={onPress}>
      <View style={styles.pillInfo}>
        <Text style={styles.pillName} numberOfLines={1}>
          {supplierName}
        </Text>
        <Text style={styles.pillCount}>{itemCount}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={theme.colors.onPrimary} />
    </Pressable>
  );
}

function createPendingStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.sm,
      paddingVertical: theme.spacing.smPlus,
      marginRight: theme.spacing.sm,
    },
    pillInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pillName: {
      maxWidth: 110,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.onPrimary,
    },
    pillCount: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.onPrimary,
      opacity: 0.85,
    },
  });
}

// Tapping a pending pill opens this review sheet instead of sending
// immediately — a stray tap on the pill list used to fire off a share
// sheet with no chance to double-check quantities or drop an item first.
// This gives that chance: steppers to adjust, a remove button per line,
// and the actual send action lives at the bottom, requiring a deliberate
// second tap.
function OrderReviewSheet({
  visible,
  onClose,
  supplierId,
  supplierName,
}: {
  visible: boolean;
  onClose: () => void;
  supplierId: string | null;
  supplierName: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: catalog } = useSupplierCatalog(supplierId ?? '');
  const draft = useOrderDraftStore((state) => (supplierId ? state.drafts[supplierId] : undefined));
  const setQuantity = useOrderDraftStore((state) => state.setQuantity);
  const removeItem = useOrderDraftStore((state) => state.removeItem);
  const clearSupplier = useOrderDraftStore((state) => state.clearSupplier);
  const placeOrderMutation = usePlaceCatalogOrder(supplierId ?? '');
  const styles = createReviewStyles(theme);

  if (!visible || !supplierId) return null;

  const lines = Object.entries(draft ?? {})
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
        onClose();
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
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {supplierName}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {lines.length === 0 ? (
          <Text style={styles.emptyText}>{t('orders.reviewEmpty')}</Text>
        ) : (
          <FlatList
            data={lines}
            keyExtractor={(line) => line.catalogItemId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: line }) => (
              <Card>
                <View style={styles.row}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {line.title}
                  </Text>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => setQuantity(supplierId, line.catalogItemId, line.quantity - 1)}
                      hitSlop={8}
                    >
                      <Feather name="minus" size={16} color={theme.colors.primary} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{line.quantity}</Text>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => setQuantity(supplierId, line.catalogItemId, line.quantity + 1)}
                      hitSlop={8}
                    >
                      <Feather name="plus" size={16} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => removeItem(supplierId, line.catalogItemId)} hitSlop={8}>
                    <Feather name="x-circle" size={20} color={theme.colors.danger} />
                  </Pressable>
                </View>
              </Card>
            )}
          />
        )}

        <Button
          label={t('orders.send')}
          icon="share-2"
          onPress={handleSend}
          loading={placeOrderMutation.isPending}
          disabled={lines.length === 0}
        />
      </View>
    </View>
  );
}

function createReviewStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      maxHeight: '75%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetTitle: {
      flex: 1,
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center' },
    list: { gap: theme.spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
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
  });
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    supplierScroll: { flexGrow: 0, flexShrink: 0 },
    supplierRow: { paddingBottom: theme.spacing.md },
    chipWrap: { marginRight: theme.spacing.sm, position: 'relative' },
    chipDot: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.warning,
    },
    catalogArea: { flex: 1 },
    hintWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hintText: { color: theme.colors.textSecondary, textAlign: 'center' },
    pendingBar: { paddingTop: theme.spacing.sm },
    pendingScrollContent: { paddingRight: theme.spacing.md },
  });
}
