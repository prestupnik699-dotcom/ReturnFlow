import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { fetchCurrentProfile } from '@/features/auth/services/profile.service';

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setInitializing = useAuthStore((state) => state.setInitializing);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(session);

      if (session) {
        try {
          const profile = await fetchCurrentProfile();
          if (isMounted) setProfile(profile);
        } catch (error) {
          console.error('Failed to load profile:', error);
        }
      }

      if (isMounted) setInitializing(false);
    }

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session) {
        fetchCurrentProfile()
          .then((profile) => {
            if (isMounted) setProfile(profile);
          })
          .catch((error) => console.error('Failed to load profile:', error));
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setProfile, setInitializing]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
