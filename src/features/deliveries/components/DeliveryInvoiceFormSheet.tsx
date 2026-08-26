import { useState } from 'react';
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
} from '@/features/deliveries/hooks/useDeliveryInvoices';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { hapticSuccess, hapticError } from '@/lib/haptics';

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
};

const EMPTY_FORM: FormValues = {
  invoiceNumber: '',
  distributorName: '',
  totalAmount: '',
  pageCount: '',
  itemCount: '',
};

// Three steps: pick/take the invoice photo, wait while it's recognized,
// then review and correct the extracted fields before saving. The photo
// stays purely local (never uploaded) until the person actually confirms
// save — see deliveryInvoices.service.ts for why the row is created
// before the photo is attached to it.
export function DeliveryInvoiceFormSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const extractMutation = useExtractInvoicePhoto();
  const createMutation = useCreateDeliveryInvoice();
  const styles = createStyles(theme);

  const [step, setStep] = useState<Step>('pickPhoto');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(true);

  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const resetAll = () => {
    setStep('pickPhoto');
    setPhotoUri(null);
    setHasSignature(true);
    reset(EMPTY_FORM);
    extractMutation.reset();
    createMutation.reset();
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const runExtraction = (uri: string) => {
    setPhotoUri(uri);
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

  const onSubmit = (values: FormValues) => {
    if (!profile || !activeOrganizationId || !activeStoreId) return;

    const invoiceNumber = values.invoiceNumber.trim();
    const distributorName = values.distributorName.trim();
    if (!invoiceNumber || !distributorName) return;

    const totalAmount = values.totalAmount.trim() ? parseFloat(values.totalAmount.trim()) : null;
    const pageCount = values.pageCount.trim() ? parseInt(values.pageCount.trim(), 10) : null;
    const itemCount = values.itemCount.trim() ? parseInt(values.itemCount.trim(), 10) : null;

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
        localPhotoUri: photoUri,
      },
      {
        onSuccess: () => {
          hapticSuccess();
          handleClose();
        },
        onError: () => hapticError(),
      },
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
          <Text style={styles.title}>{t('deliveries.invoice.formTitle')}</Text>

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
              {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : null}
              <Text style={styles.extractingText}>{t('deliveries.invoice.extracting')}</Text>
            </View>
          ) : null}

          {step === 'review' ? (
            <View style={styles.reviewWrap}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreviewSmall} />
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
                <Controller
                  control={control}
                  name="totalAmount"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="decimal-pad"
                    />
                  )}
                />
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
                  name={hasSignature ? 'check-square' : 'square'}
                  size={20}
                  color={hasSignature ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={styles.signatureLabel}>{t('deliveries.invoice.hasSignature')}</Text>
              </Pressable>

              {createMutation.isError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{createMutation.error.message}</Text>
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
                  loading={createMutation.isPending}
                  style={styles.flexButton}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
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
      height: 280,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
    },
    photoPreviewSmall: {
      width: '100%',
      height: 160,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
      marginBottom: theme.spacing.sm,
    },
    extractingText: {
      fontSize: theme.fontSizes.md,
      color: theme.colors.textSecondary,
    },
    reviewWrap: { gap: theme.spacing.lg },
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
    signatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
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
  });
}
