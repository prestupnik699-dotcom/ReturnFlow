import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/features/auth/services/auth.service';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { MenuRow } from '@/components/MenuRow';
import { RequireRole } from '@/components/RequireRole';

export default function Index() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const styles = createStyles(theme);

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : '?';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>
              {profile ? `${profile.firstName} ${profile.lastName}` : (session?.user.email ?? '')}
            </Text>
            {session?.user.email ? <Text style={styles.email}>{session.user.email}</Text> : null}
          </View>
        </View>

        <Card>
          <MenuRow
            icon="repeat-outline"
            label={t('returns.title')}
            onPress={() => router.push('/returns')}
          />
          <MenuRow
            icon="cube-outline"
            label={t('suppliers.title')}
            onPress={() => router.push('/suppliers')}
          />
          <MenuRow
            icon="storefront-outline"
            label={t('stores.title')}
            onPress={() => router.push('/stores')}
          />
          <MenuRow
            icon="person-circle-outline"
            label={t('profile.title')}
            onPress={() => router.push('/profile-settings')}
          />
          <MenuRow
            icon="key-outline"
            label={t('auth.changePassword.title')}
            onPress={() => router.push('/change-password')}
          />
        </Card>

        <RequireRole roles={['Owner', 'Administrator']}>
          <Text style={styles.sectionLabel}>{t('common.organization')}</Text>
          <Card>
            <MenuRow
              icon="person-add-outline"
              label={t('users.invite.title')}
              onPress={() => router.push('/invite-user')}
            />
            <MenuRow
              icon="people-outline"
              label={t('users.team.title')}
              onPress={() => router.push('/team')}
            />
            <MenuRow
              icon="business-outline"
              label={t('organizations.settings.title')}
              onPress={() => router.push('/organization-settings')}
            />
          </Card>
        </RequireRole>

        <Card>
          <MenuRow
            icon="log-out-outline"
            label={t('common.logOut')}
            onPress={() => logout()}
            tone="danger"
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.onPrimary,
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
    },
    headerText: { flex: 1 },
    name: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    email: { fontSize: theme.fontSizes.sm, color: theme.colors.textSecondary },
    sectionLabel: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      marginTop: theme.spacing.sm,
      marginLeft: theme.spacing.xs,
    },
  });
}
