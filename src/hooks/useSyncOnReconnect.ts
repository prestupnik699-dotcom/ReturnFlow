import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { processSyncQueue } from '@/lib/sync/syncProcessor';
import { useSuccessOverlayStore } from '@/stores/successOverlay.store';

export function useSyncOnReconnect(): void {
  const isConnected = useNetworkStatus();
  const wasOffline = useRef(false);
  const queryClient = useQueryClient();
  const showSuccessOverlay = useSuccessOverlayStore((state) => state.show);

  useEffect(() => {
    if (!isConnected) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      processSyncQueue()
        .then((succeeded) => {
          queryClient.invalidateQueries({ queryKey: ['returns'] });
          // Only celebrate if there was actually something queued and it
          // synced successfully — reconnecting with an empty queue (e.g.
          // a brief network blip with nothing pending) shouldn't trigger
          // the same checkmark as "your offline work just saved".
          if (succeeded > 0) {
            showSuccessOverlay();
          }
        })
        .catch((error) => {
          if (__DEV__) {
            console.error('Sync queue processing failed:', error);
          }
        });
    }
  }, [isConnected, queryClient, showSuccessOverlay]);
}
