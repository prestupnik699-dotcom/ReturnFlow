import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import type { ChangePasswordFormValues } from '@/features/auth/validators/change-password.schema';

type Props = {
  control: Control<ChangePasswordFormValues>;
  errors: FieldErrors<ChangePasswordFormValues>;
  onChangeAny: () => void;
};

export function PasswordFields({ control, errors, onChangeAny }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <>
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
                onChangeAny();
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
                onChangeAny();
              }}
              onBlur={onBlur}
            />
          )}
        />
        {errors.confirmNewPassword ? (
          <Text style={styles.errorText}>{t(errors.confirmNewPassword.message ?? '')}</Text>
        ) : null}
      </View>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
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
  });
}
