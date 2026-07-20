import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/AppText';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  registerSchema,
  type RegisterFormValues,
} from '@/features/auth/validators/register.schema';
import { register } from '@/features/auth/services/auth.service';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';

export function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      invitationCode: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    const result = await register(values);

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    router.replace('/');
  };

  const styles = createStyles(theme);

  const fields: {
    name: keyof RegisterFormValues;
    labelKey: string;
    secure?: boolean;
    autoCapitalize?: 'none' | 'words';
    keyboardType?: 'default' | 'email-address';
  }[] = [
    { name: 'firstName', labelKey: 'auth.register.firstNameLabel', autoCapitalize: 'words' },
    { name: 'lastName', labelKey: 'auth.register.lastNameLabel', autoCapitalize: 'words' },
    { name: 'email', labelKey: 'auth.login.emailLabel', keyboardType: 'email-address' },
    { name: 'password', labelKey: 'auth.login.passwordLabel', secure: true },
    { name: 'confirmPassword', labelKey: 'auth.register.confirmPasswordLabel', secure: true },
    { name: 'invitationCode', labelKey: 'auth.register.invitationCodeLabel' },
  ];

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo size={56} />
            <Text style={styles.title}>{t('auth.register.title')}</Text>
          </View>

          <View style={styles.form}>
            {fields.map((field, index) => (
              <View style={styles.field} key={field.name}>
                <Text style={styles.label}>{t(field.labelKey)}</Text>
                <Controller
                  control={control}
                  name={field.name}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      style={[styles.input, errors[field.name] && styles.inputError]}
                      placeholderTextColor={theme.colors.textSecondary}
                      autoCapitalize={field.autoCapitalize ?? 'none'}
                      autoCorrect={false}
                      keyboardType={field.keyboardType ?? 'default'}
                      secureTextEntry={field.secure}
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        setSubmitError(null);
                      }}
                      onBlur={onBlur}
                      returnKeyType={index === fields.length - 1 ? 'done' : 'next'}
                      onSubmitEditing={
                        index === fields.length - 1
                          ? handleSubmit(onSubmit)
                          : () => inputRefs.current[index + 1]?.focus()
                      }
                      blurOnSubmit={index === fields.length - 1}
                    />
                  )}
                />
                {errors[field.name] ? (
                  <Text style={styles.errorText}>{t(errors[field.name]?.message ?? '')}</Text>
                ) : null}
              </View>
            ))}

            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            <Button
              label={t('auth.register.submit')}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              style={styles.submitButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.register.haveAccount')} </Text>
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={styles.footerLink}>{t('auth.register.logInLink')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingBottom: theme.spacing['2xl'],
    },
    header: { alignItems: 'center', marginBottom: theme.spacing['2xl'], gap: theme.spacing.sm },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      fontFamily: theme.fontFamily.display,
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
    submitButton: { marginTop: theme.spacing.sm },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.md },
    footerText: { color: theme.colors.textSecondary, fontSize: theme.fontSizes.sm },
    footerLink: {
      color: theme.colors.primary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
    },
  });
}
