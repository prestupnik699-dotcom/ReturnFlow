import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="stores" />
      <Tabs.Screen name="suppliers" />
      <Tabs.Screen name="returns" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
