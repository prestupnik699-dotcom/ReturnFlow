import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'auth.errors.emailRequired').email('auth.errors.emailInvalid'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
