import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/validators/change-password.schema';
import { changePassword } from '@/features/auth/services/auth.service';

export function useChangePasswordForm(onSuccess: () => void) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError(null);
    const result = await changePassword(values.newPassword);

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    onSuccess();
  };

  const clearError = () => setSubmitError(null);

  return {
    control,
    errors,
    isSubmitting,
    submitError,
    clearError,
    submit: handleSubmit(onSubmit),
  };
}
