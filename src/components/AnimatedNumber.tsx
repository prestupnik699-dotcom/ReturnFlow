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
import { useReduceMotion } from '@/hooks/useReduceMotion';

type Props = {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
};

// Built on the same Reanimated timing engine StatBar already uses
// successfully for its bar-width animation, instead of a hand-rolled
// requestAnimationFrame loop — bridges the animated value to React state
// via useAnimatedReaction + runOnJS so the displayed digits update as it
// counts. When the system's reduce-motion setting is on, duration
// collapses to 0 so the number simply jumps to its new value instead of
// counting up — same code path, just no perceived animation.
export function AnimatedNumber({ value, duration = 600, style }: Props) {
  const reduceMotion = useReduceMotion();
  const [display, setDisplay] = useState(0);
  const animated = useSharedValue(0);
  const effectiveDuration = reduceMotion ? 0 : duration;

  useEffect(() => {
    animated.value = withTiming(value, {
      duration: effectiveDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, effectiveDuration, animated]);

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
