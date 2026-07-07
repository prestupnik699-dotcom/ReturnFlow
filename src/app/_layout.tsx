import '@/localization/i18n';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useSessionBootstrap } from '@/features/auth/hooks/useSessionBootstrap';

export default function RootLayout() {
  useSessionBootstrap();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
