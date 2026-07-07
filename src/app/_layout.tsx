import '@/localization/i18n';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useSessionBootstrap } from '@/features/auth/hooks/useSessionBootstrap';
import { useSyncOnReconnect } from '@/hooks/useSyncOnReconnect';
import { getDatabase } from '@/lib/database';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { ErrorBoundary } from '@/components/ErrorBoundary';

getDatabase();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useSessionBootstrap();
  useSyncOnReconnect();
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    if (!isInitializing) {
      SplashScreen.hideAsync();
    }
  }, [isInitializing]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const session = useAuthStore((state) => state.session);
  const memberships = useMembershipStore((state) => state.memberships);
  const hasOrganization = memberships.length > 0;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session && hasOrganization}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !hasOrganization}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
