import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore, type Profile } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useLanguageStore, type AppLanguage } from '@/stores/language.store';
import { useThemeStore, type ThemeMode } from '@/stores/theme.store';
import { fetchCurrentProfile } from '@/features/auth/services/profile.service';
import { fetchMemberships } from '@/features/auth/services/membership.service';

const VALID_LANGUAGES: AppLanguage[] = ['ka', 'en', 'ru'];
const VALID_THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

async function bootstrapProfileContext(profile: Profile) {
  const memberships = await fetchMemberships(profile.id);
  useMembershipStore.getState().setMemberships(memberships);

  const first = memberships[0];
  useMembershipStore
    .getState()
    .setActiveContext(first?.organizationId ?? null, first?.storeId ?? null);

  if (VALID_LANGUAGES.includes(profile.language as AppLanguage)) {
    useLanguageStore.getState().setLanguage(profile.language as AppLanguage);
  }

  if (VALID_THEME_MODES.includes(profile.theme as ThemeMode)) {
    useThemeStore.getState().setMode(profile.theme as ThemeMode);
  }
}

export function useSessionBootstrap() {
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setInitializing = useAuthStore((state) => state.setInitializing);

  useEffect(() => {
    let isMounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (session) {
        fetchCurrentProfile()
          .then(async (profile) => {
            if (!isMounted) return;
            setProfile(profile);
            if (profile) await bootstrapProfileContext(profile);
          })
          .catch((error) => {
            console.error('Failed to load profile context:', error);
          })
          .finally(() => {
            if (isMounted && event === 'INITIAL_SESSION') setInitializing(false);
          });
      } else {
        setProfile(null);
        useMembershipStore.getState().reset();
        if (event === 'INITIAL_SESSION') setInitializing(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setProfile, setInitializing]);
}
