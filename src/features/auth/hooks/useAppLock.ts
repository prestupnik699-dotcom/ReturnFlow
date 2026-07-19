import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { useBiometricLockStore } from '@/stores/biometricLock.store';

export function useAppLock() {
  const enabled = useBiometricLockStore((state) => state.enabled);
  const hydrated = useBiometricLockStore((state) => state.hydrated);
  const { t } = useTranslation();
  // Starts false, meaning "locked" by default whenever enabled+hydrated —
  // no separate effect needed to set the initial locked state, it falls
  // out of this default naturally. Only flips true inside unlock() (a
  // user action) and back to false inside the AppState listener callback
  // below (a genuine external-event subscription) — both legitimate
  // places to call setState, unlike doing it directly in an effect body.
  const [unlockedSinceBackground, setUnlockedSinceBackground] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        setUnlockedSinceBackground(false);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [enabled]);

  const isLocked = enabled && hydrated && !unlockedSinceBackground;

  const unlock = async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('profile.security.unlockPrompt'),
    });
    if (result.success) {
      setUnlockedSinceBackground(true);
      return true;
    }
    return false;
  };

  return { isLocked, unlock };
}
