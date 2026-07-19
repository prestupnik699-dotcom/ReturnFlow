import { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/validators/change-password.schema';
import { changePassword } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';

export function ResetPasswordScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError(null);
    const result = await changePassword(values.newPassword);

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    // The recovery session is now a real, permanent session with the new
    // password set — normal navigation takes over from here.
    useAuthStore.getState().setPasswordRecovery(false);
  };

  const styles = createStyles(theme);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Logo size={56} />
          <Text style={styles.title}>{t('auth.changePassword.title')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.changePassword.newPasswordLabel')}</Text>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.newPassword && styles.inputError]}
                  secureTextEntry
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    setSubmitError(null);
                  }}
                  onBlur={onBlur}
                />
              )}
            />
            {errors.newPassword ? (
              <Text style={styles.errorText}>{t(errors.newPassword.message ?? '')}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.changePassword.confirmNewPasswordLabel')}</Text>
            <Controller
              control={control}
              name="confirmNewPassword"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.confirmNewPassword && styles.inputError]}
                  secureTextEntry
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    setSubmitError(null);
                  }}
                  onBlur={onBlur}
                />
              )}
            />
            {errors.confirmNewPassword ? (
              <Text style={styles.errorText}>{t(errors.confirmNewPassword.message ?? '')}</Text>
            ) : null}
          </View>

          {submitError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}

          <Button
            label={t('auth.changePassword.submit')}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </View>
      </View>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: theme.spacing['2xl'], gap: theme.spacing.sm },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
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
