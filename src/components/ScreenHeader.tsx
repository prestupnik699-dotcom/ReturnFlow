import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  title: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightPress?: () => void;
  // A second optional action, rendered to the left of rightIcon — added
  // for screens (like supplier catalog) that need two header actions
  // instead of one. Omitting it keeps every existing screen unchanged.
  secondaryRightIcon?: keyof typeof Feather.glyphMap;
  onSecondaryRightPress?: () => void;
};

export function ScreenHeader({
  title,
  onBack,
  rightIcon,
  onRightPress,
  secondaryRightIcon,
  onSecondaryRightPress,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={styles.header}>
      <Pressable onPress={handleBack} hitSlop={12} style={styles.iconButton}>
        <Feather name="chevron-left" size={22} color={theme.colors.textPrimary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {secondaryRightIcon && onSecondaryRightPress ? (
        <Pressable onPress={onSecondaryRightPress} hitSlop={12} style={styles.iconButton}>
          <Feather name={secondaryRightIcon} size={20} color={theme.colors.primary} />
        </Pressable>
      ) : null}
      {rightIcon && onRightPress ? (
        <Pressable onPress={onRightPress} hitSlop={12} style={styles.iconButton}>
          <Feather name={rightIcon} size={20} color={theme.colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      fontFamily: theme.fontFamily.display,
      color: theme.colors.textPrimary,
    },
    spacer: { width: 36 },
  });
}
