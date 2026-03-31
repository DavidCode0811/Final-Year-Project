'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowDownUp, BarChart3, Search } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import PortalShell from '@/components/PortalShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function FullScreenLoader({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
        <p className="mt-4 text-gray-600">{message}</p>
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

export default function LecturerExamResultsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [search, setSearch] = useState('');
  const [scoreSort, setScoreSort] = useState('desc');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (!loading && user && user.role !== 'lecturer') {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  useEffect(() => {
    const loadResults = async () => {
      if (!examId || !token || !user || user.role !== 'lecturer') {
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
        setSelectedAttemptId(data.rows?.[0]?.id || null);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load exam results.');
      } finally {
        setLoadingData(false);
      }
    };

    loadResults();
  }, [examId, token, user]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const searched = query
      ? rows.filter((row) => row.studentName.toLowerCase().includes(query))
      : rows;

    return [...searched].sort((left, right) => {
      const delta = Number(left.score || 0) - Number(right.score || 0);

      if (delta !== 0) {
        return scoreSort === 'asc' ? delta : -delta;
      }

      return left.studentName.localeCompare(right.studentName);
    });
  }, [rows, scoreSort, search]);

  const selectedRow =
    filteredRows.find((row) => row.id === selectedAttemptId) ||
    filteredRows[0] ||
    null;

  const averageScore =
    filteredRows.length > 0
      ? (
          filteredRows.reduce((total, row) => total + Number(row.score || 0), 0) /
          filteredRows.length
        ).toFixed(1)
      : '0.0';
  const topScore =
    filteredRows.length > 0
      ? Math.max(...filteredRows.map((row) => Number(row.score || 0)))
      : 0;

  if (loading || !user) {
    return <FullScreenLoader message="Checking your workspace..." />;
  }

  if (user.role !== 'lecturer') {
    return <FullScreenLoader message="Redirecting you to your dashboard..." />;
  }

  if (loadingData) {
    return <FullScreenLoader message="Loading exam analytics..." />;
  }

  return (
    <PortalShell
      title={exam?.title ? `${exam.title} Results` : 'Exam Results'}
      description="Review student performance, sort by score, and inspect per-question marking."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href={`/dashboard/exams/${examId}`}>Back to Exam</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 bg-white/80">
            <Link href={`/dashboard/exams/${examId}/questions`}>Manage Questions</Link>
          </Button>
        </div>
      }
      contentClassName="mx-auto max-w-7xl"
    >
      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="p-6 text-sm text-rose-900">{error}</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 bg-white/90 shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Submissions</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{filteredRows.length}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white/90 shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Average Score</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {averageScore} / {exam?.totalPossibleScore || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white/90 shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Top Score</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {topScore} / {exam?.totalPossibleScore || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white/90 shadow-sm">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-slate-600" />
                Lecturer Analytics
              </CardTitle>
              <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                <div className="relative min-w-[240px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student name"
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-300 bg-white"
                  onClick={() => setScoreSort((current) => (current === 'desc' ? 'asc' : 'desc'))}
                >
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  Score: {scoreSort === 'desc' ? 'High to Low' : 'Low to High'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Submission Type</TableHead>
                    <TableHead>Time Taken</TableHead>
                    <TableHead>Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        No submissions found for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        data-state={selectedRow?.id === row.id ? 'selected' : undefined}
                        onClick={() => setSelectedAttemptId(row.id)}
                      >
                        <TableCell>
                          <div className="font-medium text-slate-900">{row.studentName}</div>
                          <div className="text-xs text-slate-500">{row.studentEmail}</div>
                        </TableCell>
                        <TableCell>
                          {row.score} / {exam?.totalPossibleScore || 0}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              row.submissionType === 'auto'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }
                          >
                            {row.submissionType}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDuration(row.timeTakenSeconds)}</TableCell>
                        <TableCell>{formatDateTime(row.endTime || row.submittedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedRow ? (
            <Card className="border-slate-200 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  Detail View: {selectedRow.studentName} ({selectedRow.score} /{' '}
                  {exam?.totalPossibleScore || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Student Answer</TableHead>
                      <TableHead>Correct Answer</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedRow.questionResults || []).map((question) => (
                      <TableRow key={question.questionId}>
                        <TableCell>
                          <p className="font-medium text-slate-900">
                            Q{question.index}. {question.questionText}
                          </p>
                          <p className="text-xs text-slate-500">{question.marks} mark(s)</p>
                        </TableCell>
                        <TableCell>{question.selectedAnswer || '-'}</TableCell>
                        <TableCell>{question.correctAnswer}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              question.isCorrect
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                            }
                          >
                            {question.isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PortalShell>
  );
}

