'use client';

import { useCallback, useRef } from 'react';

export function useAutoSubmit({ onSubmit, enabled = true }) {
  const hasSubmittedRef = useRef(false);

  const triggerAutoSubmit = useCallback(async (reason) => {
    if (!enabled || hasSubmittedRef.current) return;

    hasSubmittedRef.current = true;

    if (onSubmit) {
      try {
        await onSubmit(reason);
      } catch (error) {
        console.error('Auto-submit failed:', error);
      }
    }
  }, [enabled, onSubmit]);

  const resetSubmitFlag = useCallback(() => {
    hasSubmittedRef.current = false;
  }, []);

  return {
    triggerAutoSubmit,
    hasSubmitted: hasSubmittedRef.current,
    resetSubmitFlag
  };
}
