import { useEffect, useState } from 'react';
import type { TextStyle, StyleProp } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@/components/AppText';

type Props = {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
};

// Built on the same Reanimated timing engine StatBar already uses
// successfully for its bar-width animation, instead of a hand-rolled
// requestAnimationFrame loop — bridges the animated value to React state
// via useAnimatedReaction + runOnJS so the displayed digits update as it
// counts.
export function AnimatedNumber({ value, duration = 600, style }: Props) {
  const [display, setDisplay] = useState(0);
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, animated]);

  useAnimatedReaction(
    () => Math.round(animated.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
  );

  return <Text style={style}>{display}</Text>;
}
