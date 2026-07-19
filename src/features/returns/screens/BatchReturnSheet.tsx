import { useRef, useState } from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/AppText';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useCreateReturnsBatch } from '@/features/returns/hooks/useCreateReturnsBatch';
import { useCreateDeliveriesBatch } from '@/features/deliveries/hooks/useCreateDeliveriesBatch';
import { lookupProductNameByBarcode } from '@/features/scanner/services/productLookup.service';
import { hapticSuccess } from '@/lib/haptics';

type Mode = 'return' | 'delivery';
type Line = { id: string; title: string; quantity: number; barcode: string };

type Props = { visible: boolean; onClose: () => void };

export function BatchReturnSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const { data: suppliers } = useSuppliers(false, 'name');
  const returnsBatchMutation = useCreateReturnsBatch();
  const deliveriesBatchMutation = useCreateDeliveriesBatch();
  const styles = createStyles(theme);

  const [mode, setMode] = useState<Mode>('return');
  const [supplierId, setSupplierId] = useState('');
  const [isExchange, setIsExchange] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [scanningActive, setScanningActive] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const scanLockRef = useRef(false);

  const batchMutation = mode === 'return' ? returnsBatchMutation : deliveriesBatchMutation;

  const reset = () => {
    setMode('return');
    setSupplierId('');
    setIsExchange(false);
    setLines([]);
    setScanningActive(false);
    setToastMessage(null);
    setTitleInput('');
    setBarcodeInput('');
    setQuantityInput('1');
    returnsBatchMutation.reset();
    deliveriesBatchMutation.reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleModeChange = (nextMode: Mode) => {
    // Switching mode mid-entry would silently reinterpret already-scanned
    // lines as the other direction (return vs receiving) — clearer to
    // just start the list over than risk that confusion.
    setMode(nextMode);
    setLines([]);
  };

  const addOrIncrementLine = (title: string, barcode: string, quantity = 1) => {
    setLines((prev) => {
      const existing = barcode ? prev.find((line) => line.barcode === barcode) : undefined;
      if (existing) {
        return prev.map((line) =>
          line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line,
        );
      }
      return [...prev, { id: `${Date.now()}-${Math.random()}`, title, quantity, barcode }];
    });
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    setIsLookingUp(true);
    const productName = await lookupProductNameByBarcode(data);
    setIsLookingUp(false);

    const title = productName ?? data;
    addOrIncrementLine(title, data, 1);
    setToastMessage(t('returns.batch.scanAdded', { title }));

    setTimeout(() => {
      scanLockRef.current = false;
      setToastMessage(null);
    }, 1200);
  };

  const addManualLine = () => {
    const title = titleInput.trim();
    if (!title) return;

    const quantity = Math.max(1, parseInt(quantityInput, 10) || 1);
    addOrIncrementLine(title, barcodeInput.trim(), quantity);
    setTitleInput('');
    setBarcodeInput('');
    setQuantityInput('1');
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const handleSaveAll = () => {
    if (!supplierId || lines.length === 0) return;

    const lineInputs = lines.map((line) => ({
      title: line.title,
      quantity: line.quantity,
      barcode: line.barcode,
    }));

    const onSaveSuccess = () => {
      hapticSuccess();
      handleClose();
    };

    if (mode === 'return') {
      returnsBatchMutation.mutate(
        { supplierId, isExchange, lines: lineInputs },
        { onSuccess: onSaveSuccess },
      );
    } else {
      const supplierName = suppliers?.find((s) => s.id === supplierId)?.name ?? '';
      deliveriesBatchMutation.mutate(
        { supplierId, supplierName, lines: lineInputs },
        { onSuccess: onSaveSuccess },
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {mode === 'return' ? t('returns.batch.title') : t('deliveries.batch.title')}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'return' ? t('returns.batch.subtitle') : t('deliveries.batch.subtitle')}
          </Text>

          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeButton, mode === 'return' && styles.modeButtonActive]}
              onPress={() => handleModeChange('return')}
            >
              <Text style={[styles.modeText, mode === 'return' && styles.modeTextActive]}>
                {t('returns.batch.modeReturn')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === 'delivery' && styles.modeButtonActive]}
              onPress={() => handleModeChange('delivery')}
            >
              <Text style={[styles.modeText, mode === 'delivery' && styles.modeTextActive]}>
                {t('returns.batch.modeDelivery')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('returns.create.supplierLabel')}</Text>
            <View style={styles.chipRow}>
              {(suppliers ?? []).map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  selected={supplierId === s.id}
                  onPress={() => setSupplierId(s.id)}
                />
              ))}
            </View>
          </View>

          {mode === 'return' ? (
            <Pressable style={styles.exchangeToggle} onPress={() => setIsExchange((v) => !v)}>
              <Ionicons
                name={isExchange ? 'checkbox' : 'square-outline'}
                size={22}
                color={isExchange ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={styles.exchangeLabel}>{t('returns.create.exchangeLabel')}</Text>
            </Pressable>
          ) : null}

          {supplierId ? (
            <View style={styles.field}>
              {!scanningActive ? (
                <Pressable style={styles.startScanButton} onPress={() => setScanningActive(true)}>
                  <Ionicons name="scan-outline" size={20} color={theme.colors.onPrimary} />
                  <Text style={styles.startScanText}>{t('deliveries.batch.startScan')}</Text>
                </Pressable>
              ) : !permission?.granted ? (
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
                  <View style={styles.cameraOverlay} pointerEvents="box-none">
                    <View style={styles.frame} />
                    <Pressable
                      style={styles.stopScanButton}
                      onPress={() => setScanningActive(false)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </Pressable>
                  </View>
                  {isLookingUp ? (
                    <View style={styles.cameraStatusOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : null}
                  {toastMessage ? (
                    <View style={styles.toast}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                      <Text style={styles.toastText} numberOfLines={1}>
                        {toastMessage}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>{t('returns.batch.addLineLabel')}</Text>
            <View style={styles.quickRow}>
              <TextInput
                style={[styles.quickInput, styles.quickTitle]}
                placeholder={t('returns.create.titleLabel')}
                placeholderTextColor={theme.colors.textSecondary}
                value={titleInput}
                onChangeText={setTitleInput}
                onSubmitEditing={addManualLine}
              />
              <TextInput
                style={[styles.quickInput, styles.quickBarcode]}
                placeholder={t('returns.batch.barcodeShort')}
                placeholderTextColor={theme.colors.textSecondary}
                value={barcodeInput}
                onChangeText={setBarcodeInput}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.quickInput, styles.quickQty]}
                value={quantityInput}
                onChangeText={setQuantityInput}
                keyboardType="number-pad"
              />
              <Pressable style={styles.addLineButton} onPress={addManualLine}>
                <Ionicons name="add" size={22} color={theme.colors.onPrimary} />
              </Pressable>
            </View>
          </View>

          {lines.length > 0 ? (
            <View style={styles.linesList}>
              {lines.map((line) => (
                <View key={line.id} style={styles.lineRow}>
                  <View style={styles.lineInfo}>
                    <Text style={styles.lineTitle}>{line.title}</Text>
                    <Text style={styles.lineMeta}>
                      {line.barcode ? `${line.barcode} · ` : ''}×{line.quantity}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeLine(line.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>{t('returns.batch.empty')}</Text>
          )}

          {batchMutation.isError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{batchMutation.error.message}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={t('organizations.settings.cancelButton')}
              variant="outline"
              onPress={handleClose}
              style={styles.flexButton}
            />
            <Button
              label={
                mode === 'return'
                  ? t('returns.batch.saveAll', { count: lines.length })
                  : t('deliveries.batch.saveAll', { count: lines.length })
              }
              onPress={handleSaveAll}
              loading={batchMutation.isPending}
              disabled={!supplierId || lines.length === 0}
              style={styles.flexButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scrollView: { flex: 1, backgroundColor: theme.colors.background },
    container: { padding: theme.spacing.xl, gap: theme.spacing.lg },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      marginTop: -theme.spacing.sm,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.full,
      padding: 4,
      gap: 4,
    },
    modeButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.full,
    },
    modeButtonActive: { backgroundColor: theme.colors.primary },
    modeText: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    modeTextActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
    field: { gap: theme.spacing.xs },
    label: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    exchangeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    exchangeLabel: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textPrimary,
    },
    startScanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
    },
    startScanText: {
      color: theme.colors.onPrimary,
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
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
      height: 240,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    camera: { flex: 1 },
    cameraOverlay: {
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
    toast: {
      position: 'absolute',
      bottom: theme.spacing.sm,
      left: theme.spacing.sm,
      right: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xsPlus,
      backgroundColor: 'rgba(0,0,0,0.75)',
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xsPlus,
    },
    toastText: { color: '#fff', fontSize: theme.fontSizes.xs, flex: 1 },
    quickRow: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' },
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
    quickTitle: { flex: 1.6 },
    quickBarcode: { flex: 1 },
    quickQty: { width: 44, textAlign: 'center' },
    addLineButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linesList: { gap: theme.spacing.xs },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    lineInfo: { flex: 1, gap: 2 },
    lineTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textPrimary,
    },
    lineMeta: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    emptyHint: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    errorBanner: {
      backgroundColor: theme.colors.danger + '15',
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
    },
    errorBannerText: {
      color: theme.colors.danger,
      fontSize: theme.fontSizes.sm,
      textAlign: 'center',
    },
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
    flexButton: { flex: 1 },
  });
}
