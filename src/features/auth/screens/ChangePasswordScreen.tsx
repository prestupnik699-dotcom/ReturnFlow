import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useChangePasswordForm } from '@/features/auth/hooks/useChangePasswordForm';
import { PasswordFields } from '@/features/auth/components/PasswordFields';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';

export function ChangePasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [success, setSuccess] = useState(false);
  const { control, errors, isSubmitting, submitError, clearError, submit } = useChangePasswordForm(
    () => setSuccess(true),
  );
  const styles = createStyles(theme);

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('auth.changePassword.title')} />

        {success ? (
          <>
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{t('auth.changePassword.success')}</Text>
            </View>
            <Button label={t('common.back')} variant="outline" onPress={() => router.back()} />
          </>
        ) : (
          <View style={styles.form}>
            <PasswordFields control={control} errors={errors} onChangeAny={clearError} />

            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            <Button
              label={t('auth.changePassword.submit')}
              onPress={submit}
              loading={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.xl },
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
    successBanner: {
      backgroundColor: theme.colors.success + '15',
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
    },
    successText: { color: theme.colors.success, fontSize: theme.fontSizes.sm, textAlign: 'center' },
    submitButton: { marginTop: theme.spacing.sm },
  });
}
