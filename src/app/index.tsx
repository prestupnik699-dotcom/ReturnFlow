import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/features/auth/services/auth.service';

export default function Index() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    if (!isInitializing && !session) {
      router.replace('/login');
    }
  }, [isInitializing, session, router]);

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={styles.center}>
      <Text style={styles.text}>
        Logged in as {profile ? `${profile.firstName} ${profile.lastName}` : session.user.email}
      </Text>
      <Pressable style={styles.button} onPress={() => logout()}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  text: { fontSize: 16, textAlign: 'center' },
  button: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
