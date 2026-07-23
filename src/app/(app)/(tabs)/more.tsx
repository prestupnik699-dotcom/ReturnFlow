import { View, ScrollView, StyleSheet, Linking, Platform, Pressable, Image } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/features/auth/services/auth.service';
import { useTheme } from '@/theme/ThemeProvider';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount';
import { useChatUnreadCount } from '@/features/notifications/hooks/useChatUnreadCount';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { MenuRow } from '@/components/MenuRow';
import { RequireRole } from '@/components/RequireRole';

const SUPPORT_EMAIL = 'davitianihovo@gmail.com';

export default function More() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const tabBarClearance = useTabBarClearance();
  const unreadCount = useUnreadCount();
  const chatUnreadCount = useChatUnreadCount();
  const styles = createStyles(theme);

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : '?';

  const handleContactSupport = () => {
    const appVersion = Constants.expoConfig?.version ?? 'unknown';
    const body = [
      '',
      '',
      '---',
      `${t('support.appVersion')}: ${appVersion}`,
      `${t('support.platform')}: ${Platform.OS} ${Platform.Version}`,
      profile ? `${t('support.account')}: ${session?.user.email ?? ''}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('support.emailSubject'))}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{t('common.more')}</Text>

        <View style={styles.header}>
          <Pressable style={styles.avatar} onPress={() => router.push('/profile-settings')}>
            {profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.name}>
              {profile ? `${profile.firstName} ${profile.lastName}` : (session?.user.email ?? '')}
            </Text>
            {session?.user.email ? <Text style={styles.email}>{session.user.email}</Text> : null}
          </View>
        </View>

        <Card>
          <MenuRow
            icon="message-circle"
            label={t('chat.title')}
            onPress={() => router.push('/chat')}
            badgeCount={chatUnreadCount}
          />
          <MenuRow
            icon="bell"
            label={t('common.notifications')}
            onPress={() => router.push('/notifications')}
            badgeCount={unreadCount}
          />
        </Card>

        <Text style={styles.sectionLabel}>{t('common.account')}</Text>
        <Card>
          <MenuRow
            icon="bar-chart-2"
            label={t('statistics.title')}
            onPress={() => router.push('/statistics')}
          />
          <MenuRow
            icon="download"
            label={t('deliveries.title')}
            onPress={() => router.push('/deliveries')}
          />
          <MenuRow
            icon="user"
            label={t('profile.title')}
            onPress={() => router.push('/profile-settings')}
          />
          <MenuRow
            icon="key"
            label={t('auth.changePassword.title')}
            onPress={() => router.push('/change-password')}
          />
        </Card>

        <RequireRole roles={['Owner', 'StoreManager']}>
          <Text style={styles.sectionLabel}>{t('common.organization')}</Text>
          <Card>
            <MenuRow
              icon="user-plus"
              label={t('users.invite.title')}
              onPress={() => router.push('/invite-user')}
            />
            <MenuRow
              icon="users"
              label={t('users.team.title')}
              onPress={() => router.push('/team')}
            />
            <MenuRow
              icon="briefcase"
              label={t('organizations.settings.title')}
              onPress={() => router.push('/organization-settings')}
            />
          </Card>
        </RequireRole>

        <Text style={styles.sectionLabel}>{t('support.sectionLabel')}</Text>
        <Card>
          <MenuRow icon="mail" label={t('support.contactSupport')} onPress={handleContactSupport} />
        </Card>

        <Card>
          <MenuRow
            icon="log-out"
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
    container: { gap: theme.spacing.lg, paddingBottom: theme.spacing['2xl'] },
    pageTitle: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: 56, height: 56 },
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
