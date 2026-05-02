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
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : isWarning
      ? 'border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]'
      : 'border-border bg-card text-foreground';

  return (
    <div className="fixed right-4 top-4 z-40 w-[min(360px,calc(100vw-2rem))]">
      <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-2xl backdrop-blur">
        <div className="border-b border-border bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/80">
                Exam Timer
              </p>
              <p className="mt-1 text-sm text-primary-foreground/80">Integrity monitoring active</p>
            </div>
            <div
              className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-2xl border px-3 py-2 font-mono text-xl font-bold ${countdownTone}`}
            >
              <Clock className="h-5 w-5" />
              <span>{formatCountdown(remainingSeconds)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 text-sm text-muted-foreground">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/40 px-3 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                Violations
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">{violationCount}</p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 px-3 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Tab Switches
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">{tabSwitchCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 px-3 py-3">
            <p className="text-muted-foreground">Current inactivity</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {Math.max(0, inactivitySeconds)}s
            </p>
          </div>

          {isOffline ? (
            <div className="flex items-start gap-2 rounded-2xl border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] px-3 py-3 text-[hsl(var(--warning))]">
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
