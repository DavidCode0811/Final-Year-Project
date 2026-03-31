'use client';

import { AlertTriangle, Clock, ShieldAlert, WifiOff } from 'lucide-react';

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ExamTimer({
  remainingSeconds,
  violationCount = 0,
  tabSwitchCount = 0,
  inactivitySeconds = 0,
  isOffline = false,
}) {
  const isWarning = remainingSeconds <= 300;
  const isDanger = remainingSeconds <= 60;
  const countdownTone = isDanger
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : isWarning
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-white/95 text-slate-900';

  return (
    <div className="fixed right-4 top-4 z-40 w-[min(320px,calc(100vw-2rem))]">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/92 shadow-xl backdrop-blur">
        <div className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Exam Timer
              </p>
              <p className="mt-1 text-sm text-slate-300">Monitoring is active</p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 font-mono text-xl font-bold ${countdownTone}`}
            >
              <Clock className="h-5 w-5" />
              <span>{formatCountdown(remainingSeconds)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 text-sm text-slate-600">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldAlert className="h-4 w-4" />
                Violations
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-950">{violationCount}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <AlertTriangle className="h-4 w-4" />
                Tab Switches
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-950">{tabSwitchCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-slate-500">Current inactivity</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {Math.max(0, inactivitySeconds)}s
            </p>
          </div>

          {isOffline ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-800">
              <WifiOff className="mt-0.5 h-4 w-4" />
              <p>
                Internet connection lost. Your answers are still being preserved locally and will
                sync again once you reconnect.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
