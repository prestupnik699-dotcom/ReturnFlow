import { useAudioPlayer } from 'expo-audio';
import { useSoundSettingsStore } from '@/stores/soundSettings.store';

const scanBeepSource = require('@/assets/sounds/scan-beep.wav');

// Mirrors the haptics.ts pattern: a thin, centralized wrapper so sound
// choices stay consistent and every call site doesn't have to check the
// settings toggle itself. useAudioPlayer must be called at the top level
// of a component (not conditionally), so this hook does that once and
// hands back a play function that's a no-op when the user has the sound
// setting off (default) — the same shape as the haptic helpers, just
// with the enabled-check baked in since sound (unlike haptics) is
// opt-in rather than always-on.
export function useScanBeep(): () => void {
  const enabled = useSoundSettingsStore((state) => state.enabled);
  const player = useAudioPlayer(scanBeepSource);

  return () => {
    if (!enabled) return;
    player.seekTo(0);
    player.play();
  };
}
