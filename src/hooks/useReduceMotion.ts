import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Mirrors the useKeyboardVisible pattern: subscribe on mount, clean up on
// unmount. Read the initial value with isReduceMotionEnabled() so the
// first render already reflects the system setting instead of assuming
// "off" for one frame, then stay in sync via the change event.
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
