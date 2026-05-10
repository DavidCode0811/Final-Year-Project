'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Shield, ShieldAlert, WifiOff, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getIntegrityStatus(violationCount, tabSwitchCount) {
  const totalViolations = violationCount + tabSwitchCount;
  if (totalViolations >= 3) return 'red';
  if (totalViolations >= 1) return 'orange';
  return 'green';
}

export function ExamTimer({
  remainingSeconds,
  violationCount = 0,
  tabSwitchCount = 0,
  isOffline = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const autoCollapseTimeoutRef = useRef(null);

  const isWarning = remainingSeconds <= 300;
  const isDanger = remainingSeconds <= 60;
  const integrityStatus = getIntegrityStatus(violationCount, tabSwitchCount);

  // Auto-expand on violations
  useEffect(() => {
    const shouldAutoExpand = violationCount > 0 || tabSwitchCount > 0;
    if (shouldAutoExpand && !autoExpanded) {
      setIsExpanded(true);
      setAutoExpanded(true);

      // Show toast notification
      if (tabSwitchCount > 1) {
        toast.warning('⚠ Multiple tab switches detected');
      } else {
        toast.warning('⚠ Tab switch detected');
      }

      autoCollapseTimeoutRef.current = window.setTimeout(() => {
        setIsExpanded(false);
        setAutoExpanded(false);
      }, 5000);
    }

    return () => {
      if (autoCollapseTimeoutRef.current) {
        window.clearTimeout(autoCollapseTimeoutRef.current);
      }
    };
  }, [violationCount, tabSwitchCount, autoExpanded]);

  const countdownTone = isDanger
    ? 'text-red-400'
    : isWarning
      ? 'text-orange-400'
      : 'text-slate-300';

  const integrityColors = {
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  };

  return (
    <div className="fixed right-6 top-6 z-50">
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Compact Pill */}
        <motion.div
          className="flex items-center gap-2 rounded-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 px-4 py-2 cursor-pointer shadow-2xl"
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Shield className={`h-4 w-4 ${integrityColors[integrityStatus]}`} />
          <span className={`font-mono text-sm font-semibold ${countdownTone}`}>
            {formatCountdown(remainingSeconds)}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </motion.div>
        </motion.div>

        {/* Expanded Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="border-b border-slate-700/50 bg-slate-800/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${integrityColors[integrityStatus]}`} />
                    <span className="text-sm font-medium text-slate-200">Exam Security</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      integrityStatus === 'green' ? 'bg-green-400' :
                      integrityStatus === 'orange' ? 'bg-orange-400' : 'bg-red-400'
                    }`} />
                    <span className="text-xs text-slate-400">
                      {integrityStatus === 'green' ? 'Secure' :
                       integrityStatus === 'orange' ? 'Warning' : 'Violation'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-800/50 border border-slate-700/30 p-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <ShieldAlert className="h-4 w-4" />
                      <span className="text-xs font-medium">Violations</span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-200">{violationCount}</p>
                  </div>

                  <div className="rounded-xl bg-slate-800/50 border border-slate-700/30 p-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-medium">Tab Switches</span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-200">{tabSwitchCount}</p>
                  </div>
                </div>

                {isOffline && (
                  <motion.div
                    className="flex items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-300"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <WifiOff className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p className="text-xs">
                      Connection lost. Answers saved locally and will sync when reconnected.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
