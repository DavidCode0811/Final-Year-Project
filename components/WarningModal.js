'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';

import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const toneStyles = {
  warning: {
    icon: AlertTriangle,
    panel: 'border-amber-200 bg-amber-50 text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
    button: 'bg-slate-950 text-white hover:bg-slate-800',
  },
  danger: {
    icon: ShieldAlert,
    panel: 'border-rose-200 bg-rose-50 text-rose-900',
    badge: 'bg-rose-100 text-rose-800',
    button: 'bg-rose-600 text-white hover:bg-rose-700',
  },
};

export function WarningModal({
  isOpen,
  title,
  message,
  onDismiss,
  violationCount = 0,
  tone = 'warning',
  blocking = false,
  confirmLabel = 'I Understand',
}) {
  const styles = toneStyles[tone] || toneStyles.warning;
  const Icon = styles.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss?.()}>
      <DialogContent className="max-w-md border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
        <div className={`rounded-3xl border bg-white shadow-2xl ${styles.panel}`}>
          <div className="border-b border-black/5 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/80 p-3">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-xl text-slate-950">{title}</DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-slate-700">
                    {message}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Violation Count
              </p>
              <div className="mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold">
                <span className={`rounded-full px-3 py-1 ${styles.badge}`}>
                  {violationCount}
                </span>
              </div>
            </div>

            {blocking ? (
              <p className="text-sm leading-6 text-slate-700">
                Submission is being processed now. Please stay on this page.
              </p>
            ) : null}
          </div>

          {!blocking && onDismiss ? (
            <DialogFooter className="border-t border-black/5 px-6 py-5">
              <Button onClick={onDismiss} className={`w-full ${styles.button}`}>
                {confirmLabel}
              </Button>
            </DialogFooter>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
