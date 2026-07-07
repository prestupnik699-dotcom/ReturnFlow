import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'organizations.errors.nameTooShort'),
});

export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;
