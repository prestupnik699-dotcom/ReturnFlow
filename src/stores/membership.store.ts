import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Membership } from '@/features/auth/services/membership.service';

const STORAGE_KEY = 'returnflow.activeStoreId';

type MembershipState = {
  memberships: Membership[];
  activeOrganizationId: string | null;
  activeStoreId: string | null;
  // Distinguishes "haven't checked yet" from "checked, there are none" —
  // without this, the router briefly guesses "no organization" during the
  // moment right after login/register while the real fetch is still in
  // flight, flashing the wrong screen for a frame (D-037).
  membershipsLoaded: boolean;
  setMemberships: (memberships: Membership[]) => void;
  setActiveContext: (organizationId: string | null, storeId: string | null) => void;
  reset: () => void;
};

// Persisted to survive both a fresh app launch and Android killing the
// process in the background (common on low-memory devices, which reads
// to the person as "it kicked me out of the store" mid-session even
// though it's really just a fresh cold start under the hood).
export const useMembershipStore = create<MembershipState>((set) => ({
  memberships: [],
  activeOrganizationId: null,
  activeStoreId: null,
  membershipsLoaded: false,
  setMemberships: (memberships) => set({ memberships, membershipsLoaded: true }),
  setActiveContext: (activeOrganizationId, activeStoreId) => {
    set({ activeOrganizationId, activeStoreId });
    if (activeStoreId) {
      AsyncStorage.setItem(STORAGE_KEY, activeStoreId).catch(() => {
        // Non-critical — worst case the next launch falls back to the
        // first membership in the list, same as before this feature.
      });
    }
  },
  reset: () =>
    set({
      memberships: [],
      activeOrganizationId: null,
      activeStoreId: null,
      membershipsLoaded: false,
    }),
}));

export async function getPersistedStoreId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
