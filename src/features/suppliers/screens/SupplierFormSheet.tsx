import { useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import {
  createSupplierSchema,
  type CreateSupplierFormValues,
} from '@/features/suppliers/validators/create-supplier.schema';
import {
  useCreateSupplier,
  useUpdateSupplier,
} from '@/features/suppliers/hooks/useSupplierMutations';
import { useSupplier } from '@/features/suppliers/hooks/useSupplier';
import { hapticSuccess } from '@/lib/haptics';

type Props = { visible: boolean; onClose: () => void; supplierId: string | null };

export function SupplierFormSheet({ visible, onClose, supplierId }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: supplier } = useSupplier(supplierId);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const isEditing = !!supplierId;
  const mutation = isEditing ? updateMutation : createMutation;
  const styles = createStyles(theme);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: { name: '', contactName: '', phone: '', email: '' },
  });

  useEffect(() => {
    if (visible) {
      reset({
        name: supplier?.name ?? '',
        contactName: supplier?.contactName ?? '',
        phone: supplier?.phone ?? '',
        email: supplier?.email ?? '',
      });
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, supplier]);

  const onSubmit = (values: CreateSupplierFormValues) => {
    const onSaveSuccess = () => {
      hapticSuccess();
      onClose();
    };
    if (isEditing && supplierId) {
      updateMutation.mutate({ supplierId, input: values }, { onSuccess: onSaveSuccess });
    } else {
      createMutation.mutate(values, { onSuccess: onSaveSuccess });
    }
  };

  const fields: {
    name: keyof CreateSupplierFormValues;
    labelKey: string;
    keyboardType?: 'phone-pad' | 'email-address';
  }[] = [
    { name: 'name', labelKey: 'suppliers.create.nameLabel' },
    { name: 'contactName', labelKey: 'suppliers.create.contactNameLabel' },
    { name: 'phone', labelKey: 'suppliers.create.phoneLabel', keyboardType: 'phone-pad' },
    { name: 'email', labelKey: 'suppliers.create.emailLabel', keyboardType: 'email-address' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{isEditing ? supplier?.name : t('suppliers.create.title')}</Text>

        {fields.map((field) => (
          <View style={styles.field} key={field.name}>
            <Text style={styles.label}>{t(field.labelKey)}</Text>
            <Controller
              control={control}
              name={field.name}
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors[field.name] && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType={field.keyboardType ?? 'default'}
                  autoCapitalize={field.name === 'email' ? 'none' : 'words'}
                />
              )}
            />
            {errors[field.name] ? (
              <Text style={styles.errorText}>{t(errors[field.name]?.message ?? '')}</Text>
            ) : null}
          </View>
        ))}

        {mutation.isError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{mutation.error.message}</Text>
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
            label={t('suppliers.create.submit')}
            onPress={handleSubmit(onSubmit)}
            loading={mutation.isPending}
            style={styles.flexButton}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
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
  });
}
