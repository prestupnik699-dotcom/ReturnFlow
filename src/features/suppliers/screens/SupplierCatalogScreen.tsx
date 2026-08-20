import { useState } from 'react';
import { View, FlatList, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSupplier } from '@/features/suppliers/hooks/useSupplier';
import { useSupplierCatalog } from '@/features/suppliers/hooks/useSupplierCatalog';
import {
  useCreateCatalogItem,
  useDeleteCatalogItem,
} from '@/features/suppliers/hooks/useCatalogMutations';
import { useCatalogOrderHistory } from '@/features/suppliers/hooks/useCatalogOrderHistory';
import { CatalogItemFormSheet } from '@/features/suppliers/components/CatalogItemFormSheet';
import { hapticImpactLight } from '@/lib/haptics';
import type { CatalogItem } from '@/features/suppliers/services/catalog.service';

type Props = { supplierId: string };

// Pure catalog management: this screen is only for building up "what this
// supplier can bring" ahead of time — no quantities, no order building, no
// sharing. That happens on the separate cross-supplier order screen, which
// reads from this same catalog to let the person pick quantities quickly
// instead of retyping names every time.
export function SupplierCatalogScreen({ supplierId }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: supplier } = useSupplier(supplierId);
  const { data: catalog, isLoading, isError } = useSupplierCatalog(supplierId);
  const createMutation = useCreateCatalogItem(supplierId);
  const deleteMutation = useDeleteCatalogItem(supplierId);
  const [quickName, setQuickName] = useState('');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CatalogItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const styles = createStyles(theme);

  const handleQuickAdd = () => {
    const name = quickName.trim();
    if (!name) return;

    createMutation.mutate({ name, defaultPrice: null }, { onSuccess: () => setQuickName('') });
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

        <View style={styles.quickAddWrap}>
          <View style={styles.quickAddRow}>
            <TextInput
              style={styles.quickInput}
              placeholder={t('suppliers.catalog.quickAddPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={quickName}
              onChangeText={setQuickName}
              onSubmitEditing={handleQuickAdd}
            />
            <Pressable
              style={styles.quickAddButton}
              onPress={handleQuickAdd}
              disabled={createMutation.isPending}
            >
              <Feather name="plus" size={22} color={theme.colors.onPrimary} />
            </Pressable>
          </View>
          <Text style={styles.quickAddHint}>{t('suppliers.catalog.quickAddHint')}</Text>
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
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable onPress={() => openEdit(item)}>
                <Card>
                  <View style={styles.row}>
                    <View style={styles.info}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.defaultPrice != null ? (
                        <Text style={styles.itemPrice}>{item.defaultPrice}</Text>
                      ) : null}
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
                  </View>
                </Card>
              </Pressable>
            )}
          />
        )}
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
    quickAddWrap: { marginBottom: theme.spacing.md, gap: 4 },
    quickAddRow: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' },
    quickInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textPrimary,
    },
    quickAddButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickAddHint: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.xl },
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
