import type { ReactNode } from 'react';
import {
  Pressable,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
};

// The layout-relevant `style` (e.g. flex: 1) goes on the outer Pressable
// itself, so it participates correctly in the parent row's flex layout —
// exactly like a plain Pressable would. The inner Animated.View carries
// only the scale transform, never layout, to avoid breaking sibling
// alignment (this exact mistake shifted the trash icon in Stores/Suppliers).
export function PressableScale({ children, onPress, onLongPress, style, hitSlop }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={hitSlop}
      style={style}
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 150 });
      }}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
