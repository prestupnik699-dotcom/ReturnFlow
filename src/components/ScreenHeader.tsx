import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { title: string; onBack?: () => void };

export function ScreenHeader({ title, onBack }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={styles.header}>
      <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
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
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    spacer: { width: 36 },
  });
}
