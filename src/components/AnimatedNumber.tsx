import { useEffect, useRef, useState } from 'react';
import type { TextStyle, StyleProp } from 'react-native';
import { Text } from '@/components/AppText';

type Props = {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
};

// Always starts its very first count from 0 — the component typically
// only mounts once real data has already loaded, so counting from the
// previous *displayed* value (which would just be `value` itself on
// first render) meant the 0→N animation never actually played.
export function AnimatedNumber({ value, duration = 600, style }: Props) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

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
