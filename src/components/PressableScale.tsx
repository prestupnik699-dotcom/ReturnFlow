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

// Same proven pattern as Button's own press animation — reused here instead
// of duplicated, so any list row can get the same tactile feedback.
export function PressableScale({ children, onPress, onLongPress, style, hitSlop }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={hitSlop}
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 150 });
      }}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}
