import '@/localization/i18n';
import '@/features/returns/sync/returnsSyncHandler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
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

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  });
}

Sentry.init({
  dsn: 'https://4cb9940165896ed563fc3a62a15cdfc3@o4511735756226560.ingest.us.sentry.io/4511735762124800',
  tracesSampleRate: 0.2,
  enableNativeFramesTracking: !isRunningInExpoGo(),
  debug: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
  useSessionBootstrap();
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    if (!isInitializing) {
      SplashScreen.hideAsync();
    }
  }, [isInitializing]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ErrorBoundary>
                <RootNavigator />
              </ErrorBoundary>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
});

function RootNavigator() {
  useSyncOnReconnect();
  useHandleAuthDeepLink();
  usePushNotificationRegistration();

  const session = useAuthStore((state) => state.session);
  const isPasswordRecovery = useAuthStore((state) => state.isPasswordRecovery);
  const memberships = useMembershipStore((state) => state.memberships);
  const membershipsLoaded = useMembershipStore((state) => state.membershipsLoaded);
  const hasOrganization = memberships.length > 0;

  // There IS a session, but we don't yet know whether it has any
  // organizations — wait rather than guess, to avoid flashing the
  // onboarding screen for a single frame before redirecting.
  if (session && !isPasswordRecovery && !membershipsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F141B',
        }}
      >
        <ActivityIndicator color="#6C5CE7" />
      </View>
    );
  }

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
