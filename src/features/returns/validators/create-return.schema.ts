import { z } from 'zod';

export const createReturnSchema = z.object({
  supplierId: z.string().min(1, 'returns.errors.supplierRequired'),
  title: z.string().min(2, 'returns.errors.titleTooShort'),
  quantity: z
    .string()
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
      'returns.errors.quantityInvalid',
    ),
  reason: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  barcode: z.string(),
  isExchange: z.boolean(),
});

export type CreateReturnFormValues = z.infer<typeof createReturnSchema>;
