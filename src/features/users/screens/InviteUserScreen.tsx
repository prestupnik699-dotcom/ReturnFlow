import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { useCreateInvitation } from '@/features/users/hooks/useCreateInvitation';
import type { MembershipRole } from '@/features/auth/services/membership.service';

const ROLES: MembershipRole[] = [
  'Owner',
  'Administrator',
  'StoreManager',
  'Receiver',
  'Employee',
  'Viewer',
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
    <View style={styles.container}>
      <Text style={styles.title}>{t('users.invite.title')}</Text>
      <Text style={styles.subtitle}>{t('users.invite.subtitle')}</Text>

      <View style={styles.roleGrid}>
        {ROLES.map((role) => (
          <Pressable
            key={role}
            onPress={() => setSelectedRole(role)}
            style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
          >
            <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
              {role}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (mutation.isPending || pressed) && styles.buttonPressed,
        ]}
        onPress={handleGenerate}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>{t('users.invite.generate')}</Text>
        )}
      </Pressable>

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
          <Pressable style={styles.copyButton} onPress={handleCopy}>
            <Text style={styles.copyButtonText}>
              {copied ? t('users.invite.copied') : t('users.invite.copy')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    roleChip: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    roleChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    roleChipText: { color: theme.colors.textPrimary, fontSize: theme.fontSizes.sm },
    roleChipTextActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
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
    codeCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    codeLabel: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    code: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.primary,
      letterSpacing: 2,
    },
    validFor: { fontSize: theme.fontSizes.xs, color: theme.colors.textSecondary },
    copyButton: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    copyButtonText: { color: theme.colors.textPrimary, fontWeight: theme.fontWeights.medium },
  });
}
