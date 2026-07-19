import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { label: string; selected?: boolean; onPress: () => void; disabled?: boolean };

export function Chip({ label, selected, onPress, disabled }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipActive, disabled && styles.chipDisabled]}
    >
      <Text style={[styles.text, selected && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    chip: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.smPlus,
    },
    chipActive: { backgroundColor: theme.colors.primary },
    chipDisabled: { opacity: 0.4 },
    text: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.medium,
    },
    textActive: { color: theme.colors.onPrimary, fontWeight: theme.fontWeights.semiBold },
  });
}
