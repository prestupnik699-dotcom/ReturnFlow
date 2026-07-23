import { useEffect, useState } from 'react';
import { Modal, View, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import {
  createReturnSchema,
  type CreateReturnFormValues,
} from '@/features/returns/validators/create-return.schema';
import { useCreateReturn } from '@/features/returns/hooks/useCreateReturn';
import { useUpdateReturn } from '@/features/returns/hooks/useUpdateReturn';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useTitleSuggestions } from '@/features/returns/hooks/useTitleSuggestions';
import { useReasonSuggestions } from '@/features/returns/hooks/useReasonSuggestions';
import { useMembershipStore } from '@/stores/membership.store';
import { hapticSuccess, hapticSelection } from '@/lib/haptics';
import type { ReturnItem, ReturnPriority } from '@/features/returns/services/returns.service';

const PRIORITIES: ReturnPriority[] = ['low', 'normal', 'high', 'critical'];
const FREQUENT_CHIPS_LIMIT = 6;
const AUTOCOMPLETE_LIMIT = 5;
const FREQUENT_REASONS_LIMIT = 6;

type Props = {
  visible: boolean;
  onClose: () => void;
  returnItem?: ReturnItem | null;
  duplicateFrom?: ReturnItem | null;
  prefillTitle?: string;
  prefillBarcode?: string;
  onCreated?: (values: { supplierId: string; title: string }) => void;
};

export function ReturnFormSheet({
  visible,
  onClose,
  returnItem,
  duplicateFrom,
  prefillTitle,
  prefillBarcode,
  onCreated,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const { data: suppliers } = useSuppliers(false, 'name');
  const isEditing = !!returnItem;
  const createMutation = useCreateReturn(suppliers ?? []);
  const updateMutation = useUpdateReturn(returnItem?.id ?? '', returnItem?.status ?? 'pending');
  const mutation = isEditing ? updateMutation : createMutation;
  const [titleFocused, setTitleFocused] = useState(false);
  const styles = createStyles(theme);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateReturnFormValues>({
    resolver: zodResolver(createReturnSchema),
    defaultValues: {
      supplierId: '',
      title: '',
      quantity: '1',
      unitPrice: '',
      reason: '',
      priority: 'normal',
      barcode: '',
      isExchange: false,
    },
  });

  const priority = useWatch({ control, name: 'priority' });
  const supplierId = useWatch({ control, name: 'supplierId' });
  const titleValue = useWatch({ control, name: 'title' });
  const reasonValue = useWatch({ control, name: 'reason' });
  const isExchange = useWatch({ control, name: 'isExchange' });

  const { data: titleSuggestions } = useTitleSuggestions(activeStoreId, supplierId);
  const { data: reasonSuggestions } = useReasonSuggestions(activeStoreId, supplierId);

  const frequentChips = (titleSuggestions ?? []).slice(0, FREQUENT_CHIPS_LIMIT);
  const frequentReasons = (reasonSuggestions ?? []).slice(0, FREQUENT_REASONS_LIMIT);

  const query = titleValue.trim().toLowerCase();
  const autocompleteMatches =
    titleFocused && query.length > 0
      ? (titleSuggestions ?? [])
          .filter((s) => s.title.toLowerCase().includes(query) && s.title.toLowerCase() !== query)
          .slice(0, AUTOCOMPLETE_LIMIT)
      : [];

  // Picking a known title also carries over the price it last sold at —
  // only when the price field is still empty, so this never clobbers a
  // price the person already typed in manually for this entry.
  const applyTitleSuggestion = (suggestionTitle: string, lastUnitPrice: number | null) => {
    setValue('title', suggestionTitle);
    setTitleFocused(false);
    if (lastUnitPrice != null && !getValues('unitPrice')) {
      setValue('unitPrice', String(lastUnitPrice));
    }
  };

  useEffect(() => {
    if (visible) {
      const source = returnItem ?? duplicateFrom ?? null;
      reset({
        supplierId: source?.supplierId ?? '',
        title: source?.title ?? prefillTitle ?? '',
        quantity: source ? String(source.quantity) : '1',
        unitPrice: source?.unitPrice != null ? String(source.unitPrice) : '',
        reason: source?.reason ?? '',
        priority: source?.priority ?? 'normal',
        barcode: source?.barcode ?? prefillBarcode ?? '',
        isExchange: source?.isExchange ?? false,
      });
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, returnItem, duplicateFrom, prefillTitle, prefillBarcode]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (values: CreateReturnFormValues) => {
    mutation.mutate(values, {
      onSuccess: () => {
        hapticSuccess();
        if (!isEditing) {
          onCreated?.({ supplierId: values.supplierId, title: values.title });
        }
        handleClose();
      },
    });
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
        <Text style={styles.title}>
          {isEditing ? t('returns.edit.title') : t('returns.create.title')}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.supplierLabel')}</Text>
          <View style={styles.chipRow}>
            {(suppliers ?? []).map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                selected={supplierId === s.id}
                onPress={() => setValue('supplierId', s.id)}
              />
            ))}
          </View>
          {errors.supplierId ? (
            <Text style={styles.errorText}>{t(errors.supplierId.message ?? '')}</Text>
          ) : null}
        </View>

        {frequentChips.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('returns.create.frequentLabel')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.frequentChipRow}
            >
              {frequentChips.map((s) => (
                <Chip
                  key={s.title}
                  label={s.title}
                  selected={titleValue === s.title}
                  onPress={() => applyTitleSuggestion(s.title, s.lastUnitPrice)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

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
                onFocus={() => setTitleFocused(true)}
                onBlur={() => {
                  onBlur();
                  // Small delay so a tap on a suggestion row registers
                  // before the list disappears from the blur.
                  setTimeout(() => setTitleFocused(false), 150);
                }}
              />
            )}
          />
          {autocompleteMatches.length > 0 ? (
            <View style={styles.suggestionsBox}>
              {autocompleteMatches.map((s) => (
                <Pressable
                  key={s.title}
                  style={styles.suggestionRow}
                  onPress={() => applyTitleSuggestion(s.title, s.lastUnitPrice)}
                >
                  <Feather name="clock" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {s.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {errors.title ? (
            <Text style={styles.errorText}>{t(errors.title.message ?? '')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.quantityLabel')}</Text>
          <Controller
            control={control}
            name="quantity"
            render={({ field: { value, onChange, onBlur } }) => {
              const numeric = Math.max(0, parseInt(value, 10) || 0);
              return (
                <View style={[styles.stepperRow, errors.quantity && styles.inputError]}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => {
                      hapticSelection();
                      onChange(String(Math.max(1, numeric - 1)));
                    }}
                    hitSlop={8}
                  >
                    <Feather name="minus" size={18} color={theme.colors.primary} />
                  </Pressable>
                  <TextInput
                    style={styles.stepperInput}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => {
                      hapticSelection();
                      onChange(String(numeric + 1));
                    }}
                    hitSlop={8}
                  >
                    <Feather name="plus" size={18} color={theme.colors.primary} />
                  </Pressable>
                </View>
              );
            }}
          />
          {errors.quantity ? (
            <Text style={styles.errorText}>{t(errors.quantity.message ?? '')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.priceLabel')}</Text>
          <Controller
            control={control}
            name="unitPrice"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.unitPrice && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                placeholder={t('returns.create.pricePlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
              />
            )}
          />
          {errors.unitPrice ? (
            <Text style={styles.errorText}>{t(errors.unitPrice.message ?? '')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.barcodeLabel')}</Text>
          <Controller
            control={control}
            name="barcode"
            render={({ field: { value, onChange, onBlur } }) => (
              <View style={styles.barcodeRow}>
                <Ionicons name="barcode-outline" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.barcodeInput}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('returns.create.barcodePlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('returns.create.reasonLabel')}</Text>
          {frequentReasons.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.frequentChipRow}
            >
              {frequentReasons.map((r) => (
                <Chip
                  key={r.reason}
                  label={r.reason}
                  selected={reasonValue === r.reason}
                  onPress={() => setValue('reason', r.reason)}
                />
              ))}
            </ScrollView>
          ) : null}
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
              <Chip
                key={p}
                label={priorityLabels[p]}
                selected={priority === p}
                onPress={() => setValue('priority', p)}
              />
            ))}
          </View>
        </View>

        <Pressable
          style={styles.exchangeToggle}
          onPress={() => setValue('isExchange', !isExchange)}
        >
          <Feather
            name={isExchange ? 'check-square' : 'square'}
            size={22}
            color={isExchange ? theme.colors.primary : theme.colors.textSecondary}
          />
          <View style={styles.exchangeTextWrap}>
            <Text style={styles.exchangeLabel}>{t('returns.create.exchangeLabel')}</Text>
            <Text style={styles.exchangeHint}>{t('returns.create.exchangeHint')}</Text>
          </View>
        </Pressable>

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
            label={isEditing ? t('returns.edit.submit') : t('returns.create.submit')}
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
    container: { padding: theme.spacing.xl, gap: theme.spacing.lg },
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
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    stepperButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperInput: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.fontSizes.md,
      color: theme.colors.textPrimary,
      paddingVertical: theme.spacing.md,
    },
    suggestionsBox: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    suggestionText: { flex: 1, fontSize: theme.fontSizes.sm, color: theme.colors.textPrimary },
    barcodeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
    },
    barcodeInput: {
      flex: 1,
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
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    frequentChipRow: { flexDirection: 'row', gap: theme.spacing.sm },
    exchangeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    exchangeTextWrap: { flex: 1, gap: 2 },
    exchangeLabel: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    exchangeHint: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
    flexButton: { flex: 1 },
  });
}
