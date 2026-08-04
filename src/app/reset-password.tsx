import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/stores/auth.store';

// A real file-based route for the `returnflow://reset-password` deep link
// from the password-reset email. It exists purely so Expo Router has an
// actual match for that path — without it, the router shows its built-in
// "Unmatched Route" screen the instant the link opens, before
// useHandleAuthDeepLink (mounted at the root) has finished asynchronously
// exchanging the token and setting isPasswordRecovery. Once that flag
// flips, RootLayout's Stack.Protected guard is already set up to show the
// (recovery) group — this screen just needs to hand off to "/" so that
// guard takes over.
export default function ResetPasswordRoute() {
  const theme = useTheme();
  const router = useRouter();
  const isPasswordRecovery = useAuthStore((state) => state.isPasswordRecovery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isPasswordRecovery) {
      router.replace('/');
      return;
    }

    // The link may be invalid or expired, in which case isPasswordRecovery
    // never becomes true — without this, the person would be stuck on a
    // spinner forever instead of landing somewhere they can act from.
    timeoutRef.current = setTimeout(() => {
      router.replace('/login');
    }, 10000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPasswordRecovery, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
