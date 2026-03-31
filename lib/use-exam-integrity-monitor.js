'use client';

import { useEffect, useRef, useState } from 'react';

import { getAttemptRemainingSeconds } from '@/lib/student-exam';

const ACTIVITY_CHECK_INTERVAL_MS = 10_000;
const INACTIVITY_WARNING_SECONDS = 30;
const INACTIVITY_AUTO_SUBMIT_SECONDS = 60;
const TAB_SWITCH_LIMIT = 2;

function createTabId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

export function useExamIntegrityMonitor({
  examId,
  attempt,
  durationMinutes,
  enabled,
  onAutoSubmit,
  onLogViolation,
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getAttemptRemainingSeconds(durationMinutes, attempt?.started_at)
  );
  const [warning, setWarning] = useState(null);
  const [violationCount, setViolationCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [inactivitySeconds, setInactivitySeconds] = useState(0);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const tabIdRef = useRef(createTabId());
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onLogViolationRef = useRef(onLogViolation);
  const lastActiveAtRef = useRef(Date.now());
  const inactivitySecondsRef = useRef(0);
  const inactivityWarnedRef = useRef(false);
  const violationCountRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const multipleTabsDetectedRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const pendingVisibilityWarningRef = useRef(null);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  useEffect(() => {
    onLogViolationRef.current = onLogViolation;
  }, [onLogViolation]);

  useEffect(() => {
    setRemainingSeconds(getAttemptRemainingSeconds(durationMinutes, attempt?.started_at));
  }, [attempt?.started_at, durationMinutes]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setWarning(null);
    setRemainingSeconds(getAttemptRemainingSeconds(durationMinutes, attempt?.started_at));
    setViolationCount(0);
    setTabSwitchCount(0);
    setInactivitySeconds(0);

    lastActiveAtRef.current = Date.now();
    inactivitySecondsRef.current = 0;
    inactivityWarnedRef.current = false;
    violationCountRef.current = 0;
    tabSwitchCountRef.current = 0;
    multipleTabsDetectedRef.current = false;
    autoSubmitTriggeredRef.current = false;
    pendingVisibilityWarningRef.current = null;
  }, [attempt?.id, attempt?.started_at, durationMinutes, enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateOnlineState = () => {
      setIsOffline(!window.navigator.onLine);
    };

    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);

    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  const dismissWarning = () => {
    setWarning((currentWarning) =>
      currentWarning?.blocking ? currentWarning : null
    );
  };

  const showWarning = (nextWarning) => {
    setWarning({
      tone: 'warning',
      blocking: false,
      ...nextWarning,
    });
  };

  const incrementViolationCount = () => {
    const nextValue = violationCountRef.current + 1;
    violationCountRef.current = nextValue;
    setViolationCount(nextValue);
    return nextValue;
  };

  const incrementTabSwitchCount = () => {
    const nextValue = tabSwitchCountRef.current + 1;
    tabSwitchCountRef.current = nextValue;
    setTabSwitchCount(nextValue);
    return nextValue;
  };

  const logViolation = async (eventType, metadata = {}) => {
    if (!enabled || !examId || !onLogViolationRef.current) {
      return;
    }

    try {
      await onLogViolationRef.current(eventType, metadata);
    } catch (error) {
      console.error(`Failed to log ${eventType}:`, error);
    }
  };

  const triggerAutoSubmit = async ({ reason, title, message, eventType, metadata = {} }) => {
    if (autoSubmitTriggeredRef.current) {
      return;
    }

    autoSubmitTriggeredRef.current = true;

    setWarning({
      title,
      message,
      tone: 'danger',
      blocking: true,
      violationCount: violationCountRef.current,
    });

    if (eventType) {
      await logViolation(eventType, {
        ...metadata,
        autoSubmitted: true,
        violationCount: violationCountRef.current,
      });
    }

    if (!onAutoSubmitRef.current) {
      return;
    }

    const submissionSucceeded = await onAutoSubmitRef.current({ reason });

    if (!submissionSucceeded) {
      autoSubmitTriggeredRef.current = false;
    }
  };

  useEffect(() => {
    if (!enabled || !attempt?.started_at || !durationMinutes) {
      return undefined;
    }

    const syncRemainingTime = () => {
      const nextRemainingSeconds = getAttemptRemainingSeconds(
        durationMinutes,
        attempt.started_at
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds <= 0) {
        void triggerAutoSubmit({
          reason: 'timer_elapsed',
          title: 'Time is up',
          message: 'The exam timer has expired. Your exam is being submitted now.',
          metadata: {
            attemptId: attempt.id,
          },
        });
      }
    };

    syncRemainingTime();
    const intervalId = window.setInterval(syncRemainingTime, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [attempt?.id, attempt?.started_at, durationMinutes, enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    const markActivity = () => {
      lastActiveAtRef.current = Date.now();

      if (inactivitySecondsRef.current > 0) {
        inactivitySecondsRef.current = 0;
        setInactivitySeconds(0);
      }

      if (inactivityWarnedRef.current) {
        inactivityWarnedRef.current = false;
        setWarning((currentWarning) =>
          currentWarning?.type === 'inactive' ? null : currentWarning
        );
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const evaluateInactivity = () => {
      const nextInactivitySeconds = Math.floor((Date.now() - lastActiveAtRef.current) / 1000);

      inactivitySecondsRef.current = nextInactivitySeconds;
      setInactivitySeconds(nextInactivitySeconds);

      if (nextInactivitySeconds >= INACTIVITY_AUTO_SUBMIT_SECONDS) {
        void triggerAutoSubmit({
          reason: 'inactive',
          title: 'Exam auto-submitting',
          message:
            'You have been inactive for more than 60 seconds. Your exam is being submitted now.',
          eventType: 'inactive',
          metadata: {
            inactivitySeconds: nextInactivitySeconds,
            attemptId: attempt?.id,
          },
        });
        return;
      }

      if (
        nextInactivitySeconds >= INACTIVITY_WARNING_SECONDS &&
        !inactivityWarnedRef.current
      ) {
        inactivityWarnedRef.current = true;
        const nextViolationCount = incrementViolationCount();

        showWarning({
          type: 'inactive',
          title: 'You are inactive',
          message:
            'No interaction has been detected for 30 seconds. Resume activity now or your exam will auto-submit after 60 seconds of inactivity.',
          violationCount: nextViolationCount,
        });

        void logViolation('inactive', {
          inactivitySeconds: nextInactivitySeconds,
          violationCount: nextViolationCount,
          attemptId: attempt?.id,
          warning: true,
        });
      }
    };

    evaluateInactivity();
    const intervalId = window.setInterval(
      evaluateInactivity,
      ACTIVITY_CHECK_INTERVAL_MS
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [attempt?.id, enabled]);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const nextTabSwitchCount = incrementTabSwitchCount();
        const nextViolationCount = incrementViolationCount();

        pendingVisibilityWarningRef.current = {
          type: 'tab_switch',
          title: 'Tab switch detected',
          message:
            nextTabSwitchCount > TAB_SWITCH_LIMIT
              ? 'You left the exam window too many times. Your exam will be submitted automatically.'
              : `You left the exam window. This is tab switch ${nextTabSwitchCount} of ${
                  TAB_SWITCH_LIMIT + 1
                }. More than 2 switches will auto-submit your exam.`,
          violationCount: nextViolationCount,
        };

        void logViolation('tab_switch', {
          tabSwitchCount: nextTabSwitchCount,
          violationCount: nextViolationCount,
          attemptId: attempt?.id,
        });

        if (nextTabSwitchCount > TAB_SWITCH_LIMIT) {
          void triggerAutoSubmit({
            reason: 'tab_switch',
            title: 'Exam auto-submitting',
            message:
              'You switched tabs too many times. Your exam is being submitted now.',
            eventType: 'tab_switch',
            metadata: {
              tabSwitchCount: nextTabSwitchCount,
              attemptId: attempt?.id,
            },
          });
        }

        return;
      }

      if (pendingVisibilityWarningRef.current && !autoSubmitTriggeredRef.current) {
        showWarning(pendingVisibilityWarningRef.current);
        pendingVisibilityWarningRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attempt?.id, enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return undefined;
    }

    const channel = new BroadcastChannel('exam_channel');

    const handleMultiTabDetection = () => {
      if (multipleTabsDetectedRef.current) {
        return;
      }

      multipleTabsDetectedRef.current = true;
      const nextViolationCount = incrementViolationCount();

      void triggerAutoSubmit({
        reason: 'multi_tab',
        title: 'Multiple tabs detected',
        message:
          'Another exam tab or window was opened for this attempt. Your exam is being submitted now.',
        eventType: 'multi_tab',
        metadata: {
          attemptId: attempt?.id,
          violationCount: nextViolationCount,
        },
      });
    };

    channel.onmessage = (event) => {
      const message = event.data;

      if (!message || message.examId !== examId || message.attemptId !== attempt?.id) {
        return;
      }

      if (message.tabId === tabIdRef.current) {
        return;
      }

      if (message.type === 'exam_open') {
        channel.postMessage({
          type: 'exam_ack',
          examId,
          attemptId: attempt?.id,
          tabId: tabIdRef.current,
          targetTabId: message.tabId,
        });
        handleMultiTabDetection();
      }

      if (message.type === 'exam_ack' && message.targetTabId === tabIdRef.current) {
        handleMultiTabDetection();
      }
    };

    channel.postMessage({
      type: 'exam_open',
      examId,
      attemptId: attempt?.id,
      tabId: tabIdRef.current,
    });

    return () => {
      channel.close();
    };
  }, [attempt?.id, enabled, examId]);

  return {
    remainingSeconds,
    violationCount,
    tabSwitchCount,
    inactivitySeconds,
    warning,
    dismissWarning,
    isOffline,
  };
}
