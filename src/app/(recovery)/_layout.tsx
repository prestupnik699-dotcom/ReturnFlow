import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecoveryLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
