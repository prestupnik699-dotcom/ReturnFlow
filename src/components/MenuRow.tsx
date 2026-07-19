import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  badgeCount?: number;
};

export function MenuRow({ icon, label, onPress, tone = 'default', badgeCount }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const labelColor = tone === 'danger' ? theme.colors.danger : theme.colors.textPrimary;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.iconWrap, tone === 'danger' && styles.iconWrapDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={tone === 'danger' ? theme.colors.danger : theme.colors.primary}
        />
      </View>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      {badgeCount ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
      {tone !== 'danger' ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    pressed: { backgroundColor: theme.colors.surfaceVariant },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDanger: { backgroundColor: theme.colors.danger + '18' },
    label: { flex: 1, fontSize: theme.fontSizes.md, fontWeight: theme.fontWeights.medium },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: theme.spacing.xsPlus,
      backgroundColor: theme.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#fff',
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.bold,
    },
  });
}
