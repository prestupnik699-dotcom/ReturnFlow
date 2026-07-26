import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/stores/auth.store';

// A real file-based route is required here purely so expo-router has
// something to match for `returnflow://reset-password` — without it, the
// deep link hits expo-router's own "Unmatched Route" 404 before our
// useHandleAuthDeepLink listener (mounted globally in the root layout)
// gets a chance to matter. That listener still does the actual work of
// exchanging the recovery token for a session and flipping
// isPasswordRecovery; this screen just waits for that to land, then
// bounces back to the root so RootNavigator's guard-based Stack.Protected
// logic can take over and mount the (recovery) stack correctly.
export default function ResetPasswordBridge() {
  const theme = useTheme();
  const router = useRouter();
  const isPasswordRecovery = useAuthStore((state) => state.isPasswordRecovery);

  useEffect(() => {
    if (isPasswordRecovery) {
      router.replace('/');
    }
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
