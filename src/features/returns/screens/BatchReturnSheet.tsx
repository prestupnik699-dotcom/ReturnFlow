import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useCreateReturnsBatch } from '@/features/returns/hooks/useCreateReturnsBatch';

type Line = { id: string; title: string; quantity: string; barcode: string };

type Props = { visible: boolean; onClose: () => void };

export function BatchReturnSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: suppliers } = useSuppliers(false, 'name');
  const batchMutation = useCreateReturnsBatch();
  const styles = createStyles(theme);

  const [supplierId, setSupplierId] = useState('');
  const [isExchange, setIsExchange] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [titleInput, setTitleInput] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');

  const reset = () => {
    setSupplierId('');
    setIsExchange(false);
    setLines([]);
    setTitleInput('');
    setBarcodeInput('');
    setQuantityInput('1');
    batchMutation.reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addLine = () => {
    const title = titleInput.trim();
    if (!title) return;

    setLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        title,
        quantity: quantityInput.trim() || '1',
        barcode: barcodeInput.trim(),
      },
    ]);
    setTitleInput('');
    setBarcodeInput('');
    setQuantityInput('1');
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const handleSaveAll = () => {
    if (!supplierId || lines.length === 0) return;

    batchMutation.mutate(
      {
        supplierId,
        isExchange,
        lines: lines.map((line) => ({
          title: line.title,
          quantity: Math.max(1, parseInt(line.quantity, 10) || 1),
          barcode: line.barcode,
        })),
      },
      { onSuccess: handleClose },
    );
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
          <Text style={styles.title}>{t('returns.batch.title')}</Text>
          <Text style={styles.subtitle}>{t('returns.batch.subtitle')}</Text>

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

          <Pressable style={styles.exchangeToggle} onPress={() => setIsExchange((v) => !v)}>
            <Ionicons
              name={isExchange ? 'checkbox' : 'square-outline'}
              size={22}
              color={isExchange ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={styles.exchangeLabel}>{t('returns.create.exchangeLabel')}</Text>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>{t('returns.batch.addLineLabel')}</Text>
            <View style={styles.quickRow}>
              <TextInput
                style={[styles.quickInput, styles.quickTitle]}
                placeholder={t('returns.create.titleLabel')}
                placeholderTextColor={theme.colors.textSecondary}
                value={titleInput}
                onChangeText={setTitleInput}
                onSubmitEditing={addLine}
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
              <Pressable style={styles.addLineButton} onPress={addLine}>
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
              label={t('returns.batch.saveAll', { count: lines.length })}
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
      borderRadius: theme.radius.md,
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
