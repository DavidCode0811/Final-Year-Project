'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getAttemptRemainingSeconds } from '@/lib/student-exam';

const TAB_SWITCH_LIMIT = 2; // 2 switches -> 3rd triggers submit
const FIRST_INACTIVITY_WARNING_SECONDS = 30; // first flag after 30s
const ESCALATION_INACTIVITY_WARNING_SECONDS = 60; // stronger warning after 60s
const INACTIVITY_AUTO_SUBMIT_SECONDS = 90; // auto-submit after 90s of inactivity
const ACTIVITY_CHECK_INTERVAL_MS = 3000;
const ACTIVITY_THROTTLE_MS = 250;

function getIntegrityStorageKey(examId) {
  return `student-exam:${examId}:integrity`;
}

function loadPersistedIntegrityState(examId) {
  if (typeof window === 'undefined') {
    return {
      violationCount: 0,
      tabSwitchCount: 0,
      warning: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(getIntegrityStorageKey(examId));
    return raw
      ? JSON.parse(raw)
      : {
          violationCount: 0,
          tabSwitchCount: 0,
          warning: null,
        };
  } catch (error) {
    console.error('Failed to load persisted integrity state:', error);
    return {
      violationCount: 0,
      tabSwitchCount: 0,
      warning: null,
    };
  }
}

function savePersistedIntegrityState(examId, state) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getIntegrityStorageKey(examId), JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save integrity state:', error);
  }
}

function clearPersistedIntegrityState(examId) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getIntegrityStorageKey(examId));
}

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
  const violationCountRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const lastInteractionAtRef = useRef(Date.now());
  const inactivityStageRef = useRef('none');
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
    if (!enabled || !examId) {
      return;
    }

    const persistedState = loadPersistedIntegrityState(examId);
    const persistedViolation = Number.isInteger(persistedState.violationCount)
      ? persistedState.violationCount
      : 0;
    const persistedTabSwitch = Number.isInteger(persistedState.tabSwitchCount)
      ? persistedState.tabSwitchCount
      : 0;
    const serverViolation = Number.isInteger(attempt?.violation_count)
      ? attempt.violation_count
      : 0;
    const serverTabSwitch = Number.isInteger(attempt?.tab_switch_count)
      ? attempt.tab_switch_count
      : 0;

    const initialViolationCount = Math.max(persistedViolation, serverViolation);
    const initialTabSwitchCount = Math.max(persistedTabSwitch, serverTabSwitch);

    setWarning(persistedState.warning || null);
    setRemainingSeconds(getAttemptRemainingSeconds(durationMinutes, attempt?.started_at));
    setViolationCount(initialViolationCount);
    setTabSwitchCount(initialTabSwitchCount);
    setInactivitySeconds(0);

    violationCountRef.current = initialViolationCount;
    tabSwitchCountRef.current = initialTabSwitchCount;
    lastInteractionAtRef.current = Date.now();
    inactivityStageRef.current = 'none';
    multipleTabsDetectedRef.current = false;
    autoSubmitTriggeredRef.current = false;
    pendingVisibilityWarningRef.current = null;

    savePersistedIntegrityState(examId, {
      violationCount: initialViolationCount,
      tabSwitchCount: initialTabSwitchCount,
      warning: persistedState.warning || null,
    });
  }, [attempt?.id, attempt?.started_at, durationMinutes, enabled, examId]);

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
    setWarning((currentWarning) => {
      const nextWarning = currentWarning?.blocking ? currentWarning : null;

      if (examId) {
        savePersistedIntegrityState(examId, {
          violationCount: violationCountRef.current,
          tabSwitchCount: tabSwitchCountRef.current,
          warning: nextWarning,
        });
      }

      return nextWarning;
    });
  };

  const showWarning = (nextWarning) => {
    const warningPayload = {
      tone: 'warning',
      blocking: false,
      ...nextWarning,
    };

    setWarning(warningPayload);

    if (examId) {
      savePersistedIntegrityState(examId, {
        violationCount: violationCountRef.current,
        tabSwitchCount: tabSwitchCountRef.current,
        warning: warningPayload,
      });
    }
  };

  const incrementViolationCount = () => {
    const nextValue = violationCountRef.current + 1;
    violationCountRef.current = nextValue;
    setViolationCount(nextValue);

    if (examId) {
      savePersistedIntegrityState(examId, {
        violationCount: nextValue,
        tabSwitchCount: tabSwitchCountRef.current,
        warning,
      });
    }

    return nextValue;
  };

  const incrementTabSwitchCount = () => {
    const nextValue = tabSwitchCountRef.current + 1;
    tabSwitchCountRef.current = nextValue;
    setTabSwitchCount(nextValue);

    if (examId) {
      savePersistedIntegrityState(examId, {
        violationCount: violationCountRef.current,
        tabSwitchCount: nextValue,
        warning,
      });
    }

    return nextValue;
  };

  const maybeTriggerAutoSubmit = async ({ reason, title, message, eventType, metadata = {} }) => {
    if (autoSubmitTriggeredRef.current) {
      return;
    }

    if (violationCountRef.current >= 3 || tabSwitchCountRef.current >= 3) {
      await triggerAutoSubmit({
        reason,
        title,
        message,
        eventType,
        metadata,
      });
    }
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

    const warningPayload = {
      title,
      message,
      tone: 'danger',
      blocking: true,
      violationCount: violationCountRef.current,
    };

    setWarning(warningPayload);

    if (examId) {
      savePersistedIntegrityState(examId, {
        violationCount: violationCountRef.current,
        tabSwitchCount: tabSwitchCountRef.current,
        warning: warningPayload,
      });
    }

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
      const now = Date.now();
      if (now - lastInteractionAtRef.current < ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastInteractionAtRef.current = now;
      setInactivitySeconds(0);

      if (inactivityStageRef.current !== 'none') {
        inactivityStageRef.current = 'none';
        setWarning((currentWarning) =>
          currentWarning?.type === 'inactive' ? null : currentWarning
        );
      }
    };

    const activityEvents = [
      'mousemove',
      'keydown',
      'click',
      'touchstart',
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, markActivity, { passive: true })
    );
    window.addEventListener('scroll', markActivity, { passive: true, capture: true });

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, markActivity)
      );
      window.removeEventListener('scroll', markActivity, { capture: true });
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    const evaluateInactivity = () => {
      const nextInactivitySeconds = Math.floor(
        (Date.now() - lastInteractionAtRef.current) / 1000
      );

      setInactivitySeconds(nextInactivitySeconds);

      if (nextInactivitySeconds < FIRST_INACTIVITY_WARNING_SECONDS) {
        return;
      }

      if (nextInactivitySeconds >= INACTIVITY_AUTO_SUBMIT_SECONDS) {
        const nextViolationCount = incrementViolationCount();

        void triggerAutoSubmit({
          reason: 'auto_submitted_inactivity',
          title: 'Inactivity detected',
          message:
            'Your exam has been idle for too long. It is being submitted automatically.',
          eventType: 'inactive_auto_submit',
          metadata: {
            inactivitySeconds: nextInactivitySeconds,
            attemptId: attempt?.id,
            violationCount: nextViolationCount,
          },
        });
        return;
      }

      if (
        nextInactivitySeconds >= ESCALATION_INACTIVITY_WARNING_SECONDS &&
        inactivityStageRef.current !== 'escalated'
      ) {
        inactivityStageRef.current = 'escalated';
        const nextViolationCount = incrementViolationCount();

        showWarning({
          type: 'inactive',
          title: 'Exam still idle',
          message:
            'Your exam remains inactive. Please continue or it may be submitted automatically soon.',
          violationCount: nextViolationCount,
        });

        void logViolation('inactive_escalation', {
          inactivitySeconds: nextInactivitySeconds,
          violationCount: nextViolationCount,
          attemptId: attempt?.id,
        });

        if (nextViolationCount >= 3) {
          void maybeTriggerAutoSubmit({
            reason: 'auto_submitted_violation_limit',
            title: 'Exam auto-submitting',
            message:
              'You have exceeded the allowed number of violations. Your exam is being submitted now.',
            eventType: 'violation_limit',
            metadata: {
              inactivitySeconds: nextInactivitySeconds,
              attemptId: attempt?.id,
              violationCount: nextViolationCount,
            },
          });
        }

        return;
      }

      if (
        nextInactivitySeconds >= FIRST_INACTIVITY_WARNING_SECONDS &&
        inactivityStageRef.current === 'none'
      ) {
        inactivityStageRef.current = 'prompted';
        toast.warning(
          'You have been inactive for a while. Please continue your exam when you are ready.'
        );

        void logViolation('inactive_warning', {
          inactivitySeconds: nextInactivitySeconds,
          attemptId: attempt?.id,
          warning: true,
        });
      }
    };

    evaluateInactivity();
    const intervalId = window.setInterval(evaluateInactivity, ACTIVITY_CHECK_INTERVAL_MS);

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

        if (nextTabSwitchCount > TAB_SWITCH_LIMIT || nextViolationCount >= 3) {
          void maybeTriggerAutoSubmit({
            reason: nextTabSwitchCount > TAB_SWITCH_LIMIT ? 'tab_switch_limit_exceeded' : 'auto_submitted_violation_limit',
            title: 'Exam auto-submitting',
            message:
              'You switched tabs too many times. Your exam is being submitted now.',
            eventType: 'tab_switch',
            metadata: {
              tabSwitchCount: nextTabSwitchCount,
              attemptId: attempt?.id,
              violationCount: nextViolationCount,
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

      void maybeTriggerAutoSubmit({
        reason: 'multi_tab_detected',
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
