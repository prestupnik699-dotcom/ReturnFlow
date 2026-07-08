import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'suppliers.errors.nameTooShort'),
  contactName: z.string(),
  phone: z.string(),
  email: z.union([z.literal(''), z.string().email('suppliers.errors.emailInvalid')]),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>;
