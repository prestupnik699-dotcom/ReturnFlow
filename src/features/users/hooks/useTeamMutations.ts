import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateMemberRole,
  removeMemberAccess,
  setMemberStatus,
  type ProfileStatus,
} from '@/features/users/services/team.service';
import { useMembershipStore } from '@/stores/membership.store';
import type { MembershipRole } from '@/features/auth/services/membership.service';

function useInvalidateTeam() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['team', activeOrganizationId] });
}

export function useUpdateMemberRole() {
  const invalidate = useInvalidateTeam();

  return useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: MembershipRole }) => {
      const result = await updateMemberRole(membershipId, role);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

export function useSetMemberStatus() {
  const invalidate = useInvalidateTeam();

  return useMutation({
    mutationFn: async ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: ProfileStatus;
    }) => {
      const result = await setMemberStatus(membershipId, status);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

export function useRemoveMemberAccess() {
  const invalidate = useInvalidateTeam();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const result = await removeMemberAccess(membershipId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}
