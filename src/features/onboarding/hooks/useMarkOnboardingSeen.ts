import { markOnboardingSeen } from '@/features/auth/services/profile.service';
import { useAuthStore } from '@/stores/auth.store';

export function useMarkOnboardingSeen() {
  return async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return;

    // Update local state immediately so the tour disappears without
    // waiting on the network — the server write can finish in the
    // background.
    useAuthStore.getState().setProfile({ ...profile, hasSeenOnboarding: true });

    try {
      await markOnboardingSeen(profile.id);
    } catch (error) {
      if (__DEV__) console.error('Failed to persist onboarding-seen flag:', error);
    }
  };
}
