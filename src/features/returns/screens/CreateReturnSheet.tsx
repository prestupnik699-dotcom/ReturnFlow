import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import {
  createReturnSchema,
  type CreateReturnFormValues,
} from '@/features/returns/validators/create-return.schema';
import { useCreateReturn } from '@/features/returns/hooks/useCreateReturn';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import type { ReturnPriority } from '@/features/returns/services/returns.service';

const PRIORITIES: ReturnPriority[] = ['low', 'normal', 'high', 'critical'];

type Props = { visible: boolean; onClose: () => void };

export function CreateReturnSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: suppliers } = useSuppliers(false, 'name');
  const mutation = useCreateReturn();
  const styles = createStyles(theme);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateReturnFormValues>({
    resolver: zodResolver(createReturnSchema),
    defaultValues: { supplierId: '', title: '', quantity: '1', reason: '', priority: 'normal' },
  });

  const priority = useWatch({ control, name: 'priority' });

  const handleClose = () => {
    reset();
    setSelectedSupplierId('');
    mutation.reset();
    onClose();
  };

  const onSubmit = (values: CreateReturnFormValues) => {
    mutation.mutate(values, { onSuccess: handleClose });
  };

  const priorityLabels: Record<ReturnPriority, string> = {
    low: t('returns.priorityLow'),
    normal: t('returns.priorityNormal'),
    high: t('returns.priorityHigh'),
    critical: t('returns.priorityCritical'),
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('returns.create.title')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.supplierLabel')}</Text>
          <View style={styles.chipRow}>
            {(suppliers ?? []).map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSelectedSupplierId(s.id);
                  setValue('supplierId', s.id);
                }}
                style={[styles.chip, selectedSupplierId === s.id && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, selectedSupplierId === s.id && styles.chipTextActive]}
                >
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.supplierId ? (
            <Text style={styles.errorText}>{t(errors.supplierId.message ?? '')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.titleLabel')}</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.title ? (
            <Text style={styles.errorText}>{t(errors.title.message ?? '')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.quantityLabel')}</Text>
          <Controller
            control={control}
            name="quantity"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.quantity && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="number-pad"
              />
            )}
          />
          {errors.quantity ? (
            <Text style={styles.errorText}>{t(errors.quantity.message ?? '')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.reasonLabel')}</Text>
          <Controller
            control={control}
            name="reason"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
              />
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.priorityLabel')}</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                onPress={() => setValue('priority', p)}
                style={[styles.chip, priority === p && styles.chipActive]}
              >
                <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
                  {priorityLabels[p]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {mutation.isError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{mutation.error.message}</Text>
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
            label={t('returns.create.submit')}
            onPress={handleSubmit(onSubmit)}
            loading={mutation.isPending}
            style={styles.flexButton}
          />
        </View>
      </ScrollView>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: theme.colors.background },
    container: { padding: theme.spacing.xl, gap: theme.spacing.md },
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
      borderRadius: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.fontSizes.md,
      color: theme.colors.textPrimary,
    },
    inputError: { borderColor: theme.colors.danger },
    errorText: { fontSize: theme.fontSizes.xs, color: theme.colors.danger },
    errorBanner: {
      backgroundColor: theme.colors.danger + '15',
      borderRadius: 10,
      padding: theme.spacing.md,
    },
    errorBannerText: {
      color: theme.colors.danger,
      fontSize: theme.fontSizes.sm,
      textAlign: 'center',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    chipText: { color: theme.colors.textPrimary, fontSize: theme.fontSizes.sm },
    chipTextActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
    flexButton: { flex: 1 },
  });
}
