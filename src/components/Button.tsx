import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from '@/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

type ButtonVariant = 'primary' | 'outline' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentColor =
    variant === 'primary'
      ? theme.colors.onPrimary
      : variant === 'danger'
        ? theme.colors.danger
        : theme.colors.textPrimary;

  const styles = createStyles(theme, variant);

  const inner = loading ? (
    <ActivityIndicator color={contentColor} />
  ) : (
    <>
      {icon ? <Ionicons name={icon} size={19} color={contentColor} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
    </>
  );

  // Reanimated's .value mutation pattern is intentional and correct here.
  // React Compiler doesn't yet recognize it and flags a false positive:
  // https://github.com/facebook/react/issues/34891
  return (
    <Pressable
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.96, { duration: 100 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 180 });
      }}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.pressable, style]}
    >
      <Animated.View style={[styles.shadow, isDisabled && styles.disabled, animatedStyle]}>
        {variant === 'primary' ? (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.base}
          >
            {inner}
          </LinearGradient>
        ) : (
          <View style={styles.base}>{inner}</View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, variant: ButtonVariant) {
  return StyleSheet.create({
    // alignSelf lives here, on the Pressable itself — the actual outermost
    // element — so the touchable area shrinks to content width and centers,
    // instead of stretching to fill the parent row like a full-width button.
    pressable: { alignSelf: 'center' },
    shadow: {
      borderRadius: theme.radius.full,
      ...(variant === 'primary'
        ? Platform.select({
            ios: {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: theme.scheme === 'dark' ? 0.55 : 0.3,
              shadowRadius: 22,
            },
            android: { elevation: 8 },
            default: {},
          })
        : {}),
    },
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 52,
      overflow: 'hidden',
      backgroundColor: variant === 'outline' ? theme.colors.surface : 'transparent',
      borderWidth: variant === 'outline' || variant === 'danger' ? 1 : 0,
      borderColor: variant === 'danger' ? theme.colors.danger : theme.colors.border,
    },
    disabled: { opacity: 0.5 },
    icon: { marginRight: theme.spacing.xs },
    label: {
      fontWeight: theme.fontWeights.semiBold,
      fontSize: theme.fontSizes.md,
      letterSpacing: 0.3,
    },
  });
}
