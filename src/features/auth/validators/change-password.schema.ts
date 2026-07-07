import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'auth.errors.passwordTooShort'),
    confirmNewPassword: z.string().min(1, 'auth.errors.confirmPasswordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'auth.errors.passwordsDoNotMatch',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
