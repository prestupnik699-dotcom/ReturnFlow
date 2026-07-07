import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/validators/forgot-password.schema';
import { requestPasswordReset } from '@/features/auth/services/auth.service';
import { useTheme } from '@/theme/ThemeProvider';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitError(null);
    const result = await requestPasswordReset(values.email);

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    setSuccess(true);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>

      {success ? (
        <>
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{t('auth.forgotPassword.success')}</Text>
          </View>
          <Pressable style={styles.button} onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>{t('common.back')}</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.form}>
          <Text style={styles.instructions}>{t('auth.forgotPassword.instructions')}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.login.emailLabel')}</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder={t('auth.login.emailPlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    setSubmitError(null);
                  }}
                  onBlur={onBlur}
                />
              )}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{t(errors.email.message ?? '')}</Text>
            ) : null}
          </View>

          {submitError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (isSubmitting || pressed) && styles.buttonPressed,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.forgotPassword.submit')}</Text>
            )}
          </Pressable>
        </View>
      )}
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
      gap: theme.spacing.xl,
    },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    instructions: {
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
