import { create } from 'zustand';

type SuccessOverlayState = {
  visible: boolean;
  show: () => void;
  hide: () => void;
};

// Ephemeral global trigger for the success checkmark overlay — deliberately
// not persisted (unlike biometricLock.store), since this is a one-shot
// "play this animation now" signal, not a durable preference. Rendered
// once at the root layout so it can play over whatever screen is on top
// (e.g. right as a form sheet closes) without being tied to any single
// screen's lifecycle.
export const useSuccessOverlayStore = create<SuccessOverlayState>((set) => ({
  visible: false,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));
