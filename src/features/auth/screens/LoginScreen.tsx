import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/AppText';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { loginSchema, type LoginFormValues } from '@/features/auth/validators/login.schema';
import { login } from '@/features/auth/services/auth.service';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';

export function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    const result = await login(values.email, values.password);

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    router.replace('/');
  };

  const styles = createStyles(theme);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Animated.View entering={ZoomIn.duration(500).springify()}>
              <Logo size={64} />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={styles.title}>
              {t('app.name')}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={styles.subtitle}>
              {t('auth.login.subtitle')}
            </Animated.Text>
          </View>

          <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.form}>
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
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                )}
              />
              {errors.email ? (
                <Text style={styles.errorText}>{t(errors.email.message ?? '')}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.login.passwordLabel')}</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.textSecondary}
                    secureTextEntry
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      setSubmitError(null);
                    }}
                    onBlur={onBlur}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
              {errors.password ? (
                <Text style={styles.errorText}>{t(errors.password.message ?? '')}</Text>
              ) : null}
            </View>

            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            <Button
              label={t('auth.login.submit')}
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              style={styles.submitButton}
            />

            <Pressable
              onPress={() => router.push('/forgot-password')}
              style={styles.forgotPasswordLink}
            >
              <Text style={styles.footerLink}>{t('auth.login.forgotPasswordLink')}</Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.login.noAccount')} </Text>
              <Pressable onPress={() => router.replace('/register')}>
                <Text style={styles.footerLink}>{t('auth.login.registerLink')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    header: { alignItems: 'center', marginBottom: theme.spacing['3xl'] },
    title: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      fontFamily: theme.fontFamily.display,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    form: { gap: theme.spacing.lg },
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
    forgotPasswordLink: { alignItems: 'center', marginTop: theme.spacing.sm },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.lg },
    footerText: { color: theme.colors.textSecondary, fontSize: theme.fontSizes.sm },
    footerLink: {
      color: theme.colors.primary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
    },
  });
}
