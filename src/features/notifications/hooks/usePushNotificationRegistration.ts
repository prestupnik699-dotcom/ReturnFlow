import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { savePushToken } from '@/features/notifications/services/pushTokens.service';
import { useAuthStore } from '@/stores/auth.store';

async function registerForPushNotifications(profileId: string): Promise<void> {
  // Remote push was removed from Expo Go entirely as of SDK 53 — calling
  // any expo-notifications API here would throw. Only real dev/production
  // builds get this far.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  // Simulators/emulators never get a real push token.
  if (!Device.isDevice) return;

  // Populated automatically once `eas init` links this project.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await savePushToken(profileId, token, Platform.OS);
}

export function usePushNotificationRegistration(): void {
  const profile = useAuthStore((state) => state.profile);

  useEffect(() => {
    if (!profile) return;

    registerForPushNotifications(profile.id).catch((error) => {
      if (__DEV__) {
        console.warn('Push registration skipped:', error instanceof Error ? error.message : error);
      }
    });
  }, [profile]);
}
