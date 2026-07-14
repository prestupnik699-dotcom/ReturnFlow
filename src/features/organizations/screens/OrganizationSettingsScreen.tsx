import { useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useOrganization } from '@/features/organizations/hooks/useOrganization';
import { useUpdateOrganization } from '@/features/organizations/hooks/useUpdateOrganization';
import { useDeleteOrganization } from '@/features/organizations/hooks/useDeleteOrganization';
import {
  editOrganizationSchema,
  type EditOrganizationFormValues,
} from '@/features/organizations/validators/edit-organization.schema';

const LANGUAGES = ['ka', 'en', 'ru'] as const;

export function OrganizationSettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: organization, isLoading, isError } = useOrganization();
  const mutation = useUpdateOrganization();
  const deleteMutation = useDeleteOrganization();
  const [saved, setSaved] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const styles = createStyles(theme);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EditOrganizationFormValues>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues: { name: '', defaultLanguage: 'ka' },
  });

  useEffect(() => {
    if (organization) {
      const language = LANGUAGES.includes(
        organization.defaultLanguage as (typeof LANGUAGES)[number],
      )
        ? (organization.defaultLanguage as (typeof LANGUAGES)[number])
        : 'ka';
      reset({ name: organization.name, defaultLanguage: language });
    }
  }, [organization, reset]);

  const selectedLanguage = useWatch({ control, name: 'defaultLanguage' });

  const confirmDelete = () => {
    deleteMutation.mutate(undefined, { onSuccess: () => setDeleteConfirmVisible(false) });
  };

  const onSubmit = (values: EditOrganizationFormValues) => {
    setSaved(false);
    mutation.mutate(values, { onSuccess: () => setSaved(true) });
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError || !organization) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('organizations.settings.loadError')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('organizations.settings.title')} />

        <View style={styles.field}>
          <Text style={styles.label}>{t('organizations.nameLabel')}</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  setSaved(false);
                }}
                onBlur={onBlur}
                autoCapitalize="words"
              />
            )}
          />
          {errors.name ? (
            <Text style={styles.errorText}>{t(errors.name.message ?? '')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('organizations.settings.defaultLanguageLabel')}</Text>
          <View style={styles.chipRow}>
            {LANGUAGES.map((lang) => (
              <Chip
                key={lang}
                label={lang.toUpperCase()}
                selected={selectedLanguage === lang}
                onPress={() => {
                  setValue('defaultLanguage', lang);
                  setSaved(false);
                }}
              />
            ))}
          </View>
        </View>

        {mutation.isError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{mutation.error.message}</Text>
          </View>
        ) : null}

        {saved ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{t('organizations.settings.saved')}</Text>
          </View>
        ) : null}

        <Button
          label={t('organizations.settings.save')}
          onPress={handleSubmit(onSubmit)}
          loading={mutation.isPending}
        />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>{t('organizations.settings.dangerZoneTitle')}</Text>
          <Button
            label={t('organizations.settings.deleteButton')}
            variant="danger"
            onPress={() => setDeleteConfirmVisible(true)}
            loading={deleteMutation.isPending}
          />
          {deleteMutation.isError ? (
            <Text style={styles.errorText}>{deleteMutation.error.message}</Text>
          ) : null}
        </View>
      </View>

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('organizations.settings.deleteConfirmTitle')}
        message={t('organizations.settings.deleteConfirmMessage')}
        confirmLabel={t('organizations.settings.deleteConfirmButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.xl },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    field: { gap: theme.spacing.sm },
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
    errorText: { fontSize: theme.fontSizes.xs, color: theme.colors.danger, textAlign: 'center' },
    chipRow: { flexDirection: 'row', gap: theme.spacing.sm },
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
    successBanner: {
      backgroundColor: theme.colors.success + '15',
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
    },
    successText: { color: theme.colors.success, fontSize: theme.fontSizes.sm, textAlign: 'center' },
    dangerZone: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    dangerZoneTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.danger,
    },
  });
}
