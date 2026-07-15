import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export type Profile = {
  id: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  phone: string | null;
  language: string;
  theme: string;
  status: 'active' | 'vacation' | 'blocked';
  hasSeenOnboarding: boolean;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  // true only while the user arrived via a password-recovery link and
  // hasn't set a new password yet. Navigation must not treat this as a
  // normal logged-in session — Supabase's recovery link creates a real
  // session immediately, before the password is actually changed.
  isPasswordRecovery: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitializing: (value: boolean) => void;
  setPasswordRecovery: (value: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isInitializing: true,
  isPasswordRecovery: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  setPasswordRecovery: (isPasswordRecovery) => set({ isPasswordRecovery }),
  reset: () => set({ session: null, profile: null, isPasswordRecovery: false }),
}));
