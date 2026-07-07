import { useMembershipStore } from '@/stores/membership.store';
import type { MembershipRole } from '@/features/auth/services/membership.service';

/**
 * Roles that apply to the user in the currently active organization/store
 * context. Org-wide memberships (storeId === null) always apply; store-scoped
 * memberships apply only when they match the active store.
 */
export function useActiveRoles(): MembershipRole[] {
  const memberships = useMembershipStore((state) => state.memberships);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  if (!activeOrganizationId) {
    return [];
  }

  return memberships
    .filter((membership) => membership.organizationId === activeOrganizationId)
    .filter((membership) => membership.storeId === null || membership.storeId === activeStoreId)
    .map((membership) => membership.role);
}

export function useHasRole(allowedRoles: MembershipRole[]): boolean {
  const activeRoles = useActiveRoles();
  return activeRoles.some((role) => allowedRoles.includes(role));
}
