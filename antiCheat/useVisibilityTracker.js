'use client';

import { useEffect, useCallback } from 'react';

export function useVisibilityTracker({ onVisibilityChange, enabled = true }) {
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;

    const isHidden = document.visibilityState === 'hidden';

    if (onVisibilityChange) {
      onVisibilityChange(isHidden);
    }
  }, [enabled, onVisibilityChange]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleVisibilityChange]);
}
