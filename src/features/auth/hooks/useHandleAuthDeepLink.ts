import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { establishRecoverySession } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

async function handleUrl(url: string | null) {
  if (!url || !url.includes('reset-password')) return;

  const result = await establishRecoverySession(url);

  if (result.success) {
    useAuthStore.getState().setSession(result.data);
    useAuthStore.getState().setPasswordRecovery(true);
  } else if (__DEV__) {
    console.error('Password recovery link failed:', result.error.message);
  }
}

// Mounted once at the root. Handles both a cold start (app opened directly
// via the link) and a warm start (app already running in the background).
export function useHandleAuthDeepLink(): void {
  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);
}
