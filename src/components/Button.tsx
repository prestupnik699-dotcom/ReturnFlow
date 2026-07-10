import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 150 });
      }}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Animated.View style={[styles.shadow, isDisabled && styles.disabled, animatedStyle, style]}>
        {variant === 'primary' ? (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.base}
          >
            {inner}
          </LinearGradient>
        ) : (
          <Animated.View style={styles.base}>{inner}</Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, variant: ButtonVariant) {
  return StyleSheet.create({
    shadow: {
      borderRadius: theme.radius.md,
      ...(variant === 'primary'
        ? Platform.select({
            ios: {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
            },
            android: { elevation: 6 },
            default: {},
          })
        : {}),
    },
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      minHeight: 52,
      backgroundColor: variant === 'outline' ? theme.colors.surface : 'transparent',
      borderWidth: variant === 'outline' || variant === 'danger' ? 1 : 0,
      borderColor: variant === 'danger' ? theme.colors.danger : theme.colors.border,
    },
    disabled: { opacity: 0.5 },
    icon: { marginRight: theme.spacing.xs },
    label: {
      fontWeight: theme.fontWeights.semiBold,
      fontSize: theme.fontSizes.md,
      letterSpacing: 0.2,
    },
  });
}
