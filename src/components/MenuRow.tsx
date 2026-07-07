import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function MenuRow({ icon, label, onPress, tone = 'default' }: Props) {
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
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    pressed: { backgroundColor: theme.colors.surfaceVariant },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDanger: { backgroundColor: theme.colors.danger + '15' },
    label: { flex: 1, fontSize: theme.fontSizes.md, fontWeight: theme.fontWeights.medium },
  });
}
