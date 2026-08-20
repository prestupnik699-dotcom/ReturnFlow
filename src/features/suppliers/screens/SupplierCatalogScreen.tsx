import { useRef, useState } from 'react';
import { View, FlatList, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Text } from '@/components/AppText';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
} from '@/features/suppliers/hooks/useCatalogMutations';
import { useCatalogOrderHistory } from '@/features/suppliers/hooks/useCatalogOrderHistory';
import { CatalogItemFormSheet } from '@/features/suppliers/components/CatalogItemFormSheet';
import { fetchCatalogItemByBarcode } from '@/features/suppliers/services/catalog.service';
import { hapticImpactLight, hapticSuccess } from '@/lib/haptics';
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
  const [permission, requestPermission] = useCameraPermissions();
  const { data: supplier } = useSupplier(supplierId);
  const { data: catalog, isLoading, isError } = useSupplierCatalog(supplierId);
  const createMutation = useCreateCatalogItem(supplierId);
  const deleteMutation = useDeleteCatalogItem(supplierId);
  const [quickName, setQuickName] = useState('');
  const [scanningActive, setScanningActive] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [prefillBarcode, setPrefillBarcode] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CatalogItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const scanLockRef = useRef(false);
  const styles = createStyles(theme);

  const handleQuickAdd = () => {
    const name = quickName.trim();
    if (!name) return;

    createMutation.mutate(
      { name, defaultPrice: null, barcode: null },
      {
        onSuccess: () => setQuickName(''),
      },
    );
  };

  const openEdit = (item: CatalogItem) => {
    hapticImpactLight();
    setEditingItem(item);
    setPrefillBarcode(null);
    setFormVisible(true);
  };

  // A scanned code that already belongs to a catalog item opens that item
  // for editing instead of creating a duplicate — the same physical
  // product might get scanned again on a later visit, and this way it's
  // recognized rather than re-added. A brand-new code opens a blank
  // editable item with the barcode already filled in, ready for a name.
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setIsLookingUp(true);

    const result = await fetchCatalogItemByBarcode(supplierId, data);
    setIsLookingUp(false);
    setScanningActive(false);

    if (result.success && result.data) {
      hapticSuccess();
      setEditingItem(result.data);
      setPrefillBarcode(null);
    } else {
      hapticSuccess();
      setEditingItem(null);
      setPrefillBarcode(data);
    }
    setFormVisible(true);

    setTimeout(() => {
      scanLockRef.current = false;
    }, 1000);
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
            <Pressable style={styles.scanButton} onPress={() => setScanningActive(true)}>
              <Feather name="maximize" size={20} color={theme.colors.primary} />
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

      {/* Rendered as a sibling of the screen's ScrollView-free layout, as
          an absolute overlay — the native camera preview is a hardware
          SurfaceView on Android that doesn't reliably clip/position
          itself when nested inside a scrolling container. Keeping it as
          a full-screen overlay avoids that class of bug entirely. */}
      {scanningActive ? (
        <View style={styles.cameraOverlayRoot} renderToHardwareTextureAndroid collapsable={false}>
          <Pressable style={styles.cameraBackdrop} onPress={() => setScanningActive(false)} />
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>{t('scanner.noPermission')}</Text>
              <Button label={t('scanner.openSettings')} onPress={requestPermission} />
            </View>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.cameraFrameOverlay} pointerEvents="box-none">
                <View style={styles.frame} />
                <Pressable
                  style={styles.stopScanButton}
                  onPress={() => setScanningActive(false)}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color="#fff" />
                </Pressable>
              </View>
              {isLookingUp ? (
                <View style={styles.cameraStatusOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      <CatalogItemFormSheet
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setEditingItem(null);
          setPrefillBarcode(null);
        }}
        supplierId={supplierId}
        item={editingItem}
        prefillBarcode={prefillBarcode}
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
            contentContainerStyle={styles.historyList}
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
    scanButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
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
    cameraOverlayRoot: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    cameraBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.85)',
    },
    permissionBox: {
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
    },
    permissionText: { color: theme.colors.textSecondary, textAlign: 'center' },
    cameraWrap: {
      width: '100%',
      height: 320,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    camera: { flex: 1 },
    cameraFrameOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: 220,
      height: 130,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: theme.radius.md,
    },
    stopScanButton: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraStatusOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    historyList: { gap: theme.spacing.sm },
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
