import { Pressable, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

// Floating circular action button — the "+" affordance used across
// list screens (Returns, Stores, Suppliers) per the design system.
// Kept separate from Button.tsx because Button is pill/full-width
// oriented (alignSelf: center, horizontal padding); a FAB is a fixed-size
// circle meant to be absolutely positioned by the caller via `style`.
export function FAB({ onPress, icon = 'add', style }: Props) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const styles = createStyles(theme);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Reanimated's .value mutation pattern is intentional and correct here.
  // React Compiler doesn't yet recognize it and flags a false positive:
  // https://github.com/facebook/react/issues/34891
  return (
    <Pressable
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.92, { duration: 100 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 180 });
      }}
      onPress={onPress}
      style={style}
      hitSlop={8}
    >
      <Animated.View style={[styles.shadow, animatedStyle]}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circle}
        >
          <Ionicons name={icon} size={26} color={theme.colors.onPrimary} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    shadow: {
      borderRadius: theme.radius.full,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme.scheme === 'dark' ? 0.55 : 0.3,
          shadowRadius: 16,
        },
        android: { elevation: 8 },
        default: {},
      }),
    },
    circle: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
