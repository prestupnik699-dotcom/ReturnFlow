import type { ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.shadow}>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    shadow: {
      borderRadius: theme.radius.lg,
      ...Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: theme.scheme === 'dark' ? 0.4 : 0.08,
          shadowRadius: 20,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
  });
}
