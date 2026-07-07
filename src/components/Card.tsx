import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
  });

  return <View style={styles.card}>{children}</View>;
}
