import { useMutation } from '@tanstack/react-query';
import { deleteAccount } from '@/features/profile/services/account.service';
import { logout } from '@/features/auth/services/auth.service';

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const result = await deleteAccount();
      if (!result.success) throw new Error(result.error.message);
      await logout();
    },
  });
}
