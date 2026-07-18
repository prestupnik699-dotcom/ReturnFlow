import { useQuery } from '@tanstack/react-query';
import { fetchReturnQuantityBySupplier } from '@/features/returns/services/returns.service';
import { fetchDeliveryQuantityBySupplier } from '@/features/deliveries/services/deliveries.service';
import { useMembershipStore } from '@/stores/membership.store';

export type SupplierReliability = {
  deliveredQuantity: number;
  returnedQuantity: number;
  // Share of delivered units that came back as a return, in percent.
  // null when there's no delivery history yet to compute a rate against
  // — a supplier with zero deliveries logged isn't "0% defective", the
  // number simply doesn't exist yet.
  defectRatePercent: number | null;
};

export function useSupplierReliability() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['supplierReliability', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) throw new Error('No active organization');

      const [deliveredResult, returnedResult] = await Promise.all([
        fetchDeliveryQuantityBySupplier(activeOrganizationId),
        fetchReturnQuantityBySupplier(activeOrganizationId),
      ]);

      if (!deliveredResult.success) throw new Error(deliveredResult.error.message);
      if (!returnedResult.success) throw new Error(returnedResult.error.message);

      const supplierIds = new Set([
        ...Object.keys(deliveredResult.data),
        ...Object.keys(returnedResult.data),
      ]);

      const reliability: Record<string, SupplierReliability> = {};
      for (const supplierId of supplierIds) {
        const deliveredQuantity = deliveredResult.data[supplierId] ?? 0;
        const returnedQuantity = returnedResult.data[supplierId] ?? 0;
        reliability[supplierId] = {
          deliveredQuantity,
          returnedQuantity,
          defectRatePercent:
            deliveredQuantity > 0 ? (returnedQuantity / deliveredQuantity) * 100 : null,
        };
      }

      return reliability;
    },
    enabled: !!activeOrganizationId,
  });
}
