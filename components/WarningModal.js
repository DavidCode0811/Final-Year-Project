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
    panel: 'border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
    badge: 'bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]',
    button: '',
  },
  danger: {
    icon: ShieldAlert,
    panel: 'border-destructive/35 bg-destructive/12 text-destructive',
    badge: 'bg-destructive/20 text-destructive',
    button: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
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
        <div className={`rounded-3xl border bg-card shadow-2xl ${styles.panel}`}>
          <div className="border-b border-border/40 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-background/80 p-3">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-xl text-foreground">{title}</DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-foreground/80">
                    {message}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-border/40 bg-background/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Violation Count
              </p>
              <div className="mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold">
                <span className={`rounded-full px-3 py-1 ${styles.badge}`}>
                  {violationCount}
                </span>
              </div>
            </div>

            {blocking ? (
              <p className="text-sm leading-6 text-foreground/80">
                Submission is being processed now. Please stay on this page.
              </p>
            ) : null}
          </div>

          {!blocking && onDismiss ? (
            <DialogFooter className="border-t border-border/40 px-6 py-5">
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
