import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/features/auth/services/auth.service';
import { useTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    if (!isInitializing && !session) {
      router.replace('/login');
    }
  }, [isInitializing, session, router]);

  if (isInitializing) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <Text style={{ fontSize: theme.fontSizes.md, color: theme.colors.textPrimary }}>
        {t('common.loggedInAs', {
          name: profile ? `${profile.firstName} ${profile.lastName}` : session.user.email,
        })}
      </Text>
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
