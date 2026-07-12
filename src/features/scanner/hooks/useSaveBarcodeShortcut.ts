import { useMutation } from '@tanstack/react-query';
import { saveBarcodeShortcut } from '@/features/scanner/services/barcodeShortcuts.service';

export function useSaveBarcodeShortcut() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof saveBarcodeShortcut>[0]) => {
      const result = await saveBarcodeShortcut(input);
      if (!result.success) throw new Error(result.error.message);
    },
  });
}
