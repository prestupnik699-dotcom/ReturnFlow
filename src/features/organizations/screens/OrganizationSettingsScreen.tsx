import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { useOrganization } from '@/features/organizations/hooks/useOrganization';
import { useUpdateOrganization } from '@/features/organizations/hooks/useUpdateOrganization';
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
  const [saved, setSaved] = useState(false);
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
          <Text style={styles.errorBannerText}>{t('organizations.settings.loadError')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t('organizations.settings.title')}</Text>

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
          <View style={styles.languageRow}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => {
                  setValue('defaultLanguage', lang);
                  setSaved(false);
                }}
                style={[styles.langChip, selectedLanguage === lang && styles.langChipActive]}
              >
                <Text
                  style={[
                    styles.langChipText,
                    selectedLanguage === lang && styles.langChipTextActive,
                  ]}
                >
                  {lang.toUpperCase()}
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

        {saved ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{t('organizations.settings.saved')}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (mutation.isPending || pressed) && styles.buttonPressed,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>{t('organizations.settings.save')}</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.lg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
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
    languageRow: { flexDirection: 'row', gap: theme.spacing.sm },
    langChip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    langChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    langChipText: { color: theme.colors.textPrimary, fontWeight: theme.fontWeights.medium },
    langChipTextActive: { color: theme.colors.onPrimary },
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
    successBanner: {
      backgroundColor: theme.colors.success + '15',
      borderRadius: 10,
      padding: theme.spacing.md,
    },
    successText: { color: theme.colors.success, fontSize: theme.fontSizes.sm, textAlign: 'center' },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    buttonPressed: { backgroundColor: theme.colors.primaryPressed },
    buttonText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.fontWeights.semiBold,
      fontSize: theme.fontSizes.md,
    },
  });
}
