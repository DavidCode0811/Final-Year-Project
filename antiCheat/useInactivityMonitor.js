'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

export function useInactivityMonitor({
  onInactivityWarning,
  onInactivityTimeout,
  warningThreshold = 30000,
  timeoutThreshold = 90000,
  checkInterval = 3000,
  enabled = true
}) {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const [isWarning, setIsWarning] = useState(false);
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarning(false);
  }, []);

  const checkInactivity = useCallback(() => {
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;

    if (timeSinceLastActivity >= timeoutThreshold) {
      if (onInactivityTimeout) {
        onInactivityTimeout();
      }
    } else if (timeSinceLastActivity >= warningThreshold && !isWarning) {
      setIsWarning(true);
      if (onInactivityWarning) {
        onInactivityWarning();
      }
    }
  }, [timeoutThreshold, warningThreshold, isWarning, onInactivityTimeout, onInactivityWarning]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click'];

    // Standard activity events
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Handle scroll with threshold to avoid false positives from tiny scrolls
    const handleScroll = () => {
      try {
        const y = window.scrollY || 0;
        const delta = Math.abs(y - (lastScrollYRef.current || 0));
        lastScrollYRef.current = y;

        // Only consider as activity if user scrolled a meaningful amount
        if (delta > 50) {
          updateActivity();
        }
      } catch (error) {
        // ignore
        updateActivity();
      }
    };

    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    intervalRef.current = setInterval(checkInactivity, checkInterval);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('scroll', handleScroll, { capture: true });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, updateActivity, checkInactivity, checkInterval]);

  return { isWarning, resetActivity: updateActivity };
}
