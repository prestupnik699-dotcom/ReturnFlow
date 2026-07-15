import { create } from 'zustand';
import type { Membership } from '@/features/auth/services/membership.service';

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

export const useMembershipStore = create<MembershipState>((set) => ({
  memberships: [],
  activeOrganizationId: null,
  activeStoreId: null,
  membershipsLoaded: false,
  setMemberships: (memberships) => set({ memberships, membershipsLoaded: true }),
  setActiveContext: (activeOrganizationId, activeStoreId) =>
    set({ activeOrganizationId, activeStoreId }),
  reset: () =>
    set({
      memberships: [],
      activeOrganizationId: null,
      activeStoreId: null,
      membershipsLoaded: false,
    }),
}));
