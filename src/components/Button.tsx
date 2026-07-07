import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
        scale.value = withTiming(1, { duration: 150 });
      }}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Animated.View style={[styles.base, isDisabled && styles.disabled, animatedStyle, style]}>
        {loading ? (
          <ActivityIndicator color={contentColor} />
        ) : (
          <>
            {icon ? (
              <Ionicons name={icon} size={18} color={contentColor} style={styles.icon} />
            ) : null}
            <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, variant: ButtonVariant) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor:
        variant === 'primary'
          ? theme.colors.primary
          : variant === 'outline'
            ? theme.colors.surface
            : 'transparent',
      borderWidth: variant === 'primary' ? 0 : 1,
      borderColor: variant === 'danger' ? theme.colors.danger : theme.colors.border,
    },
    disabled: { opacity: 0.5 },
    icon: { marginRight: theme.spacing.xs },
    label: { fontWeight: theme.fontWeights.semiBold, fontSize: theme.fontSizes.md },
  });
}
