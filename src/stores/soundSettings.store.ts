import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'returnflow.scanSoundEnabled';

type SoundSettingsState = {
  enabled: boolean;
  hydrated: boolean;
  init: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
};

// Same device-local, AsyncStorage-persisted pattern as
// biometricLock.store — defaults to OFF so existing users aren't
// surprised by a sudden beep the next time they scan a barcode; someone
// has to opt in deliberately from Profile settings.
export const useSoundSettingsStore = create<SoundSettingsState>((set) => ({
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
