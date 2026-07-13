import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { ReturnFormSheet } from '@/features/returns/screens/ReturnFormSheet';
import { getBarcodeShortcut } from '@/features/scanner/hooks/useBarcodeShortcut';
import { useSaveBarcodeShortcut } from '@/features/scanner/hooks/useSaveBarcodeShortcut';
import { lookupProductNameByBarcode } from '@/features/scanner/services/productLookup.service';
import { createReturn } from '@/features/returns/services/returns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useQueryClient } from '@tanstack/react-query';

export function ScannerScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const saveShortcutMutation = useSaveBarcodeShortcut();
  const queryClient = useQueryClient();

  const [isPaused, setIsPaused] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [instantMessage, setInstantMessage] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [prefillTitle, setPrefillTitle] = useState('');
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(null);
  const styles = createStyles(theme);

  const resumeScanning = () => {
    setCurrentBarcode(null);
    setIsPaused(false);
    setInstantMessage(null);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isPaused || !activeStoreId || !activeOrganizationId || !profile) return;

    setCurrentBarcode(data);
    setIsPaused(true);

    const shortcut = await getBarcodeShortcut(activeStoreId, data);

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
        <ScreenHeader title={t('scanner.title')} onBack={() => router.back()} />

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
              <Text style={styles.instructions}>{t('scanner.instructions')}</Text>
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
      </View>

      <ReturnFormSheet
        visible={formVisible}
        onClose={handleFormClosed}
        prefillTitle={prefillTitle}
        prefillBarcode={currentBarcode ?? ''}
        onCreated={handleCreated}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.md },
    permissionText: { color: theme.colors.textSecondary, textAlign: 'center' },
    cameraWrap: { flex: 1, borderRadius: theme.radius.lg, overflow: 'hidden' },
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
  });
}
