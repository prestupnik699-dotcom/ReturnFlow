import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
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
      <Animated.View entering={ZoomIn.duration(400).springify()}>
        <LinearGradient
          colors={[theme.colors.accent + '2A', theme.colors.primary + '2A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name={icon} size={28} color={theme.colors.primary} />
        </LinearGradient>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Animated.View>
      {actionLabel && onAction ? (
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <Button label={actionLabel} icon="add" onPress={onAction} style={styles.actionButton} />
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
      width: 64,
      height: 64,
      borderRadius: theme.radius.full,
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
