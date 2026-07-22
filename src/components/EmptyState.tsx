import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.iconWrap}>
        <Feather name={icon} size={28} color={theme.colors.primary} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Animated.View>
      {actionLabel && onAction ? (
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <Button label={actionLabel} icon="plus" onPress={onAction} style={styles.actionButton} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: theme.spacing['2xl'],
      gap: theme.spacing.md,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: { alignItems: 'center', gap: theme.spacing.xs },
    title: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textPrimary,
    },
    message: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    actionButton: { marginTop: theme.spacing.xs },
  });
}
