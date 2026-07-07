import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'auth.errors.emailRequired').email('auth.errors.emailInvalid'),
  password: z.string().min(6, 'auth.errors.passwordTooShort'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
