import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'returnflow.biometricLockEnabled';

type BiometricLockState = {
  enabled: boolean;
  hydrated: boolean;
  init: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
};

// Device-local preference, deliberately not synced through the profile —
// whether THIS phone requires Face ID/Touch ID has nothing to do with the
// account itself, and syncing it would mean a lost/stolen phone stays
// unlocked until someone remembers to toggle it off from another device.
export const useBiometricLockStore = create<BiometricLockState>((set) => ({
  enabled: false,
  hydrated: false,
  init: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    set({ enabled: stored === 'true', hydrated: true });
  },
  setEnabled: async (enabled: boolean) => {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    set({ enabled });
  },
}));
