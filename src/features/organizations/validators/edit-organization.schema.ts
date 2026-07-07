import { z } from 'zod';

export const editOrganizationSchema = z.object({
  name: z.string().min(2, 'organizations.errors.nameTooShort'),
  defaultLanguage: z.enum(['ka', 'en', 'ru']),
});

export type EditOrganizationFormValues = z.infer<typeof editOrganizationSchema>;
