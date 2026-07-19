import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { hapticSelection } from '@/lib/haptics';

type Props = {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  onPress?: () => void;
};

export function StatBar({ label, value, maxValue, color, onPress }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const targetPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 4 : 0) : 0;
  const widthPercent = useSharedValue(0);

  useEffect(() => {
    widthPercent.value = withTiming(targetPercent, { duration: 700 });
  }, [targetPercent, widthPercent]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthPercent.value}%`,
  }));

  const handlePress = () => {
    if (!onPress) return;
    hapticSelection();
    onPress();
  };

  const content = (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
        {onPress ? (
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
        ) : null}
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { backgroundColor: color ?? theme.colors.primary }, animatedStyle]}
        />
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={handlePress} hitSlop={4}>
      {content}
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: { gap: 6 },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 4,
    },
    label: {
      flex: 1,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.sm,
    },
    value: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semiBold,
      color: theme.colors.textSecondary,
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceVariant,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 4 },
  });
}
