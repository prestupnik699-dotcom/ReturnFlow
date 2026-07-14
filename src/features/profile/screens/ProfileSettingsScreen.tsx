import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore, type AppLanguage } from '@/stores/language.store';
import { useThemeStore, type ThemeMode } from '@/stores/theme.store';
import { updateProfileSettings } from '@/features/auth/services/profile.service';
import { useDeleteAccount } from '@/features/profile/hooks/useDeleteAccount';

const LANGUAGES: AppLanguage[] = ['ka', 'en', 'ru'];
const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

export function ProfileSettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState<string | null>(null);
  const deleteAccountMutation = useDeleteAccount();
  const styles = createStyles(theme);

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

  const confirmDeleteAccount = () => {
    setBlockedInfo(null);
    deleteAccountMutation.mutate(undefined, {
      onError: (error) => {
        setDeleteConfirmVisible(false);
        const message = error.message;
        if (message.startsWith('profile.deleteAccount.hasTeammates::')) {
          const orgName = message.split('::')[1] ?? '';
          setBlockedInfo(t('profile.deleteAccount.hasTeammates', { org: orgName }));
        } else {
          setBlockedInfo(message);
        }
      },
    });
  };

  const themeLabels: Record<ThemeMode, string> = {
    light: t('profile.themeLight'),
    dark: t('profile.themeDark'),
    system: t('profile.themeSystem'),
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('profile.title')} />

        <View style={styles.field}>
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

        <View style={styles.field}>
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

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>{t('profile.deleteAccount.dangerZoneTitle')}</Text>
          <Button
            label={t('profile.deleteAccount.deleteAccountButton')}
            variant="danger"
            onPress={() => setDeleteConfirmVisible(true)}
          />
          {blockedInfo ? <Text style={styles.blockedText}>{blockedInfo}</Text> : null}
        </View>
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
    container: { flex: 1, gap: theme.spacing.xl },
    field: { gap: theme.spacing.sm },
    label: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.textSecondary,
    },
    row: { flexDirection: 'row', gap: theme.spacing.sm },
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
    dangerZone: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    dangerZoneTitle: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.danger,
    },
    blockedText: { fontSize: theme.fontSizes.sm, color: theme.colors.warning, lineHeight: 20 },
  });
}
