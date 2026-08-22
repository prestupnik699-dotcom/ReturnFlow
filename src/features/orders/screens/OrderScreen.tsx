import { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
  Share,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useSupplierReliability } from '@/features/suppliers/hooks/useSupplierReliability';
import { useSupplierCatalog } from '@/features/suppliers/hooks/useSupplierCatalog';
import { usePlaceCatalogOrder } from '@/features/suppliers/hooks/useCatalogMutations';
import { shareOrderAsPdf } from '@/features/orders/services/orderExport.service';
import { useCatalogOrderHistory } from '@/features/suppliers/hooks/useCatalogOrderHistory';
import {
  placeCatalogOrder,
  fetchSupplierCatalog,
} from '@/features/suppliers/services/catalog.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
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
  const { data: reliability } = useSupplierReliability();
  const tabBarClearance = useTabBarClearance();
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
  const [reviewSupplierId, setReviewSupplierId] = useState<string | null>(null);
  const drafts = useOrderDraftStore((state) => state.drafts);
  const setQuantity = useOrderDraftStore((state) => state.setQuantity);
  const clearSupplier = useOrderDraftStore((state) => state.clearSupplier);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const profile = useAuthStore((state) => state.profile);
  const [sendingAll, setSendingAll] = useState(false);
  const styles = createStyles(theme);

  // Sequential, not parallel — the OS only supports one native share sheet
  // at a time. Each supplier's order is saved, its share sheet opened and
  // awaited until the person dismisses it, and only then does the next
  // supplier's sheet open. Share.share()'s promise already resolves once
  // the sheet closes, so awaiting it in a loop naturally gives this
  // one-at-a-time behavior without extra coordination.
  const handleSendAll = async () => {
    if (!activeOrganizationId || !activeStoreId || !profile || !suppliers) return;
    setSendingAll(true);

    const targets = suppliers.filter((s) => pendingSupplierIds.includes(s.id));

    for (const supplier of targets) {
      const draftItems = drafts[supplier.id] ?? {};
      const supplierCatalog = await fetchSupplierCatalog(supplier.id);
      const catalogItems = supplierCatalog.success ? supplierCatalog.data : [];

      const lines = Object.entries(draftItems)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, quantity]) => {
          const item = catalogItems.find((c) => c.id === itemId);
          return { catalogItemId: itemId, title: item?.name ?? '', quantity };
        });

      if (lines.length === 0) continue;

      const shareText = lines
        .map((line, index) => `${index + 1}. ${line.title} — ${line.quantity} pcs`)
        .join('\n');

      const result = await placeCatalogOrder({
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId: supplier.id,
        createdBy: profile.id,
        lines,
      });

      if (result.success) {
        clearSupplier(supplier.id);
        try {
          await Share.share({ message: `${supplier.name}\n\n${shareText}` });
        } catch {
          // Move on to the next supplier regardless of how this share
          // sheet was dismissed — the order itself is already saved.
        }
      }
    }

    setSendingAll(false);
  };

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
              {suppliers.map((supplier) => {
                const defectRate = reliability?.[supplier.id]?.defectRatePercent;
                const isUnreliable = defectRate != null && defectRate > 15;
                return (
                  <View key={supplier.id} style={styles.chipWrap}>
                    <Chip
                      label={supplier.name}
                      selected={supplier.id === activeSupplierId}
                      onPress={() => {
                        hapticSelection();
                        setActiveSupplierId(supplier.id);
                      }}
                    />
                    {isUnreliable ? (
                      <View style={styles.warningDot}>
                        <Feather name="alert-triangle" size={9} color="#fff" />
                      </View>
                    ) : null}
                    {pendingSupplierIds.includes(supplier.id) ? (
                      <View style={styles.chipDot} />
                    ) : null}
                  </View>
                );
              })}
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
              <View
                style={[
                  styles.pendingBar,
                  { marginBottom: Math.max(0, tabBarClearance - theme.spacing['4xl']) },
                ]}
              >
                <Text style={styles.pendingTitle}>
                  {t('orders.readyToSend')} ({pendingSupplierIds.length})
                </Text>
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
                {pendingSupplierIds.length > 1 ? (
                  <Button
                    label={sendingAll ? t('orders.sending') : t('orders.sendAll')}
                    icon="send"
                    onPress={handleSendAll}
                    loading={sendingAll}
                    style={styles.sendAllButton}
                  />
                ) : null}
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
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const { data: catalog, isLoading } = useSupplierCatalog(supplierId);
  const { data: history } = useCatalogOrderHistory(supplierId);
  const [searchQuery, setSearchQuery] = useState('');
  const styles = createPickerStyles(theme);

  if (isLoading) return null;

  if (!catalog || catalog.length === 0) {
    return (
      <View style={styles.emptyCatalog}>
        <Text style={styles.emptyCatalogText}>{t('orders.supplierCatalogEmpty')}</Text>
      </View>
    );
  }

  const filtered = catalog.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  // Only offered when the draft for this supplier is completely empty —
  // once the person has picked even one quantity by hand, silently
  // overwriting that with last time's order would be surprising rather
  // than helpful.
  const isDraftEmpty = Object.values(quantities).every((qty) => qty === 0);
  const lastOrder = history?.[0];
  const showRepeatBanner = isDraftEmpty && !!lastOrder && lastOrder.items.length > 0;

  const handleRepeatLastOrder = () => {
    if (!lastOrder) return;
    for (const line of lastOrder.items) {
      if (line.catalogItemId) {
        onSetQuantity(line.catalogItemId, line.quantity);
      }
    }
  };

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      style={styles.flatList}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('suppliers.searchPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {showRepeatBanner ? (
            <Pressable style={styles.repeatBanner} onPress={handleRepeatLastOrder}>
              <Feather name="refresh-cw" size={15} color={theme.colors.primary} />
              <Text style={styles.repeatBannerText}>
                {t('orders.repeatLastOrder', { count: lastOrder.items.length })}
              </Text>
            </Pressable>
          ) : null}
        </>
      }
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
    repeatBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    repeatBannerText: {
      flex: 1,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.primary,
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
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.fontSizes.sm,
    },
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
  const [note, setNote] = useState('');
  const styles = createReviewStyles(theme);

  if (!supplierId) return null;

  const lines = Object.entries(draft ?? {})
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => {
      const item = catalog?.find((c) => c.id === itemId);
      return {
        catalogItemId: itemId,
        title: item?.name ?? '',
        quantity,
        unitPrice: item?.defaultPrice ?? null,
      };
    });

  const hasAnyPrice = lines.some((line) => line.unitPrice != null);
  const hasMissingPrice = lines.some((line) => line.unitPrice == null);
  const orderTotal = lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0);

  const handleSend = () => {
    const orderLines = lines
      .map((line, index) => `${index + 1}. ${line.title} — ${line.quantity} pcs`)
      .join('\n');
    const trimmedNote = note.trim();
    const shareText = trimmedNote ? `${orderLines}\n\n${trimmedNote}` : orderLines;

    placeOrderMutation.mutate(lines, {
      onSuccess: async () => {
        hapticSuccess();
        clearSupplier(supplierId);
        onClose();
        setNote('');
        try {
          await Share.share({ message: shareText });
        } catch {
          // The order is already saved by this point — a dismissed or
          // failed share sheet doesn't need to roll anything back.
        }
      },
    });
  };

  const handleSendAsPdf = () => {
    placeOrderMutation.mutate(lines, {
      onSuccess: async () => {
        hapticSuccess();
        clearSupplier(supplierId);
        onClose();
        try {
          await shareOrderAsPdf(supplierName, lines, note, {
            documentTitle: t('orders.pdfDocumentTitle'),
            columnItem: t('orders.pdfColumnItem'),
            columnQuantity: t('orders.pdfColumnQuantity'),
            columnPrice: t('orders.pdfColumnPrice'),
            columnSubtotal: t('orders.pdfColumnSubtotal'),
            totalLabel: t('orders.orderTotal'),
            noteLabel: t('orders.pdfNoteLabel'),
          });
        } catch {
          // The order is already saved by this point regardless of
          // whether PDF generation or the share sheet itself failed.
        }
        setNote('');
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
            <>
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.list}>
                  {lines.map((line) => (
                    <Card key={line.catalogItemId}>
                      <View style={styles.row}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {line.title}
                        </Text>
                        <View style={styles.stepper}>
                          <Pressable
                            style={styles.stepperButton}
                            onPress={() =>
                              setQuantity(supplierId, line.catalogItemId, line.quantity - 1)
                            }
                            hitSlop={8}
                          >
                            <Feather name="minus" size={16} color={theme.colors.primary} />
                          </Pressable>
                          <Text style={styles.stepperValue}>{line.quantity}</Text>
                          <Pressable
                            style={styles.stepperButton}
                            onPress={() =>
                              setQuantity(supplierId, line.catalogItemId, line.quantity + 1)
                            }
                            hitSlop={8}
                          >
                            <Feather name="plus" size={16} color={theme.colors.primary} />
                          </Pressable>
                        </View>
                        <Pressable
                          onPress={() => removeItem(supplierId, line.catalogItemId)}
                          hitSlop={8}
                        >
                          <Feather name="x-circle" size={20} color={theme.colors.danger} />
                        </Pressable>
                      </View>
                    </Card>
                  ))}
                </View>
              </ScrollView>

              <ScrollView
                style={styles.footerScroll}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.footerContent}
              >
                <TextInput
                  style={styles.noteInput}
                  placeholder={t('orders.notePlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />

                {hasAnyPrice ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      {t('orders.orderTotal')}
                      {hasMissingPrice ? ` ${t('orders.orderTotalPartial')}` : ''}
                    </Text>
                    <Text style={styles.totalValue}>{orderTotal.toLocaleString()}</Text>
                  </View>
                ) : null}

                <View style={styles.sendButtonsRow}>
                  <Button
                    label={t('orders.send')}
                    icon="share-2"
                    onPress={handleSend}
                    loading={placeOrderMutation.isPending}
                    disabled={lines.length === 0}
                    style={styles.sendButton}
                  />
                  <Button
                    label={t('orders.sendAsPdf')}
                    icon="file-text"
                    variant="outline"
                    onPress={handleSendAsPdf}
                    loading={placeOrderMutation.isPending}
                    disabled={lines.length === 0}
                    style={styles.sendButton}
                  />
                </View>
              </ScrollView>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function createReviewStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    sheet: {
      maxHeight: '75%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    listScroll: { flexGrow: 0, flexShrink: 1 },
    listContent: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
    },
    footerScroll: { flexGrow: 0, flexShrink: 0 },
    footerContent: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
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
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: theme.spacing.xs,
    },
    totalLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    totalValue: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    noteInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textPrimary,
      minHeight: 44,
      textAlignVertical: 'top',
    },
    sendButtonsRow: { flexDirection: 'row', gap: theme.spacing.sm },
    sendButton: { flex: 1 },
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
    warningDot: {
      position: 'absolute',
      top: -4,
      left: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catalogArea: { flex: 1 },
    hintWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hintText: { color: theme.colors.textSecondary, textAlign: 'center' },
    pendingBar: { paddingTop: theme.spacing.sm },
    pendingTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    sendAllButton: { marginTop: theme.spacing.md, alignSelf: 'stretch' },
    pendingScrollContent: { paddingRight: theme.spacing.md },
  });
}
