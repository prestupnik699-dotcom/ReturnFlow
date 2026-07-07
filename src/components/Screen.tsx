import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { children: ReactNode };

export function Screen({ children }: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[
          styles.content,
          { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1 },
});
