import { useEffect } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

type BlockProps = { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> };

// A single pulsing rounded block — the basic unit skeleton screens are
// built from. Opacity-only pulse (not a shimmer sweep) since that's
// simpler and safer to get right without live visual testing.
function SkeletonBlock({ width = '100%', height = 14, style }: BlockProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.surfaceVariant,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// A skeleton shaped roughly like a list row card (avatar + two text
// lines) — used while Stores/Suppliers/Returns are loading, instead of a
// spinner that gives no sense of what's about to appear.
export function SkeletonListRow() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock width={40} height={40} style={styles.avatar} />
        <View style={styles.info}>
          <SkeletonBlock width="60%" height={15} />
          <SkeletonBlock width="40%" height={12} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <SkeletonBlock width={80} height={22} style={styles.pill} />
        <SkeletonBlock width={80} height={22} style={styles.pill} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatar: { borderRadius: theme.radius.full },
    info: { flex: 1, gap: theme.spacing.xs },
    statsRow: { flexDirection: 'row', gap: theme.spacing.xs },
    pill: { borderRadius: theme.radius.full },
  });
}
