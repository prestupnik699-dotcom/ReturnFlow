import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useSuccessOverlayStore } from '@/stores/successOverlay.store';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Hand-measured path length for the checkmark stroke below (M25,55 L42,72
// L76,32) — used as the strokeDasharray so strokeDashoffset can animate
// the stroke drawing itself on, the same "wipe" technique used for
// progress rings, without pulling in Lottie or any SVG path-length
// library just to compute it at runtime.
const CHECK_PATH = 'M25,55 L42,72 L76,32';
const CHECK_LENGTH = 75;

const DRAW_DURATION = 400;
const HOLD_DURATION = 700;
const FADE_DURATION = 250;

export function SuccessCheckmark() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const visible = useSuccessOverlayStore((state) => state.visible);
  const hide = useSuccessOverlayStore((state) => state.hide);

  const backdropOpacity = useSharedValue(0);
  const circleScale = useSharedValue(0.6);
  const strokeOffset = useSharedValue(CHECK_LENGTH);

  useEffect(() => {
    if (!visible) return undefined;

    if (reduceMotion) {
      // Reduce motion: skip the draw-on entirely, just hold a fully-formed
      // checkmark briefly so the confirmation is still perceivable, then
      // dismiss without the fade/scale flourish.
      backdropOpacity.value = 1;
      circleScale.value = 1;
      strokeOffset.value = 0;
      const timer = setTimeout(() => runOnJS(hide)(), HOLD_DURATION);
      return () => clearTimeout(timer);
    }

    backdropOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(
        DRAW_DURATION + HOLD_DURATION,
        withTiming(0, { duration: FADE_DURATION }, (finished) => {
          if (finished) runOnJS(hide)();
        }),
      ),
    );
    circleScale.value = withTiming(1, {
      duration: DRAW_DURATION,
      easing: Easing.out(Easing.back(1.4)),
    });
    strokeOffset.value = withDelay(
      100,
      withTiming(0, { duration: DRAW_DURATION, easing: Easing.out(Easing.cubic) }),
    );

    return undefined;
  }, [visible, reduceMotion, backdropOpacity, circleScale, strokeOffset, hide]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: circleScale.value }] }));
  const animatedPathProps = useAnimatedProps(() => ({ strokeDashoffset: strokeOffset.value }));

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Animated.View style={circleStyle}>
        <Svg width={96} height={96} viewBox="0 0 100 100">
          <Circle
            cx={50}
            cy={50}
            r={46}
            fill={theme.colors.success}
            stroke={theme.colors.success}
            strokeWidth={2}
          />
          <AnimatedPath
            d={CHECK_PATH}
            fill="none"
            stroke="#fff"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={animatedPathProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
