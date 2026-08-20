import { useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Share,
} from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSupplier } from '@/features/suppliers/hooks/useSupplier';
import { useSupplierCatalog } from '@/features/suppliers/hooks/useSupplierCatalog';
import {
  useCreateCatalogItem,
  useDeleteCatalogItem,
  usePlaceCatalogOrder,
} from '@/features/suppliers/hooks/useCatalogMutations';
import { useCatalogOrderHistory } from '@/features/suppliers/hooks/useCatalogOrderHistory';
import { CatalogItemFormSheet } from '@/features/suppliers/components/CatalogItemFormSheet';
import { hapticSuccess, hapticSelection, hapticImpactLight } from '@/lib/haptics';
import type { CatalogItem } from '@/features/suppliers/services/catalog.service';

type Props = { supplierId: string };

export function SupplierCatalogScreen({ supplierId }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: supplier } = useSupplier(supplierId);
  const { data: catalog, isLoading, isError } = useSupplierCatalog(supplierId);
  const createMutation = useCreateCatalogItem(supplierId);
  const deleteMutation = useDeleteCatalogItem(supplierId);
  const placeOrderMutation = usePlaceCatalogOrder(supplierId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quickName, setQuickName] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CatalogItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const styles = createStyles(theme);

  const selectedLines = Object.entries(quantities).filter(([, qty]) => qty > 0);
  const totalItems = selectedLines.reduce((sum, [, qty]) => sum + qty, 0);
  const hasSelection = selectedLines.length > 0;

  const setQuantity = (itemId: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, quantity) }));
  };

  // The core idea: typing a name + quantity here does both things at once —
  // adds it to the persistent per-supplier catalog AND puts it straight
  // into the order being built. There is no separate "fill the catalog
  // first, place an order later" step; every order naturally grows the
  // catalog for next time, matching how the person already writes orders
  // by hand (name + quantity, one line at a time).
  const handleQuickAdd = () => {
    const name = quickName.trim();
    if (!name) return;

    const quantity = Math.max(1, parseInt(quickQty, 10) || 1);

    createMutation.mutate(
      { name, defaultPrice: null },
      {
        onSuccess: (newItem) => {
          if (newItem) setQuantity(newItem.id, quantity);
          setQuickName('');
          setQuickQty('1');
        },
      },
    );
  };

  const openEdit = (item: CatalogItem) => {
    hapticImpactLight();
    setEditingItem(item);
    setFormVisible(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  // Builds the order in the same shape the person already writes by hand
  // ("1. Domestos 1000ml — 2 pcs"), records it for history, then hands
  // off to the system share sheet so it goes straight to the supplier
  // over WhatsApp/Telegram/email without any copy-pasting.
  const handleShareOrder = () => {
    const lines = selectedLines.map(([itemId, quantity]) => {
      const item = catalog?.find((c) => c.id === itemId);
      return { catalogItemId: itemId, title: item?.name ?? '', quantity };
    });

    const shareText = lines
      .map((line, index) => `${index + 1}. ${line.title} — ${line.quantity} pcs`)
      .join('\n');

    placeOrderMutation.mutate(lines, {
      onSuccess: async () => {
        hapticSuccess();
        setQuantities({});
        try {
          await Share.share({ message: shareText });
        } catch {
          // Sharing is a courtesy step after the order is already saved —
          // if the share sheet fails or is dismissed, the order still
          // exists in history, so there's nothing to recover from.
        }
      },
    });
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader
          title={supplier?.name ?? t('suppliers.catalog.title')}
          rightIcon="clock"
          onRightPress={() => setHistoryVisible(true)}
        />

        <View style={styles.quickAddRow}>
          <TextInput
            style={[styles.quickInput, styles.quickName]}
            placeholder={t('suppliers.catalog.quickAddPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={quickName}
            onChangeText={setQuickName}
            onSubmitEditing={handleQuickAdd}
          />
          <TextInput
            style={[styles.quickInput, styles.quickQty]}
            value={quickQty}
            onChangeText={setQuickQty}
            keyboardType="number-pad"
          />
          <Pressable
            style={styles.quickAddButton}
            onPress={handleQuickAdd}
            disabled={createMutation.isPending}
          >
            <Feather name="plus" size={22} color={theme.colors.onPrimary} />
          </Pressable>
        </View>

        {isError ? (
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        ) : !catalog || catalog.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="shopping-bag"
              title={t('suppliers.catalog.empty')}
              message={t('suppliers.catalog.emptyMessage')}
            />
          </View>
        ) : (
          <FlatList
            data={catalog}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: hasSelection ? 140 : theme.spacing.xl },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const quantity = quantities[item.id] ?? 0;
              return (
                <Card>
                  <View style={styles.row}>
                    <Pressable style={styles.info} onPress={() => openEdit(item)}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.defaultPrice != null ? (
                        <Text style={styles.itemPrice}>{item.defaultPrice}</Text>
                      ) : null}
                    </Pressable>
                    <View style={styles.stepper}>
                      <Pressable
                        style={styles.stepperButton}
                        onPress={() => {
                          hapticSelection();
                          setQuantity(item.id, quantity - 1);
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
                          setQuantity(item.id, quantity + 1);
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
        )}

        {hasSelection ? (
          <View style={styles.orderBar}>
            <View style={styles.orderBarInfo}>
              <Text style={styles.orderBarCount}>
                {t('suppliers.catalog.orderCount', { count: totalItems })}
              </Text>
            </View>
            <Button
              label={t('suppliers.catalog.shareOrder')}
              icon="share-2"
              onPress={handleShareOrder}
              loading={placeOrderMutation.isPending}
              style={styles.orderBarButton}
            />
          </View>
        ) : null}
      </View>

      <CatalogItemFormSheet
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setEditingItem(null);
        }}
        supplierId={supplierId}
        item={editingItem}
        onRequestDelete={(item) => setPendingDelete(item)}
      />

      <ConfirmDialog
        visible={!!pendingDelete}
        title={t('suppliers.catalog.deleteConfirmTitle')}
        message={t('suppliers.catalog.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <OrderHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        supplierId={supplierId}
      />
    </Screen>
  );
}

function OrderHistorySheet({
  visible,
  onClose,
  supplierId,
}: {
  visible: boolean;
  onClose: () => void;
  supplierId: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: history, isLoading } = useCatalogOrderHistory(supplierId);
  const styles = createHistoryStyles(theme);

  if (!visible) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t('suppliers.catalog.historyTitle')}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : !history || history.length === 0 ? (
          <Text style={styles.emptyText}>{t('suppliers.catalog.historyEmpty')}</Text>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(order) => order.createdAt}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: order }) => (
              <Card>
                <View style={styles.orderCard}>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  {order.items.map((line) => (
                    <Text key={line.id} style={styles.orderLine}>
                      {line.title} × {line.quantity}
                    </Text>
                  ))}
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: theme.colors.danger, textAlign: 'center' },
    quickAddRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    quickInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textPrimary,
    },
    quickName: { flex: 1 },
    quickQty: { width: 52, textAlign: 'center' },
    quickAddButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { gap: theme.spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    info: { flex: 1, gap: 2 },
    itemName: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    itemPrice: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
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
    orderBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      padding: theme.spacing.lg,
    },
    orderBarInfo: { flex: 1 },
    orderBarCount: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    orderBarButton: { flex: 1.4 },
  });
}

function createHistoryStyles(theme: ReturnType<typeof useTheme>) {
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
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center' },
    orderCard: { padding: theme.spacing.lg, gap: 4 },
    orderDate: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    orderLine: { fontSize: theme.fontSizes.sm, color: theme.colors.textPrimary },
  });
}
