import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/features/auth/services/auth.service';
import { useTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const theme = useTheme();
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <Text style={{ fontSize: theme.fontSizes.md, color: theme.colors.textPrimary }}>
        {t('common.loggedInAs', {
          name: profile ? `${profile.firstName} ${profile.lastName}` : (session?.user.email ?? ''),
        })}
      </Text>
      <Link href="/change-password" style={{ color: theme.colors.primary }}>
        {t('auth.changePassword.title')}
      </Link>
      <Pressable
        style={{
          backgroundColor: theme.colors.primary,
          borderRadius: 12,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
        }}
        onPress={() => logout()}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold }}>
          {t('common.logOut')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
});
