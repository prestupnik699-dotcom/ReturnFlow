import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

type Props = {
  index: number;
  children: ReactNode;
  step?: number;
  duration?: number;
};

// Shared stagger wrapper for list rows across the app (Returns, Suppliers,
// Stores, Dashboard, Team, Notifications, Reminders, Deliveries) so the
// delay cap and reduce-motion behavior live in one place instead of being
// copy-pasted into every screen. Delay only applies to the first 10 rows —
// past that, a long list scrolling into view would otherwise keep
// re-triggering staggered delays that make scrolling feel laggy rather
// than snappy. Reduce-motion turns this into a plain render with no
// entering animation at all. step/duration default to the values used
// across most screens but stay overridable per-screen, since a couple of
// screens (Dashboard, Team) intentionally use a slightly different pace.
const STAGGER_CAP = 10;
const DEFAULT_STEP_MS = 50;
const DEFAULT_DURATION_MS = 250;

export function AnimatedListItem({
  index,
  children,
  step = DEFAULT_STEP_MS,
  duration = DEFAULT_DURATION_MS,
}: Props) {
  const reduceMotion = useReduceMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  const delay = Math.min(index, STAGGER_CAP) * step;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(duration)}>{children}</Animated.View>
  );
}
