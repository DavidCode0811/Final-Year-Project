'use client';

import { useEffect, useCallback, useRef } from 'react';

export function useBroadcastChannel({
  channelName = 'exam_channel',
  onMultipleTabsDetected,
  enabled = true
}) {
  const channelRef = useRef(null);
  const isInitiatorRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.BroadcastChannel) {
      return;
    }

    try {
      channelRef.current = new BroadcastChannel(channelName);
      isInitiatorRef.current = true;

      channelRef.current.postMessage({ type: 'exam_active', timestamp: Date.now() });

      channelRef.current.onmessage = (event) => {
        if (event.data.type === 'exam_active' && !isInitiatorRef.current) {
          if (onMultipleTabsDetected) {
            onMultipleTabsDetected();
          }
        }

        if (event.data.type === 'exam_active' && isInitiatorRef.current) {
          channelRef.current.postMessage({ type: 'tab_exists', timestamp: Date.now() });
        }

        if (event.data.type === 'tab_exists') {
          if (onMultipleTabsDetected) {
            onMultipleTabsDetected();
          }
        }
      };

      return () => {
        if (channelRef.current) {
          channelRef.current.close();
        }
      };
    } catch (error) {
      console.error('BroadcastChannel not supported:', error);
    }
  }, [channelName, enabled, onMultipleTabsDetected]);
}
