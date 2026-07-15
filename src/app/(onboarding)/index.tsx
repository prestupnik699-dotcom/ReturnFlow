import { useState } from 'react';
import { CreateOrganizationScreen } from '@/features/organizations/screens/CreateOrganizationScreen';
import { OnboardingTourScreen } from '@/features/onboarding/screens/OnboardingTourScreen';
import { useMarkOnboardingSeen } from '@/features/onboarding/hooks/useMarkOnboardingSeen';
import { useAuthStore } from '@/stores/auth.store';

export default function OnboardingIndex() {
  const profile = useAuthStore((state) => state.profile);
  const markSeen = useMarkOnboardingSeen();
  // Local override so the tour disappears immediately after finishing,
  // without waiting for the profile to re-fetch from the server.
  const [dismissedLocally, setDismissedLocally] = useState(false);

  const shouldShowTour = profile && !profile.hasSeenOnboarding && !dismissedLocally;

  const handleFinish = () => {
    setDismissedLocally(true);
    markSeen();
  };

  if (shouldShowTour) {
    return <OnboardingTourScreen onFinish={handleFinish} />;
  }

  return <CreateOrganizationScreen />;
}
