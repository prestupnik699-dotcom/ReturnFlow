import { useRef, useState } from 'react';
import { View, FlatList, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Text } from '@/components/AppText';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
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
import { useHasRole } from '@/features/auth/hooks/usePermissions';
import { useSupplierCatalog } from '@/features/suppliers/hooks/useSupplierCatalog';
import {
  useCreateCatalogItem,
  useDeleteCatalogItem,
  useBulkDeleteCatalogItems,
} from '@/features/suppliers/hooks/useCatalogMutations';
import { useCatalogOrderHistory } from '@/features/suppliers/hooks/useCatalogOrderHistory';
import { CatalogItemFormSheet } from '@/features/suppliers/components/CatalogItemFormSheet';
import { CatalogImportSheet } from '@/features/suppliers/components/CatalogImportSheet';
import { useOrderDraftStore } from '@/stores/orderDraft.store';
import { useLanguageStore } from '@/stores/language.store';
import { useRouter } from 'expo-router';
import { fetchCatalogItemByBarcode } from '@/features/suppliers/services/catalog.service';
import { hapticImpactLight, hapticSuccess, hapticError } from '@/lib/haptics';
import type { OrderHistoryEntry, CatalogItem } from '@/features/suppliers/services/catalog.service';

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
  const canEdit = useHasRole(['Owner', 'StoreManager']);
  const [quickName, setQuickName] = useState('');
  const [addedBanner, setAddedBanner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const appLanguage = useLanguageStore((state) => state.language);
  const [scanningActive, setScanningActive] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [prefillBarcode, setPrefillBarcode] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CatalogItem | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const bulkDeleteMutation = useBulkDeleteCatalogItems(supplierId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmVisible, setBulkDeleteConfirmVisible] = useState(false);

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
  const scanLockRef = useRef(false);
  const styles = createStyles(theme);

  const speechLocale = appLanguage === 'ru' ? 'ru-RU' : appLanguage === 'ka' ? 'ka-GE' : 'en-US';

  // The recognized transcript replaces (not appends to) the quick-add
  // field, matching how a person would expect dictation to work for a
  // single short item name — not accumulating fragments across taps.
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setQuickName(transcript);
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', () => setIsListening(false));

  const handleVoiceInput = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) return;

    hapticImpactLight();
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: speechLocale,
      interimResults: false,
      continuous: false,
    });
  };

  const handleQuickAdd = () => {
    const name = quickName.trim();
    if (!name) return;

    createMutation.mutate(
      { name, defaultPrice: null, barcode: null },
      {
        onSuccess: () => {
          hapticSuccess();
          setQuickName('');
          // A banner rather than highlighting the new row in the list —
          // the list is alphabetically sorted, so a newly added item can
          // land anywhere, including off-screen below the fold, where an
          // in-list highlight would never be seen.
          setAddedBanner(name);
          setTimeout(() => setAddedBanner((current) => (current === name ? null : current)), 1800);
        },
        onError: () => hapticError(),
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
          secondaryRightIcon={canEdit ? 'upload' : undefined}
          onSecondaryRightPress={canEdit ? () => setImportVisible(true) : undefined}
          rightIcon="clock"
          onRightPress={() => setHistoryVisible(true)}
        />

        {canEdit ? (
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
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  <Feather name="plus" size={22} color={theme.colors.onPrimary} />
                )}
              </Pressable>
              <Pressable style={styles.scanButton} onPress={() => setScanningActive(true)}>
                <Feather name="maximize" size={20} color={theme.colors.primary} />
              </Pressable>
              <Pressable
                style={[styles.scanButton, isListening && styles.micButtonActive]}
                onPress={handleVoiceInput}
              >
                <Feather
                  name={isListening ? 'mic-off' : 'mic'}
                  size={20}
                  color={isListening ? '#fff' : theme.colors.primary}
                />
              </Pressable>
            </View>
            <Text style={styles.quickAddHint}>{t('suppliers.catalog.quickAddHint')}</Text>
          </View>
        ) : null}

        {addedBanner ? (
          <View style={styles.addedBanner}>
            <Feather name="check-circle" size={14} color={theme.colors.success} />
            <Text style={styles.addedBannerText} numberOfLines={1}>
              {t('suppliers.catalog.itemAdded', { name: addedBanner })}
            </Text>
          </View>
        ) : null}

        {catalog && catalog.length > 0 ? (
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
        ) : null}

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
            data={catalog.filter((item) =>
              item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (item.pendingSync) return;
                  if (selectionMode) {
                    toggleSelect(item.id);
                    return;
                  }
                  if (canEdit) openEdit(item);
                }}
                onLongPress={() => {
                  if (!canEdit || item.pendingSync) return;
                  toggleSelect(item.id);
                }}
              >
                <Card>
                  <View style={styles.row}>
                    {selectionMode ? (
                      <Feather
                        name={selectedIds.includes(item.id) ? 'check-circle' : 'circle'}
                        size={20}
                        color={
                          selectedIds.includes(item.id)
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                      />
                    ) : null}
                    <View style={styles.info}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.pendingSync ? (
                        <View style={styles.pendingBadge}>
                          <Feather name="upload-cloud" size={11} color={theme.colors.warning} />
                          <Text style={styles.pendingBadgeText}>
                            {t('suppliers.catalog.pendingSync')}
                          </Text>
                        </View>
                      ) : item.defaultPrice != null ? (
                        <Text style={styles.itemPrice}>{item.defaultPrice}</Text>
                      ) : null}
                    </View>
                    {!item.pendingSync && !selectionMode ? (
                      <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            )}
          />
        )}

        {selectionMode ? (
          <View style={styles.footerSelectionMode}>
            <View style={styles.bulkBar}>
              <Text style={styles.countText}>
                {t('suppliers.catalog.selectedCount', { count: selectedIds.length })}
              </Text>
              <View style={styles.bulkBarTop}>
                <Pressable style={styles.cancelButton} onPress={() => setSelectedIds([])}>
                  <Text style={styles.cancelText}>{t('suppliers.catalog.cancelSelection')}</Text>
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
        ) : null}
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

      <ConfirmDialog
        visible={bulkDeleteConfirmVisible}
        title={t('suppliers.catalog.bulkDeleteConfirmTitle', { count: selectedIds.length })}
        message={t('suppliers.catalog.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={bulkDeleteMutation.isPending}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteConfirmVisible(false)}
      />

      <OrderHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        supplierId={supplierId}
      />

      <CatalogImportSheet
        visible={importVisible}
        onClose={() => setImportVisible(false)}
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
  const router = useRouter();
  const { data: history, isLoading } = useCatalogOrderHistory(supplierId);
  const setQuantity = useOrderDraftStore((state) => state.setQuantity);
  const styles = createHistoryStyles(theme);

  if (!visible) return null;

  // Only lines still linked to a catalog item can be restored — one
  // that's since been deleted from the catalog has nothing to attach a
  // quantity to, so it's silently skipped rather than reconstructed as
  // a new item (that would defeat the point of a catalog in the first
  // place: reusing the same tracked item, not spawning near-duplicates).
  const handleReorder = (items: OrderHistoryEntry[]) => {
    let restoredCount = 0;
    for (const item of items) {
      if (item.catalogItemId) {
        setQuantity(supplierId, item.catalogItemId, item.quantity);
        restoredCount += 1;
      }
    }
    onClose();
    if (restoredCount > 0) {
      router.push('/order');
    }
  };

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
                  <View style={styles.orderCardHeader}>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    <Pressable
                      style={styles.reorderButton}
                      onPress={() => handleReorder(order.items)}
                      hitSlop={8}
                    >
                      <Feather name="refresh-cw" size={13} color={theme.colors.primary} />
                      <Text style={styles.reorderButtonText}>
                        {t('suppliers.catalog.reorderButton')}
                      </Text>
                    </Pressable>
                  </View>
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
    addedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.success + '15',
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xsPlus,
      marginBottom: theme.spacing.sm,
    },
    addedBannerText: {
      flex: 1,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.success,
    },
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
    micButtonActive: { backgroundColor: theme.colors.danger },
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
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { gap: theme.spacing.sm, paddingBottom: theme.spacing.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    info: { flex: 1, gap: 2 },
    footerSelectionMode: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
      marginTop: theme.spacing.sm,
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
    itemName: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    itemPrice: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    pendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: theme.colors.warning + '22',
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      marginTop: 2,
    },
    pendingBadgeText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.warning,
    },
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
    orderCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    orderDate: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
    },
    reorderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    reorderButtonText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.primary,
    },
    orderLine: { fontSize: theme.fontSizes.sm, color: theme.colors.textPrimary },
  });
}
