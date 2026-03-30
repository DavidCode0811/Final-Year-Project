'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

export function useInactivityMonitor({
  onInactivityWarning,
  onInactivityTimeout,
  warningThreshold = 10000,
  timeoutThreshold = 25000,
  checkInterval = 10000,
  enabled = true
}) {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const [isWarning, setIsWarning] = useState(false);

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

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    intervalRef.current = setInterval(checkInactivity, checkInterval);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, updateActivity, checkInactivity, checkInterval]);

  return { isWarning, resetActivity: updateActivity };
}
