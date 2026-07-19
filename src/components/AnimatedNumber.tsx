import { useEffect, useRef, useState } from 'react';
import type { TextStyle, StyleProp } from 'react-native';
import { Text } from '@/components/AppText';

type Props = {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
};

// Counts up from the previous value to the new one on every change —
// requestAnimationFrame + plain state, not Reanimated, since this is
// changing text content over time rather than a UI-thread transform.
export function AnimatedNumber({ value, duration = 600, style }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    let startTime: number | null = null;
    let raf: number;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <Text style={style}>{display}</Text>;
}
