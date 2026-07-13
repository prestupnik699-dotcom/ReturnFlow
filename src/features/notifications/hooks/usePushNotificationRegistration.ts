import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { savePushToken } from '@/features/notifications/services/pushTokens.service';
import { useAuthStore } from '@/stores/auth.store';

async function registerForPushNotifications(profileId: string): Promise<void> {
  // Must check BEFORE importing expo-notifications at all — the module
  // throws on import (not just on use) in Expo Go on SDK 53+.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  if (!Device.isDevice) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const Notifications = await import('expo-notifications');

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
