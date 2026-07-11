import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  createOrganizationSchema,
  type CreateOrganizationFormValues,
} from '@/features/organizations/validators/create-organization.schema';
import { useCreateOrganization } from '@/features/organizations/hooks/useCreateOrganization';
import { useTheme } from '@/theme/ThemeProvider';
import { Logo } from '@/components/Logo';
import { logout } from '@/features/auth/services/auth.service';

export function CreateOrganizationScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const mutation = useCreateOrganization();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = (values: CreateOrganizationFormValues) => {
    mutation.mutate({ name: values.name, defaultLanguage: i18n.language });
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Logo size={56} />
        <Text style={styles.title}>{t('organizations.title')}</Text>
        <Text style={styles.subtitle}>{t('organizations.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('organizations.nameLabel')}</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="words"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.name ? (
            <Text style={styles.errorText}>{t(errors.name.message ?? '')}</Text>
          ) : null}
        </View>

        {mutation.isError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{mutation.error.message}</Text>
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
            <Text style={styles.buttonText}>{t('organizations.submit')}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => logout()} style={styles.logoutLink}>
          <Text style={styles.logoutLinkText}>{t('common.logOut')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    header: { alignItems: 'center', marginBottom: theme.spacing['2xl'], gap: theme.spacing.sm },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    form: { gap: theme.spacing.md },
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
    logoutLink: { alignItems: 'center', marginTop: theme.spacing.sm },
    logoutLinkText: { color: theme.colors.textSecondary, fontSize: theme.fontSizes.sm },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    buttonPressed: { backgroundColor: theme.colors.primaryPressed },
    buttonText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.fontWeights.semiBold,
      fontSize: theme.fontSizes.md,
    },
  });
}
