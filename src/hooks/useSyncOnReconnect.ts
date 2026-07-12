import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { processSyncQueue } from '@/lib/sync/syncProcessor';

export function useSyncOnReconnect(): void {
  const isConnected = useNetworkStatus();
  const wasOffline = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (__DEV__)
      console.log('[sync] network status changed:', isConnected, 'wasOffline:', wasOffline.current);

    if (!isConnected) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      if (__DEV__) console.log('[sync] reconnected, processing queue...');
      processSyncQueue()
        .then(() => {
          if (__DEV__) console.log('[sync] queue processed successfully');
          queryClient.invalidateQueries({ queryKey: ['returns'] });
        })
        .catch((error) => {
          if (__DEV__) console.error('[sync] queue processing failed:', error);
        });
    }
  }, [isConnected, queryClient]);
}
