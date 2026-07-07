import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'stores.errors.nameTooShort'),
  city: z.string(),
  address: z.string(),
  phone: z.string(),
});

export type CreateStoreFormValues = z.infer<typeof createStoreSchema>;
