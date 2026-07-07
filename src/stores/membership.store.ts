import { create } from 'zustand';
import type { Membership } from '@/features/auth/services/membership.service';

type MembershipState = {
  memberships: Membership[];
  activeOrganizationId: string | null;
  activeStoreId: string | null;
  setMemberships: (memberships: Membership[]) => void;
  setActiveContext: (organizationId: string | null, storeId: string | null) => void;
  reset: () => void;
};

export const useMembershipStore = create<MembershipState>((set) => ({
  memberships: [],
  activeOrganizationId: null,
  activeStoreId: null,
  setMemberships: (memberships) => set({ memberships }),
  setActiveContext: (activeOrganizationId, activeStoreId) =>
    set({ activeOrganizationId, activeStoreId }),
  reset: () => set({ memberships: [], activeOrganizationId: null, activeStoreId: null }),
}));
