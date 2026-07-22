import { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/AppText';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ReturnFormSheet } from '@/features/returns/screens/ReturnFormSheet';
import {
  BatchScanReviewSheet,
  type QueuedScanItem,
} from '@/features/scanner/screens/BatchScanReviewSheet';
import { getBarcodeShortcut } from '@/features/scanner/hooks/useBarcodeShortcut';
import { useSaveBarcodeShortcut } from '@/features/scanner/hooks/useSaveBarcodeShortcut';
import { lookupProductNameByBarcode } from '@/features/scanner/services/productLookup.service';
import { createReturn } from '@/features/returns/services/returns.service';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useQueryClient } from '@tanstack/react-query';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';

const BATCH_RESCAN_COOLDOWN_MS = 1500;

export function ScannerScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const { data: suppliers } = useSuppliers(false, 'name');
  const saveShortcutMutation = useSaveBarcodeShortcut();
  const queryClient = useQueryClient();

  const [isPaused, setIsPaused] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [instantMessage, setInstantMessage] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [prefillTitle, setPrefillTitle] = useState('');
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<QueuedScanItem[]>([]);
  const [batchReviewVisible, setBatchReviewVisible] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  // Guards against the camera firing onBarcodeScanned dozens of times per
  // second while the same code sits in frame in batch mode (batch mode
  // never sets isPaused, unlike the single-scan flow, so without this the
  // queued quantity would rocket up for every millisecond the item is held
  // in view). Set synchronously, before any await, so near-simultaneous
  // re-fires for the same code are blocked regardless of async timing.
  const lastScanRef = useRef<{ barcode: string; time: number } | null>(null);
  const styles = createStyles(theme);

  const resumeScanning = () => {
    setCurrentBarcode(null);
    setIsPaused(false);
    setInstantMessage(null);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isPaused || !activeStoreId || !activeOrganizationId || !profile) return;

    if (batchMode) {
      const last = lastScanRef.current;
      if (last && last.barcode === data && Date.now() - last.time < BATCH_RESCAN_COOLDOWN_MS) {
        return;
      }
      // Lock immediately, before the async lookup below, so a
      // near-simultaneous re-fire for this same code can't slip through
      // while we're still awaiting getBarcodeShortcut.
      lastScanRef.current = { barcode: data, time: Date.now() };
    }

    const shortcut = await getBarcodeShortcut(activeStoreId, data);

    if (shortcut && batchMode) {
      // Fast path: known item, batch mode on — queue it locally and keep
      // scanning immediately, no DB write and no pause. Scanning the same
      // barcode again just bumps the queued quantity instead of adding a
      // duplicate row, mirroring how a person would tally a stack of the
      // same product.
      hapticSelection();
      setBatchQueue((prev) => {
        const existing = prev.find((q) => q.barcode === data);
        if (existing) {
          return prev.map((q) => (q.barcode === data ? { ...q, quantity: q.quantity + 1 } : q));
        }
        const supplierName = suppliers?.find((s) => s.id === shortcut.supplierId)?.name ?? '';
        return [
          ...prev,
          {
            id: data,
            barcode: data,
            title: shortcut.title,
            supplierId: shortcut.supplierId,
            supplierName,
            quantity: 1,
          },
        ];
      });
      return;
    }

    setCurrentBarcode(data);
    setIsPaused(true);

    if (shortcut) {
      const result = await createReturn({
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId: shortcut.supplierId,
        createdBy: profile.id,
        title: shortcut.title,
        quantity: 1,
        reason: '',
        priority: 'normal',
        barcode: data,
      });

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
        setInstantMessage(`${shortcut.title} — ${t('scanner.instantAdded')}`);
        setTimeout(resumeScanning, 1400);
        return;
      }
    }

    setIsLookingUp(true);
    const productName = await lookupProductNameByBarcode(data);
    setIsLookingUp(false);
    setPrefillTitle(productName ?? '');
    setFormVisible(true);
  };

  const handleFormClosed = () => {
    setFormVisible(false);
    resumeScanning();
  };

  const handleCreated = (values: { supplierId: string; title: string }) => {
    const barcode = currentBarcode;
    if (!barcode || !activeOrganizationId || !activeStoreId || !profile) return;

    saveShortcutMutation.mutate({
      organizationId: activeOrganizationId,
      storeId: activeStoreId,
      barcode,
      supplierId: values.supplierId,
      title: values.title,
      createdBy: profile.id,
    });
  };

  const handleChangeQueueQuantity = (id: string, quantity: number) => {
    setBatchQueue((prev) => prev.map((q) => (q.id === id ? { ...q, quantity } : q)));
  };

  const handleRemoveFromQueue = (id: string) => {
    setBatchQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleConfirmBatch = async () => {
    if (!activeOrganizationId || !activeStoreId || !profile || batchQueue.length === 0) return;

    setBatchSubmitting(true);
    for (const item of batchQueue) {
      await createReturn({
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId: item.supplierId,
        createdBy: profile.id,
        title: item.title,
        quantity: item.quantity,
        reason: '',
        priority: 'normal',
        barcode: item.barcode,
      });
    }
    setBatchSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
    hapticSuccess();
    setBatchQueue([]);
    setBatchReviewVisible(false);
  };

  const handleBackPress = () => {
    if (batchQueue.length > 0) {
      setExitConfirmVisible(true);
      return;
    }
    router.back();
  };

  const confirmDiscardAndExit = () => {
    setBatchQueue([]);
    setExitConfirmVisible(false);
    router.back();
  };

  if (!permission) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.container}>
          <ScreenHeader title={t('scanner.title')} onBack={() => router.back()} />
          <View style={styles.center}>
            <Text style={styles.permissionText}>{t('scanner.noPermission')}</Text>
            <Button label={t('scanner.openSettings')} onPress={requestPermission} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <ScreenHeader title={t('scanner.title')} onBack={handleBackPress} />
          </View>
          <Pressable
            style={[styles.batchToggle, batchMode && styles.batchToggleActive]}
            onPress={() => setBatchMode((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={batchMode ? theme.colors.onPrimary : theme.colors.primary}
            />
            <Text style={[styles.batchToggleText, batchMode && styles.batchToggleTextActive]}>
              {t('scanner.batchModeToggle')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            }}
            onBarcodeScanned={isPaused ? undefined : handleBarcodeScanned}
          />

          {!isPaused ? (
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.instructions}>
                {batchMode ? t('scanner.batchInstructions') : t('scanner.instructions')}
              </Text>
            </View>
          ) : null}

          {isLookingUp ? (
            <View style={styles.statusOverlay}>
              <ActivityIndicator color={theme.colors.onPrimary} />
              <Text style={styles.statusText}>{t('scanner.lookingUp')}</Text>
            </View>
          ) : null}

          {instantMessage ? (
            <View style={styles.instantOverlay}>
              <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
              <Text style={styles.instantText}>{instantMessage}</Text>
            </View>
          ) : null}
        </View>

        {batchMode && batchQueue.length > 0 ? (
          <Pressable style={styles.batchBar} onPress={() => setBatchReviewVisible(true)}>
            <Ionicons name="list-outline" size={18} color={theme.colors.onPrimary} />
            <Text style={styles.batchBarText}>
              {t('scanner.batchQueueCount', { count: batchQueue.length })}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>

      <ReturnFormSheet
        visible={formVisible}
        onClose={handleFormClosed}
        prefillTitle={prefillTitle}
        prefillBarcode={currentBarcode ?? ''}
        onCreated={handleCreated}
      />

      <BatchScanReviewSheet
        visible={batchReviewVisible}
        items={batchQueue}
        isSubmitting={batchSubmitting}
        onChangeQuantity={handleChangeQueueQuantity}
        onRemove={handleRemoveFromQueue}
        onConfirm={handleConfirmBatch}
        onCancel={() => setBatchReviewVisible(false)}
      />

      <ConfirmDialog
        visible={exitConfirmVisible}
        title={t('scanner.exitConfirmTitle')}
        message={t('scanner.exitConfirmMessage', { count: batchQueue.length })}
        confirmLabel={t('scanner.exitConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        onConfirm={confirmDiscardAndExit}
        onCancel={() => setExitConfirmVisible(false)}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    headerTitleWrap: { flex: 1, minWidth: 0 },
    batchToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      marginBottom: theme.spacing.lg,
    },
    batchToggleActive: { backgroundColor: theme.colors.primary },
    batchToggleText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.primary,
    },
    batchToggleTextActive: { color: theme.colors.onPrimary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md },
    permissionText: { color: theme.colors.textSecondary, textAlign: 'center' },
    cameraWrap: {
      flex: 1,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      marginTop: theme.spacing.sm,
    },
    camera: { flex: 1 },
    overlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.lg,
    },
    frame: {
      width: 260,
      height: 160,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: theme.radius.lg,
    },
    instructions: {
      color: '#FFFFFF',
      fontSize: theme.fontSizes.sm,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.full,
      textAlign: 'center',
    },
    statusOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    statusText: { color: '#FFFFFF', fontSize: theme.fontSizes.md },
    instantOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    instantText: {
      color: '#FFFFFF',
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      textAlign: 'center',
    },
    batchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    batchBarText: {
      color: theme.colors.onPrimary,
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
    },
  });
}
