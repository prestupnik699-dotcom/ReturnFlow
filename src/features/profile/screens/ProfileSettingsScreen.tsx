import { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, Linking, Platform, Pressable } from 'react-native';
import { Text } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore, type AppLanguage } from '@/stores/language.store';
import { useThemeStore, type ThemeMode } from '@/stores/theme.store';
import { useBiometricLockStore } from '@/stores/biometricLock.store';
import { updateProfileSettings } from '@/features/auth/services/profile.service';
import { useDeleteAccount } from '@/features/profile/hooks/useDeleteAccount';
import { useUpdateProfilePhoto } from '@/features/profile/hooks/useUpdateProfilePhoto';

const LANGUAGES: AppLanguage[] = ['ka', 'en', 'ru'];
const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];
const PRIVACY_URL = 'https://prestupnik699-dotcom.github.io/returnflow-legal/';
const TERMS_URL = 'https://prestupnik699-dotcom.github.io/returnflow-legal/terms.html';

export function ProfileSettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const biometricEnabled = useBiometricLockStore((state) => state.enabled);
  const setBiometricEnabled = useBiometricLockStore((state) => state.setEnabled);
  const photoMutation = useUpdateProfilePhoto();
  const [bioAvailable, setBioAvailable] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState<string | null>(null);
  const deleteAccountMutation = useDeleteAccount();
  const styles = createStyles(theme);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBioAvailable(hasHardware && isEnrolled);
    })();
  }, []);

  const persist = async (nextLanguage: AppLanguage, nextMode: ThemeMode) => {
    if (!profile) return;
    setSaved(false);
    setSaveError(null);
    try {
      await updateProfileSettings(profile.id, { language: nextLanguage, theme: nextMode });
      setSaved(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (__DEV__) console.error('Failed to persist profile settings:', error);
      setSaveError(message);
    }
  };

  const handleLanguageChange = (lang: AppLanguage) => {
    setLanguage(lang);
    persist(lang, mode);
  };

  const handleModeChange = (nextMode: ThemeMode) => {
    setMode(nextMode);
    persist(language, nextMode);
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!value) {
      setBiometricEnabled(false);
      return;
    }
    // Confirm the person can actually authenticate before turning the
    // lock on — otherwise a failed sensor could lock them out of their
    // own app with no way back in.
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('profile.security.confirmPrompt'),
    });
    if (result.success) {
      setBiometricEnabled(true);
    }
  };

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            quality: 0.8,
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
          });

    if (!result.canceled && result.assets[0]) {
      photoMutation.mutate(result.assets[0].uri);
    }
  };

  const confirmDeleteAccount = () => {
    setBlockedInfo(null);
    deleteAccountMutation.mutate(undefined, {
      onError: (error) => {
        setDeleteConfirmVisible(false);
        const raw = (error?.message ?? '').trim();

        if (raw.startsWith('profile.deleteAccount.hasTeammates::')) {
          const orgName = raw.split('::')[1] ?? '';
          setBlockedInfo(t('profile.deleteAccount.hasTeammates', { org: orgName }));
        } else if (raw === 'profile.deleteAccount.networkError') {
          setBlockedInfo(t('profile.deleteAccount.networkError'));
        } else if (
          !raw ||
          raw === '{}' ||
          raw === '[object Object]' ||
          raw.startsWith('{') ||
          raw.startsWith('[')
        ) {
          setBlockedInfo(t('profile.deleteAccount.genericError'));
        } else {
          setBlockedInfo(raw);
        }
      },
    });
  };

  const themeLabels: Record<ThemeMode, string> = {
    light: t('profile.themeLight'),
    dark: t('profile.themeDark'),
    system: t('profile.themeSystem'),
  };

  const appVersion = Constants.expoConfig?.version ?? '—';
  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : '?';

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('profile.title')} />

        <View style={styles.avatarSection}>
          <Pressable
            style={styles.avatarWrap}
            onPress={() => pickPhoto('gallery')}
            onLongPress={() => pickPhoto('camera')}
          >
            {profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={14} color={theme.colors.onPrimary} />
            </View>
          </Pressable>
          <Text style={styles.avatarName}>
            {profile ? `${profile.firstName} ${profile.lastName}` : ''}
          </Text>
          <Text style={styles.avatarHint}>{t('profile.photoHint')}</Text>
          {photoMutation.isError ? (
            <Text style={styles.avatarErrorText}>{photoMutation.error.message}</Text>
          ) : null}
        </View>

        <Card>
          <View style={styles.cardField}>
            <Text style={styles.label}>{t('profile.languageLabel')}</Text>
            <View style={styles.row}>
              {LANGUAGES.map((lang) => (
                <Chip
                  key={lang}
                  label={lang.toUpperCase()}
                  selected={language === lang}
                  onPress={() => handleLanguageChange(lang)}
                />
              ))}
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.cardField}>
            <Text style={styles.label}>{t('profile.themeLabel')}</Text>
            <View style={styles.row}>
              {THEME_MODES.map((m) => (
                <Chip
                  key={m}
                  label={themeLabels[m]}
                  selected={mode === m}
                  onPress={() => handleModeChange(m)}
                />
              ))}
            </View>
          </View>
        </Card>

        {bioAvailable ? (
          <Card>
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.label}>{t('profile.security.title')}</Text>
                <Text style={styles.switchHint}>{t('profile.security.hint')}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor={Platform.OS === 'android' ? theme.colors.onPrimary : undefined}
              />
            </View>
          </Card>
        ) : null}

        {saveError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        ) : null}

        {saved ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{t('profile.saved')}</Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.cardField}>
            <Text style={styles.label}>{t('profile.about.title')}</Text>
            <Text style={styles.aboutRow}>
              {t('profile.about.version')}: {appVersion}
            </Text>
            <Text style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_URL)}>
              {t('profile.about.privacyPolicy')}
            </Text>
            <Text style={styles.linkRow} onPress={() => Linking.openURL(TERMS_URL)}>
              {t('profile.about.termsOfService')}
            </Text>
          </View>
        </Card>

        <Card>
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>{t('profile.deleteAccount.dangerZoneTitle')}</Text>
            <Button
              label={t('profile.deleteAccount.deleteAccountButton')}
              variant="danger"
              onPress={() => setDeleteConfirmVisible(true)}
              loading={deleteAccountMutation.isPending}
            />
            {blockedInfo ? <Text style={styles.blockedText}>{blockedInfo}</Text> : null}
          </View>
        </Card>
      </View>

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('profile.deleteAccount.deleteAccountConfirmTitle')}
        message={t('profile.deleteAccount.deleteAccountConfirmMessage')}
        confirmLabel={t('profile.deleteAccount.deleteAccountButton')}
        cancelLabel={t('organizations.settings.cancelButton')}
        destructive
        loading={deleteAccountMutation.isPending}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.md },
    avatarSection: { alignItems: 'center', gap: 4, paddingVertical: theme.spacing.md },
    avatarWrap: { position: 'relative' },
    avatarImage: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.surfaceVariant,
    },
    avatarPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      color: theme.colors.onPrimary,
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    avatarName: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.sm,
    },
    avatarHint: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    avatarErrorText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.danger,
      textAlign: 'center',
    },
    field: { gap: theme.spacing.sm },
    cardField: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    label: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    row: { flexDirection: 'row', gap: theme.spacing.sm },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
    },
    switchTextWrap: { flex: 1, gap: theme.spacing.xxs, marginRight: theme.spacing.md },
    switchHint: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
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
    aboutRow: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    linkRow: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeights.medium,
    },
    dangerZone: {
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    dangerZoneTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.danger,
    },
    blockedText: { fontSize: theme.fontSizes.sm, color: theme.colors.warning, lineHeight: 20 },
  });
}
