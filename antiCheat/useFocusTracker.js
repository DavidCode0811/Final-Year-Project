'use client';

import { useEffect, useCallback } from 'react';

export function useFocusTracker({ onFocusLoss, onFocusGain, enabled = true }) {
  const handleBlur = useCallback(() => {
    if (enabled && onFocusLoss) {
      onFocusLoss();
    }
  }, [enabled, onFocusLoss]);

  const handleFocus = useCallback(() => {
    if (enabled && onFocusGain) {
      onFocusGain();
    }
  }, [enabled, onFocusGain]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, handleBlur, handleFocus]);
}
