import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { useChangePasswordForm } from '@/features/auth/hooks/useChangePasswordForm';
import { PasswordFields } from '@/features/auth/components/PasswordFields';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';

export function ResetPasswordScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  // The recovery session is now a real, permanent session with the new
  // password set — normal navigation takes over from here, so success
  // just clears the recovery flag instead of showing a confirmation state.
  const { control, errors, isSubmitting, submitError, clearError, submit } = useChangePasswordForm(
    () => useAuthStore.getState().setPasswordRecovery(false),
  );
  const styles = createStyles(theme);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Logo size={56} />
          <Text style={styles.title}>{t('auth.changePassword.title')}</Text>
        </View>

        <View style={styles.form}>
          <PasswordFields control={control} errors={errors} onChangeAny={clearError} />

          {submitError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
            </View>
          ) : null}

          <Button label={t('auth.changePassword.submit')} onPress={submit} loading={isSubmitting} />
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
