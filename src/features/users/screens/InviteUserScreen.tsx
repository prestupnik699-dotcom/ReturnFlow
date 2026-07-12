import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useCreateInvitation } from '@/features/users/hooks/useCreateInvitation';
import type { MembershipRole } from '@/features/auth/services/membership.service';

const ROLES: MembershipRole[] = [
  'Employee',
  'Receiver',
  'Viewer',
  'StoreManager',
  'Administrator',
  'Owner',
];

export function InviteUserScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<MembershipRole>('Employee');
  const [copied, setCopied] = useState(false);
  const mutation = useCreateInvitation();
  const styles = createStyles(theme);

  const handleGenerate = () => {
    setCopied(false);
    mutation.mutate(selectedRole);
  };

  const handleCopy = async () => {
    if (!mutation.data) return;
    await Clipboard.setStringAsync(mutation.data.code);
    setCopied(true);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ScreenHeader title={t('users.invite.title')} />
        <Text style={styles.subtitle}>{t('users.invite.subtitle')}</Text>

        <View style={styles.roleGrid}>
          {ROLES.map((role) => (
            <Chip
              key={role}
              label={role}
              selected={selectedRole === role}
              onPress={() => setSelectedRole(role)}
            />
          ))}
        </View>

        <Button
          label={t('users.invite.generate')}
          onPress={handleGenerate}
          loading={mutation.isPending}
        />

        {mutation.isError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{mutation.error.message}</Text>
          </View>
        ) : null}

        {mutation.data ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>{t('users.invite.codeLabel')}</Text>
            <Text style={styles.code}>{mutation.data.code}</Text>
            <Text style={styles.validFor}>{t('users.invite.validFor')}</Text>
            <Button
              label={copied ? t('users.invite.copied') : t('users.invite.copy')}
              variant="outline"
              onPress={handleCopy}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, gap: theme.spacing.xl },
    subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
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
    codeCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    codeLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    code: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.primary,
      letterSpacing: 2,
    },
    validFor: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
  });
}
