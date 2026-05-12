'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileText,
  ListChecks,
  MoreHorizontal,
  Search,
  ShieldAlert,
  Users2,
  XCircle,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { useMounted } from '@/hooks/use-mounted';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PASS_MARK = 50;
const SUSPICIOUS_EVENTS = new Set(['tab_switch', 'inactive', 'multi_tab']);

const tableColumns = [
  { key: 'studentName', label: 'Student', className: 'w-[40%] min-w-0' },
  { key: 'score', label: 'Score', className: 'w-[16%]' },
  { key: 'percentage', label: 'Accuracy', className: 'hidden w-[14%] sm:table-cell' },
  { key: 'resultStatus', label: 'Status', className: 'w-[14%]' },
  { key: 'suspiciousActivityCount', label: 'Integrity', className: 'hidden w-[16%] md:table-cell' },
  { key: 'status', label: 'Completion', className: 'hidden w-[16%] lg:table-cell' },
];

function FullScreenLoader({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-foreground" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(seconds) {
  if (seconds == null) {
    return '-';
  }

  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

function shortId(value) {
  if (!value) {
    return '-';
  }

  return String(value).slice(0, 8).toUpperCase();
}

function getResultStatus(row) {
  return Number(row.percentage || 0) >= PASS_MARK ? 'pass' : 'fail';
}

function getCompletionLabel(row) {
  if (row.status === 'auto_submitted') {
    return 'Auto-submitted';
  }

  if (row.status === 'submitted') {
    return 'Submitted';
  }

  return row.status || 'Unknown';
}

function getSeverity(row) {
  const count = Number(row.suspiciousActivityCount || 0);

  if (count >= 5 || Number(row.tabSwitchCount || 0) >= 3) {
    return 'high';
  }

  if (count >= 2) {
    return 'medium';
  }

  if (count >= 1) {
    return 'low';
  }

  return 'none';
}

function StatusBadge({ type, children }) {
  const styles = {
    pass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
    fail: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300',
    submitted: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300',
    auto: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
    none: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
    low: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-300',
    medium: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300',
    high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300',
  };

  return (
    <Badge variant="outline" className={`whitespace-nowrap rounded-full px-2.5 py-1 font-medium ${styles[type] || styles.none}`}>
      {children}
    </Badge>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-11 w-full md:w-80" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-11 w-full sm:w-36" />
            <Skeleton className="h-11 w-full sm:w-36" />
            <Skeleton className="h-11 w-full sm:w-36" />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950',
    indigo: 'bg-indigo-600 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-600 text-white',
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-card shadow-[0_18px_45px_-34px_rgba(15,23,42,0.6)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {value}
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {helper}
            </p>
          </div>
          <div className={`rounded-2xl p-3 ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortButton({ column, sort, onSort, children }) {
  const active = sort.key === column;
  const Icon = !active ? ArrowDownUp : sort.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-left font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function StudentActions({ row, onOpen, onExport }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open result actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel>Student result</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onOpen(row, 'details')} className="gap-2">
          <Eye className="h-4 w-4" />
          View Full Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen(row, 'answers')} className="gap-2">
          <ListChecks className="h-4 w-4" />
          View Answers
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen(row, 'logs')} className="gap-2">
          <ShieldAlert className="h-4 w-4" />
          View Activity Logs
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onExport(row)} className="gap-2">
          <Download className="h-4 w-4" />
          Export Student Result
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ResultsDataTable({
  rows,
  sort,
  onSort,
  onOpenStudent,
  onExportStudent,
  totalPossibleScore,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-45px_rgba(15,23,42,0.65)]">
      <div className="overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur supports-[backdrop-filter]:bg-muted/75">
            <TableRow className="hover:bg-transparent">
              {tableColumns.map(({ key, label, className }) => (
                <TableHead key={key} className={`h-12 border-b border-border px-3 sm:px-4 ${className}`}>
                  <SortButton column={key} sort={sort} onSort={onSort}>
                    {label}
                  </SortButton>
                </TableHead>
              ))}
              <TableHead className="h-12 w-[52px] border-b border-border px-2 text-right sm:w-[72px] sm:px-4">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                  No submissions match the current search and filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const resultStatus = getResultStatus(row);
                const severity = getSeverity(row);

                return (
                  <TableRow
                    key={row.id}
                    className="border-border/70 transition-colors hover:bg-muted/45"
                  >
                    <TableCell className="min-w-0 px-3 py-4 sm:px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {row.studentName?.slice(0, 1)?.toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{row.studentName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.studentEmail || row.matricNumber || shortId(row.studentId)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 sm:px-4">
                      <span className="text-sm font-semibold text-foreground sm:text-base">
                        {Number(row.score || 0)} / {totalPossibleScore}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-3 sm:table-cell sm:px-4">
                      <span className="tabular-nums text-foreground">{Number(row.percentage || 0).toFixed(1)}%</span>
                    </TableCell>
                    <TableCell className="px-3 sm:px-4">
                      <StatusBadge type={resultStatus}>
                        {resultStatus === 'pass' ? 'Pass' : 'Fail'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="hidden px-3 md:table-cell sm:px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge type={severity}>
                          {severity === 'none' ? 'Clear' : `${severity} risk`}
                        </StatusBadge>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {Number(row.tabSwitchCount || 0)} tabs
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-3 lg:table-cell sm:px-4">
                      <StatusBadge type={row.status === 'auto_submitted' ? 'auto' : 'submitted'}>
                        {getCompletionLabel(row)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="px-2 text-right sm:px-4">
                      <StudentActions
                        row={row}
                        onOpen={onOpenStudent}
                        onExport={onExportStudent}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function QuestionResult({ question }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {question.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  Question {question.index}
                </span>
                <StatusBadge type={question.isCorrect ? 'pass' : 'fail'}>
                  {question.isCorrect ? 'Correct' : 'Wrong'}
                </StatusBadge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {question.questionText}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
              {Number(question.earnedMarks || 0)} / {Number(question.marks || 0)}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Student selected answer
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{question.selectedAnswer || '-'}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Correct answer
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{question.correctAnswer || '-'}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Score awarded
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {Number(question.earnedMarks || 0)} mark(s)
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Time spent
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatDuration(question.timeSpentSeconds)}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function StudentResultModal({ row, mode, open, onOpenChange, totalPossibleScore }) {
  const [activeMode, setActiveMode] = useState(mode || 'answers');

  useEffect(() => {
    if (mode) {
      setActiveMode(mode);
    }
  }, [mode]);

  if (!row) {
    return null;
  }

  const resultStatus = getResultStatus(row);
  const severity = getSeverity(row);
  const activityLogs = row.activityLogs || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border-border bg-background p-0 shadow-2xl sm:w-[calc(100vw-3rem)]">
        <DialogHeader className="shrink-0 border-b border-border bg-muted/40 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 pr-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl">{row.studentName}</DialogTitle>
              <DialogDescription className="mt-1 truncate">
                {row.studentEmail || 'No email'} · {row.examTitle}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeMode === 'details' ? 'default' : 'outline'}
                onClick={() => setActiveMode('details')}
              >
                Details
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeMode === 'answers' ? 'default' : 'outline'}
                onClick={() => setActiveMode('answers')}
              >
                Answers
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeMode === 'logs' ? 'default' : 'outline'}
                onClick={() => setActiveMode('logs')}
              >
                Logs
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total score</p>
              <p className="mt-2 text-2xl font-semibold">{Number(row.score || 0)} / {totalPossibleScore}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Accuracy</p>
              <p className="mt-2 text-2xl font-semibold">{Number(row.percentage || 0).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Correct vs wrong</p>
              <p className="mt-2 text-2xl font-semibold">
                {Number(row.correctCount || 0)} / {Number(row.wrongCount || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Suspicious activity</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-2xl font-semibold">{Number(row.suspiciousActivityCount || 0)}</p>
                <StatusBadge type={severity}>{severity === 'none' ? 'Clear' : severity}</StatusBadge>
              </div>
            </div>
          </div>

          {activeMode === 'details' ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                ['Student ID', row.matricNumber || shortId(row.studentId)],
                ['Email', row.studentEmail || '-'],
                ['Result status', resultStatus === 'pass' ? 'Pass' : 'Fail'],
                ['Completion status', getCompletionLabel(row)],
                ['Exam start time', formatDateTime(row.startedAt)],
                ['Submission time', formatDateTime(row.submittedAt || row.endTime)],
                ['Time taken', formatDuration(row.timeTakenSeconds)],
                ['Tab switch count', Number(row.tabSwitchCount || 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activeMode === 'answers' ? (
            <div className="mt-5 space-y-3">
              {(row.questionResults || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                  No per-question data is available for this submission.
                </div>
              ) : (
                (row.questionResults || []).map((question) => (
                  <QuestionResult key={question.questionId} question={question} />
                ))
              )}
            </div>
          ) : null}

          {activeMode === 'logs' ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
              {activityLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No activity logs were recorded for this attempt.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {SUSPICIOUS_EVENTS.has(log.eventType) ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <p className="font-medium text-foreground">{log.eventType}</p>
                        </div>
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {JSON.stringify(log.metadata || {})}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(log.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function exportStudentResult(row, totalPossibleScore) {
  const lines = [
    ['Student Name', row.studentName],
    ['Student ID', row.matricNumber || row.studentId],
    ['Email', row.studentEmail],
    ['Exam Title', row.examTitle],
    ['Score', `${Number(row.score || 0)} / ${totalPossibleScore}`],
    ['Percentage', `${Number(row.percentage || 0).toFixed(1)}%`],
    ['Status', getResultStatus(row) === 'pass' ? 'Pass' : 'Fail'],
    ['Correct Answers', Number(row.correctCount || 0)],
    ['Wrong Answers', Number(row.wrongCount || 0)],
    ['Exam Start Time', formatDateTime(row.startedAt)],
    ['Submission Time', formatDateTime(row.submittedAt || row.endTime)],
    ['Tab Switch Count', Number(row.tabSwitchCount || 0)],
    ['Suspicious Activity Count', Number(row.suspiciousActivityCount || 0)],
  ];
  const csv = lines
    .map(([label, value]) => [label, value].map((item) => `"${String(item ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${row.studentName || 'student'}-result.csv`.replace(/[^\w.-]+/g, '-');
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LecturerExamResultsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  const params = useParams();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: 'score', direction: 'desc' });
  const [modalState, setModalState] = useState({ open: false, row: null, mode: 'answers' });

  useEffect(() => {
    if (!mounted || loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!['lecturer', 'admin'].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [loading, mounted, router, user]);

  useEffect(() => {
    const loadResults = async () => {
      if (!mounted || !examId || !token || !user || !['lecturer', 'admin'].includes(user.role)) {
        return;
      }

      setLoadingData(true);
      setError('');

      try {
        const response = await fetch(`/api/exams/${examId}/results`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load exam results.');
        }

        setExam(data.exam);
        setRows(data.rows || []);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load exam results.');
      } finally {
        setLoadingData(false);
      }
    };

    loadResults();
  }, [examId, mounted, token, user]);

  useEffect(() => {
    setPage(1);
  }, [search, resultFilter, severityFilter, completionFilter, pageSize]);

  const totalPossibleScore = Number(exam?.totalPossibleScore || 0);

  const processedRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows
      .map((row) => ({
        ...row,
        resultStatus: getResultStatus(row),
        severity: getSeverity(row),
      }))
      .filter((row) => {
        const haystack = [
          row.studentName,
          row.studentId,
          row.matricNumber,
          row.studentEmail,
          row.examTitle,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesSearch = !query || haystack.includes(query);
        const matchesResult = resultFilter === 'all' || row.resultStatus === resultFilter;
        const matchesSeverity = severityFilter === 'all' || row.severity === severityFilter;
        const matchesCompletion =
          completionFilter === 'all' ||
          (completionFilter === 'manual' && row.status === 'submitted') ||
          (completionFilter === 'auto' && row.status === 'auto_submitted');

        return matchesSearch && matchesResult && matchesSeverity && matchesCompletion;
      })
      .sort((left, right) => {
        const leftValue = left[sort.key];
        const rightValue = right[sort.key];
        const direction = sort.direction === 'asc' ? 1 : -1;

        if (['score', 'percentage', 'correctCount', 'wrongCount', 'suspiciousActivityCount'].includes(sort.key)) {
          return (Number(leftValue || 0) - Number(rightValue || 0)) * direction;
        }

        if (['startedAt', 'submittedAt'].includes(sort.key)) {
          return ((new Date(leftValue || 0).getTime() || 0) - (new Date(rightValue || 0).getTime() || 0)) * direction;
        }

        return String(leftValue || '').localeCompare(String(rightValue || '')) * direction;
      });
  }, [completionFilter, resultFilter, rows, search, severityFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const passedCount = rows.filter((row) => getResultStatus(row) === 'pass').length;
  const suspiciousCount = rows.filter((row) => Number(row.suspiciousActivityCount || 0) > 0).length;
  const averagePercentage =
    rows.length > 0
      ? rows.reduce((total, row) => total + Number(row.percentage || 0), 0) / rows.length
      : 0;
  const handleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const openStudent = (row, mode) => {
    setModalState({ open: true, row, mode });
  };

  if (!mounted || loading || !user) {
    return <FullScreenLoader message="Checking your workspace..." />;
  }

  if (!['lecturer', 'admin'].includes(user.role)) {
    return <FullScreenLoader message="Redirecting you to your dashboard..." />;
  }

  return (
    <PortalShell
      title={exam?.title ? `${exam.title} Results` : 'Exam Results'}
      actions={
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="bg-background/80">
            <Link href={`/dashboard/exams/${examId}`}>Back to Exam</Link>
          </Button>
        </div>
      }
      contentClassName="mx-auto max-w-[1500px]"
      showThemeToggle={false}
    >
      {loadingData ? (
        <ResultsSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard icon={Users2} label="Submissions" value={rows.length} helper="Students graded" />
            <SummaryCard
              icon={BarChart3}
              label="Average Accuracy"
              value={`${averagePercentage.toFixed(1)}%`}
              helper={`${passedCount} passed`}
              tone="indigo"
            />
            <SummaryCard
              icon={ShieldAlert}
              label="Integrity Flags"
              value={suspiciousCount}
              helper="Students flagged"
              tone="rose"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, student ID, email, or exam"
                  className="h-11 rounded-xl pl-9"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select value={resultFilter} onValueChange={setResultFilter}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Result status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All results</SelectItem>
                    <SelectItem value="pass">Pass only</SelectItem>
                    <SelectItem value="fail">Fail only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Malpractice severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severity</SelectItem>
                    <SelectItem value="none">Clear</SelectItem>
                    <SelectItem value="low">Low risk</SelectItem>
                    <SelectItem value="medium">Medium risk</SelectItem>
                    <SelectItem value="high">High risk</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={completionFilter} onValueChange={setCompletionFilter}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Completion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All completion</SelectItem>
                    <SelectItem value="manual">Submitted</SelectItem>
                    <SelectItem value="auto">Auto-submitted</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="25">25 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                    <SelectItem value="100">100 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <ResultsDataTable
            rows={paginatedRows}
            sort={sort}
            onSort={handleSort}
            onOpenStudent={openStudent}
            onExportStudent={(row) => exportStudentResult(row, totalPossibleScore)}
            totalPossibleScore={totalPossibleScore}
          />

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm md:flex-row md:items-center md:justify-between">
            <p>
              Showing <span className="font-semibold text-foreground">{paginatedRows.length}</span> of{' '}
              <span className="font-semibold text-foreground">{processedRows.length}</span> filtered submissions
            </p>
            <div className="flex items-center justify-between gap-2 md:justify-end">
              <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-24 text-center font-medium text-foreground">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(pageCount)}
                disabled={currentPage === pageCount}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <StudentResultModal
        row={modalState.row}
        mode={modalState.mode}
        open={modalState.open}
        onOpenChange={(open) => setModalState((current) => ({ ...current, open }))}
        totalPossibleScore={totalPossibleScore}
      />
    </PortalShell>
  );
}
