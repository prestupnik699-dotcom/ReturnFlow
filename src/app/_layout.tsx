import '@/localization/i18n';
import '@/features/returns/sync/returnsSyncHandler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useSessionBootstrap } from '@/features/auth/hooks/useSessionBootstrap';
import { useSyncOnReconnect } from '@/hooks/useSyncOnReconnect';
import { useHandleAuthDeepLink } from '@/features/auth/hooks/useHandleAuthDeepLink';
import { usePushNotificationRegistration } from '@/features/notifications/hooks/usePushNotificationRegistration';
import { getDatabase } from '@/lib/database';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

getDatabase();

SplashScreen.preventAutoHideAsync();

// expo-notifications' remote-push functionality was removed from Expo Go
// entirely as of SDK 53 — even just calling setNotificationHandler() throws
// there. Everything notification-related is skipped in Expo Go and only
// runs in a real dev/production build.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  useSessionBootstrap();
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    if (!isInitializing) {
      SplashScreen.hideAsync();
    }
  }, [isInitializing]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ErrorBoundary>
              <RootNavigator />
            </ErrorBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  useSyncOnReconnect();
  useHandleAuthDeepLink();
  usePushNotificationRegistration();

  const session = useAuthStore((state) => state.session);
  const isPasswordRecovery = useAuthStore((state) => state.isPasswordRecovery);
  const memberships = useMembershipStore((state) => state.memberships);
  const hasOrganization = memberships.length > 0;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isPasswordRecovery}>
        <Stack.Screen name="(recovery)" />
      </Stack.Protected>
      <Stack.Protected guard={!isPasswordRecovery && !!session && hasOrganization}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isPasswordRecovery && !!session && !hasOrganization}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!isPasswordRecovery && !session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
