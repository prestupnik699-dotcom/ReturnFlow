import { View, Text, TextInput, StyleSheet } from 'react-native';
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
import { Button } from '@/components/Button';
import { logout } from '@/features/auth/services/auth.service';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

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
        <Animated.View entering={ZoomIn.duration(500).springify()}>
          <Logo size={56} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={styles.title}>
          {t('organizations.title')}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={styles.subtitle}>
          {t('organizations.subtitle')}
        </Animated.Text>
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

        <Button
          label={t('organizations.submit')}
          onPress={handleSubmit(onSubmit)}
          loading={mutation.isPending}
        />
        <Button label={t('common.logOut')} variant="outline" onPress={() => logout()} />
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
  });
}
