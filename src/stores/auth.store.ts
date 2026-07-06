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
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitializing: (value: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isInitializing: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  reset: () => set({ session: null, profile: null }),
}));
