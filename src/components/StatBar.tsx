import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { label: string; value: number; maxValue: number; color?: string };

export function StatBar({ label, value, maxValue, color }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const widthPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 4 : 0) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${widthPercent}%`, backgroundColor: color ?? theme.colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: { gap: 6 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
