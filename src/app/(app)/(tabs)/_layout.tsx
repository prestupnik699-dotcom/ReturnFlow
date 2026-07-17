import { Tabs } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { FloatingTabBar } from '@/components/FloatingTabBar';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="stores" />
      <Tabs.Screen name="suppliers" />
      <Tabs.Screen name="returns" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
