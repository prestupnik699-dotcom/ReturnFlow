import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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

  const contentColor =
    variant === 'primary'
      ? theme.colors.onPrimary
      : variant === 'danger'
        ? theme.colors.danger
        : theme.colors.textPrimary;

  const styles = createStyles(theme, variant);

  return (
    <Pressable
      style={({ pressed }) => [styles.base, (pressed || isDisabled) && styles.pressed, style]}
      onPress={onPress}
      disabled={isDisabled}
    >
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
    pressed: { opacity: 0.7 },
    icon: { marginRight: theme.spacing.xs },
    label: { fontWeight: theme.fontWeights.semiBold, fontSize: theme.fontSizes.md },
  });
}
