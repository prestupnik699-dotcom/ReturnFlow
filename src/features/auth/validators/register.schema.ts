import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'auth.errors.firstNameRequired'),
    lastName: z.string().min(1, 'auth.errors.lastNameRequired'),
    email: z.string().min(1, 'auth.errors.emailRequired').email('auth.errors.emailInvalid'),
    password: z.string().min(6, 'auth.errors.passwordTooShort'),
    confirmPassword: z.string().min(1, 'auth.errors.confirmPasswordRequired'),
    invitationCode: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.errors.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
