import { useQuery } from '@tanstack/react-query';
import { fetchSuppliers, type SupplierSort } from '@/features/suppliers/services/suppliers.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useSuppliers(favoritesOnly: boolean, sort: SupplierSort) {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['suppliers', activeOrganizationId, favoritesOnly, sort],
    queryFn: async () => {
      if (!activeOrganizationId) throw new Error('No active organization');
      const result = await fetchSuppliers({
        organizationId: activeOrganizationId,
        favoritesOnly,
        sort,
      });
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}
