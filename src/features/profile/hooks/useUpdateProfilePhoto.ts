import { useMutation } from '@tanstack/react-query';
import { uploadProfilePhoto } from '@/features/auth/services/profile.service';
import { useAuthStore } from '@/stores/auth.store';

export function useUpdateProfilePhoto() {
  return useMutation({
    mutationFn: async (localUri: string) => {
      const profile = useAuthStore.getState().profile;
      if (!profile) throw new Error('No profile');
      const photoUrl = await uploadProfilePhoto(profile.id, profile.authUserId, localUri);
      return photoUrl;
    },
    onSuccess: (photoUrl) => {
      const profile = useAuthStore.getState().profile;
      if (!profile) return;
      useAuthStore.getState().setProfile({ ...profile, photoUrl });
    },
  });
}
