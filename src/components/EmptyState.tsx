import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/Button';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  // Skips the abstract gradient backdrop, back to a plain icon circle.
  simple?: boolean;
};

// A small abstract cluster of soft, overlapping circles in the brand
// gradient sits behind the icon — an illustration-flavored backdrop built
// from simple geometry (safe to predict without a live render) rather
// than freehand organic shapes.
function AbstractBackdrop({ primary, accent }: { primary: string; accent: string }) {
  return (
    <Svg width={128} height={128} viewBox="0 0 128 128" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="blobA" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={primary} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={primary} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blobB" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={accent} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={64} cy={64} r={62} fill="url(#blobA)" />
      <Circle cx={94} cy={38} r={26} fill="url(#blobB)" />
      <Circle cx={30} cy={92} r={20} fill="url(#blobA)" />
      <Circle cx={100} cy={96} r={4} fill={accent} opacity={0.5} />
      <Circle cx={22} cy={30} r={3} fill={primary} opacity={0.5} />
      <Circle cx={110} cy={64} r={3} fill={accent} opacity={0.4} />
    </Svg>
  );
}

export function EmptyState({ icon, title, message, actionLabel, onAction, simple }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {simple ? (
        <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.iconWrapPlain}>
          <Ionicons name={icon} size={28} color={theme.colors.primary} />
        </Animated.View>
      ) : (
        <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.iconStage}>
          <AbstractBackdrop primary={theme.colors.primary} accent={theme.colors.accent} />
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={26} color={theme.colors.primary} />
          </View>
        </Animated.View>
      )}
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
    iconStage: {
      width: 128,
      height: 128,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapPlain: {
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
