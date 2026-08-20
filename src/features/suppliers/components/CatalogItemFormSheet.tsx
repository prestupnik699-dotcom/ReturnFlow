import { useEffect } from 'react';
import { Modal, View, TextInput, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import {
  useUpdateCatalogItem,
  useDeleteCatalogItem,
} from '@/features/suppliers/hooks/useCatalogMutations';
import { hapticSuccess, hapticError } from '@/lib/haptics';
import type { CatalogItem } from '@/features/suppliers/services/catalog.service';

type FormValues = { name: string; price: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  supplierId: string;
  item: CatalogItem | null;
  onRequestDelete: (item: CatalogItem) => void;
};

// Editing only — quick-adding new items happens directly on the catalog
// screen's persistent input row, not through this sheet. This form is
// reached by tapping an existing item to fix a typo or set a price.
export function CatalogItemFormSheet({
  visible,
  onClose,
  supplierId,
  item,
  onRequestDelete,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const updateMutation = useUpdateCatalogItem(supplierId, item?.id ?? '');
  const deleteMutation = useDeleteCatalogItem(supplierId);
  const styles = createStyles(theme);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: '', price: '' } });

  useEffect(() => {
    if (visible) {
      reset({
        name: item?.name ?? '',
        price: item?.defaultPrice != null ? String(item.defaultPrice) : '',
      });
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item]);

  const onSubmit = (values: FormValues) => {
    const name = values.name.trim();
    if (!name || !item) return;

    const priceParsed = values.price.trim() ? parseFloat(values.price.trim()) : null;
    const defaultPrice = priceParsed != null && !isNaN(priceParsed) ? priceParsed : null;

    updateMutation.mutate(
      { name, defaultPrice },
      {
        onSuccess: () => {
          hapticSuccess();
          onClose();
        },
        onError: () => hapticError(),
      },
    );
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('suppliers.catalog.editItemTitle')}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('suppliers.catalog.itemNameLabel')}</Text>
            <Controller
              control={control}
              name="name"
              rules={{ required: true }}
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="sentences"
                />
              )}
            />
            {errors.name ? (
              <Text style={styles.errorText}>{t('suppliers.catalog.itemNameRequired')}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('suppliers.catalog.itemPriceLabel')}</Text>
            <Controller
              control={control}
              name="price"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  placeholder={t('suppliers.catalog.itemPricePlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              )}
            />
          </View>

          {updateMutation.isError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{updateMutation.error.message}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={t('organizations.settings.cancelButton')}
              variant="outline"
              onPress={onClose}
              style={styles.flexButton}
            />
            <Button
              label={t('suppliers.catalog.saveItemButton')}
              onPress={handleSubmit(onSubmit)}
              loading={updateMutation.isPending}
              style={styles.flexButton}
            />
          </View>

          <Button
            label={t('suppliers.deleteAction')}
            variant="outline"
            onPress={() => {
              onRequestDelete(item);
              onClose();
            }}
            loading={deleteMutation.isPending}
            style={styles.deleteButton}
          />
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
    field: { gap: theme.spacing.xs },
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
    inputError: { borderColor: theme.colors.danger },
    errorText: { fontSize: theme.fontSizes.xs, color: theme.colors.danger },
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
    deleteButton: { marginTop: theme.spacing.sm, borderColor: theme.colors.danger },
  });
}
