import { useEffect, useState } from 'react';
import { Modal, View, TextInput, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import {
  useExtractInvoicePhoto,
  useCreateDeliveryInvoice,
  useUpdateDeliveryInvoice,
} from '@/features/deliveries/hooks/useDeliveryInvoices';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { hapticSuccess, hapticError } from '@/lib/haptics';
import type { DeliveryInvoice } from '@/features/deliveries/services/deliveryInvoices.service';

type FormValues = {
  invoiceNumber: string;
  distributorName: string;
  totalAmount: string;
  pageCount: string;
  itemCount: string;
};

type Step = 'pickPhoto' | 'extracting' | 'review';

type Props = {
  visible: boolean;
  onClose: () => void;
  // Editing an existing entry skips the photo step entirely — see the
  // service layer comment on updateDeliveryInvoice for why photos
  // aren't editable after creation.
  existingInvoice?: DeliveryInvoice | null;
};

const EMPTY_FORM: FormValues = {
  invoiceNumber: '',
  distributorName: '',
  totalAmount: '',
  pageCount: '',
  itemCount: '',
};

// Create flow: pick/take photo(s) → wait while the first one is
// recognized → review and correct the extracted fields → save.
// Edit flow: skips straight to review, pre-filled from the existing row.
// Photos stay purely local (never uploaded) until the person confirms
// save — see deliveryInvoices.service.ts for why rows are created
// before photos are attached to them.
export function DeliveryInvoiceFormSheet({ visible, onClose, existingInvoice }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const extractMutation = useExtractInvoicePhoto();
  const createMutation = useCreateDeliveryInvoice();
  const updateMutation = useUpdateDeliveryInvoice(existingInvoice?.id ?? '');
  const styles = createStyles(theme);
  const isEditing = !!existingInvoice;
  const saveMutation = isEditing ? updateMutation : createMutation;

  const [step, setStep] = useState<Step>(isEditing ? 'review' : 'pickPhoto');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [hasSignature, setHasSignature] = useState(true);
  const [photoSourceSheetVisible, setPhotoSourceSheetVisible] = useState(false);

  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  // Re-sync whenever the sheet opens for a (possibly different) existing
  // invoice, or opens fresh for a new one. This intentionally
  // synchronizes local form state with the visible/existingInvoice props
  // whenever the sheet opens (or the target invoice changes) — the
  // standard reset-a-form-on-open pattern react-hook-form's own docs
  // recommend, not accidental state drift the lint rule is meant to catch.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!visible) return;
    if (existingInvoice) {
      setStep('review');
      setPhotoUris([]);
      setHasSignature(existingInvoice.hasSignature);
      reset({
        invoiceNumber: existingInvoice.invoiceNumber,
        distributorName: existingInvoice.distributorName,
        totalAmount: existingInvoice.totalAmount != null ? String(existingInvoice.totalAmount) : '',
        pageCount: existingInvoice.pageCount != null ? String(existingInvoice.pageCount) : '',
        itemCount: existingInvoice.itemCount != null ? String(existingInvoice.itemCount) : '',
      });
    } else {
      setStep('pickPhoto');
      setPhotoUris([]);
      setHasSignature(true);
      reset(EMPTY_FORM);
    }
    extractMutation.reset();
    createMutation.reset();
    updateMutation.reset();
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, existingInvoice]);

  const handleClose = () => {
    onClose();
  };

  const runExtraction = (uri: string) => {
    setPhotoUris([uri]);
    setStep('extracting');
    extractMutation.mutate(uri, {
      onSuccess: (extracted) => {
        reset({
          invoiceNumber: extracted.invoiceNumber ?? '',
          distributorName: extracted.distributorName ?? '',
          totalAmount: extracted.totalAmount != null ? String(extracted.totalAmount) : '',
          pageCount: extracted.pageCount != null ? String(extracted.pageCount) : '',
          itemCount: extracted.itemCount != null ? String(extracted.itemCount) : '',
        });
        setStep('review');
      },
      onError: () => {
        // Recognition failing isn't a dead end — drop straight into the
        // review form empty, so the person can still fill it in by hand
        // rather than being stuck unable to log the invoice at all.
        hapticError();
        setStep('review');
      },
    });
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) {
      runExtraction(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      runExtraction(result.assets[0].uri);
    }
  };

  // Adding page 2, 3, etc. — no re-extraction, these are attached purely
  // as supporting evidence alongside whatever the first photo already
  // gave us.
  const handleAddPageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setPhotoUris((prev) => [...prev, asset.uri]);
    }
  };

  const handleAddPageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      mediaTypes: ['images'],
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setPhotoUris((prev) => [...prev, asset.uri]);
    }
  };

  const handleAddPage = () => {
    setPhotoSourceSheetVisible(true);
  };

  const handleRemovePage = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (values: FormValues) => {
    const invoiceNumber = values.invoiceNumber.trim();
    const distributorName = values.distributorName.trim();
    if (!invoiceNumber || !distributorName) return;

    const totalAmount = values.totalAmount.trim() ? parseFloat(values.totalAmount.trim()) : null;
    const pageCount = values.pageCount.trim() ? parseInt(values.pageCount.trim(), 10) : null;
    const itemCount = values.itemCount.trim() ? parseInt(values.itemCount.trim(), 10) : null;

    const onSaveSuccess = () => {
      hapticSuccess();
      handleClose();
    };

    if (isEditing) {
      updateMutation.mutate(
        {
          invoiceNumber,
          distributorName,
          totalAmount: totalAmount != null && !isNaN(totalAmount) ? totalAmount : null,
          pageCount: pageCount != null && !isNaN(pageCount) ? pageCount : null,
          itemCount: itemCount != null && !isNaN(itemCount) ? itemCount : null,
          hasSignature,
        },
        { onSuccess: onSaveSuccess, onError: () => hapticError() },
      );
      return;
    }

    if (!profile || !activeOrganizationId || !activeStoreId) return;

    createMutation.mutate(
      {
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId: null,
        createdBy: profile.id,
        invoiceNumber,
        distributorName,
        totalAmount: totalAmount != null && !isNaN(totalAmount) ? totalAmount : null,
        pageCount: pageCount != null && !isNaN(pageCount) ? pageCount : null,
        itemCount: itemCount != null && !isNaN(itemCount) ? itemCount : null,
        hasSignature,
        localPhotoUris: photoUris,
      },
      { onSuccess: onSaveSuccess, onError: () => hapticError() },
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>
            {isEditing ? t('deliveries.invoice.editTitle') : t('deliveries.invoice.formTitle')}
          </Text>

          {step === 'pickPhoto' ? (
            <View style={styles.pickPhotoWrap}>
              <Text style={styles.pickPhotoHint}>{t('deliveries.invoice.pickPhotoHint')}</Text>
              <Button
                label={t('deliveries.invoice.takePhoto')}
                onPress={handleTakePhoto}
                style={styles.pickPhotoButton}
              />
              <Button
                label={t('deliveries.invoice.pickFromGallery')}
                variant="outline"
                onPress={handlePickFromGallery}
                style={styles.pickPhotoButton}
              />
              <Button
                label={t('deliveries.invoice.skipPhoto')}
                variant="outline"
                onPress={() => setStep('review')}
                style={styles.pickPhotoButton}
              />
            </View>
          ) : null}

          {step === 'extracting' ? (
            <View style={styles.extractingWrap}>
              {photoUris[0] ? (
                <Image source={{ uri: photoUris[0] }} style={styles.photoPreview} />
              ) : null}
              <Text style={styles.extractingText}>{t('deliveries.invoice.extracting')}</Text>
            </View>
          ) : null}

          {step === 'review' ? (
            <View style={styles.reviewWrap}>
              {photoUris.length > 0 ? (
                <View style={styles.pagesRow}>
                  {photoUris.map((uri, index) => (
                    <View key={uri} style={styles.pageThumbWrap}>
                      <Image source={{ uri }} style={styles.pageThumb} />
                      <View style={styles.pageBadge}>
                        <Text style={styles.pageBadgeText}>
                          {t('deliveries.invoice.pageBadge', { n: index + 1 })}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.pageRemoveButton}
                        onPress={() => handleRemovePage(index)}
                        hitSlop={8}
                      >
                        <Feather name="x" size={12} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.addPageButton} onPress={handleAddPage}>
                    <Feather name="plus" size={22} color={theme.colors.primary} />
                    <Text style={styles.addPageText}>{t('deliveries.invoice.addPage')}</Text>
                  </Pressable>
                </View>
              ) : !isEditing ? (
                <Pressable style={styles.addFirstPhotoButton} onPress={handleAddPage}>
                  <Feather name="camera" size={22} color={theme.colors.primary} />
                  <Text style={styles.addPageText}>{t('deliveries.invoice.takePhoto')}</Text>
                </Pressable>
              ) : null}

              {extractMutation.isError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>
                    {t('deliveries.invoice.extractionFailed')}
                  </Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>{t('deliveries.invoice.invoiceNumberLabel')}</Text>
                <Controller
                  control={control}
                  name="invoiceNumber"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('deliveries.invoice.distributorNameLabel')}</Text>
                <Controller
                  control={control}
                  name="distributorName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                    />
                  )}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('deliveries.invoice.totalAmountLabel')}</Text>
                <View style={styles.currencyInputWrap}>
                  <Controller
                    control={control}
                    name="totalAmount"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={[styles.input, styles.currencyInput]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="decimal-pad"
                      />
                    )}
                  />
                  <Text style={styles.currencySuffix}>₾</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>{t('deliveries.invoice.pageCountLabel')}</Text>
                  <Controller
                    control={control}
                    name="pageCount"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                      />
                    )}
                  />
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.label}>{t('deliveries.invoice.itemCountLabel')}</Text>
                  <Controller
                    control={control}
                    name="itemCount"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                      />
                    )}
                  />
                </View>
              </View>

              <Pressable
                style={styles.signatureRow}
                onPress={() => setHasSignature((current) => !current)}
              >
                <Feather
                  name={hasSignature ? 'check-circle' : 'circle'}
                  size={20}
                  color={hasSignature ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={styles.signatureLabel}>{t('deliveries.invoice.hasSignature')}</Text>
              </Pressable>

              {saveMutation.isError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{saveMutation.error.message}</Text>
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
                  label={t('deliveries.invoice.saveButton')}
                  onPress={handleSubmit(onSubmit)}
                  loading={saveMutation.isPending}
                  style={styles.flexButton}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={photoSourceSheetVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPhotoSourceSheetVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPhotoSourceSheetVisible(false)}>
          <Pressable style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>{t('deliveries.invoice.addPage')}</Text>
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setPhotoSourceSheetVisible(false);
                handleAddPageFromCamera();
              }}
            >
              <Feather name="camera" size={20} color={theme.colors.primary} />
              <Text style={styles.sheetOptionText}>{t('deliveries.invoice.takePhoto')}</Text>
            </Pressable>
            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setPhotoSourceSheetVisible(false);
                handleAddPageFromGallery();
              }}
            >
              <Feather name="image" size={20} color={theme.colors.primary} />
              <Text style={styles.sheetOptionText}>{t('deliveries.invoice.pickFromGallery')}</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setPhotoSourceSheetVisible(false)}>
              <Text style={styles.sheetCancelText}>{t('organizations.settings.cancelButton')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    container: {
      flexGrow: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    pickPhotoWrap: { gap: theme.spacing.md, alignItems: 'stretch' },
    pickPhotoHint: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    pickPhotoButton: { width: '100%' },
    extractingWrap: {
      alignItems: 'center',
      gap: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },
    photoPreview: {
      width: '100%',
      height: 420,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
    },
    extractingText: { fontSize: theme.fontSizes.md, color: theme.colors.textSecondary },
    reviewWrap: { gap: theme.spacing.lg },
    pagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    pageThumbWrap: { width: 96, height: 96, position: 'relative' },
    pageThumb: {
      width: 96,
      height: 96,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
    },
    pageBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: theme.colors.background + 'DD',
      borderRadius: theme.radius.full,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    pageBadgeText: {
      fontSize: 10,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    pageRemoveButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPageButton: {
      width: 96,
      height: 96,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    addFirstPhotoButton: {
      height: 96,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    addPageText: { fontSize: theme.fontSizes.xs, color: theme.colors.primary, textAlign: 'center' },
    field: { gap: theme.spacing.xs },
    row: { flexDirection: 'row', gap: theme.spacing.md },
    flex1: { flex: 1 },
    label: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.fontSizes.md,
      color: theme.colors.textPrimary,
    },
    currencyInputWrap: { position: 'relative', justifyContent: 'center' },
    currencyInput: { paddingRight: theme.spacing.xl },
    currencySuffix: {
      position: 'absolute',
      right: theme.spacing.md,
      fontSize: theme.fontSizes.md,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeights.medium,
    },
    signatureRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    signatureLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.textPrimary },
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
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
    flexButton: { flex: 1 },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheetCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    sheetTitle: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    sheetOptionText: { fontSize: theme.fontSizes.md, color: theme.colors.textPrimary },
    sheetCancel: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    sheetCancelText: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
  });
}
