import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { processSyncQueue } from '@/lib/sync/syncProcessor';

export function useSyncOnReconnect(): void {
  const isConnected = useNetworkStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      processSyncQueue().catch((error) => {
        if (__DEV__) {
          console.error('Sync queue processing failed:', error);
        }
      });
    }
  }, [isConnected]);
}
