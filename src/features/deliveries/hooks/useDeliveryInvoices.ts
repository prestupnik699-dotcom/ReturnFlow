import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDeliveryInvoice,
  fetchDeliveryInvoices,
  deleteDeliveryInvoice,
  type CreateDeliveryInvoiceInput,
} from '@/features/deliveries/services/deliveryInvoices.service';
import { extractInvoicePhoto } from '@/features/deliveries/services/invoiceExtraction.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useDeliveryInvoices() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['deliveryInvoices', activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');
      const result = await fetchDeliveryInvoices(activeStoreId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeStoreId,
  });
}

// Photo recognition needs a live connection to reach the Edge Function —
// unlike quick catalog/order entries, this isn't queued for later when
// offline, since there'd be no useful moment to silently retry an OCR
// call the person is actively waiting on. If it fails, the person can
// still fill the form by hand.
export function useExtractInvoicePhoto() {
  return useMutation({
    mutationFn: async (localUri: string) => {
      const result = await extractInvoicePhoto(localUri);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useCreateDeliveryInvoice() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDeliveryInvoiceInput) => {
      const result = await createDeliveryInvoice(input);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryInvoices', activeStoreId] });
    },
  });
}

export function useDeleteDeliveryInvoice() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const result = await deleteDeliveryInvoice(invoiceId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryInvoices', activeStoreId] });
    },
  });
}
