'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PortalShell from '@/components/PortalShell';
import { CircleCheck as CheckCircle2, Circle as XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchStudentResult } from '@/lib/student-exam';

export default function ResultPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const examId = params.id;

  const [result, setResult] = useState(null);
  const [exam, setExam] = useState(null);
  const [fetchingResult, setFetchingResult] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && examId) {
      fetchResult();
    }
  }, [user, loading, examId, router]);

  const fetchResult = async () => {
    try {
      const resultData = await fetchStudentResult(examId, user.id);

      if (!resultData) {
        router.push('/dashboard');
        return;
      }

      setExam(resultData.exam);
      setResult(resultData);
    } catch (error) {
      console.error('Failed to fetch result:', error);
      router.push('/dashboard');
    } finally {
      setFetchingResult(false);
    }
  };

  if (loading || fetchingResult || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const totalQuestions = result?.totalQuestions || exam?.questions?.length || 0;
  const totalMarks = result?.totalMarks || 0;
  const percentage = totalMarks > 0 ? ((result.score / totalMarks) * 100).toFixed(1) : 0;
  const passed = percentage >= 50;
  const timeTakenSeconds = result?.timeTakenSeconds;
  const timeTakenDisplay =
    timeTakenSeconds == null
      ? '-'
      : `${Math.floor(timeTakenSeconds / 60)}m ${String(timeTakenSeconds % 60).padStart(2, '0')}s`;

  return (
    <PortalShell
      title="Exam Result"
      description="Your student sidebar stays available here so you can move back to the dashboard at any time."
      contentClassName="mx-auto max-w-5xl"
    >
      <div className="space-y-6">
        <Card className="border-slate-200 bg-white/85 shadow-sm">
          <CardHeader className="text-center">
            <div className="mb-4">
              {passed ? (
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="mx-auto h-16 w-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">{exam?.title || 'Exam Results'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="mb-2 text-6xl font-bold text-slate-900">{percentage}%</div>
              <p className="text-gray-600">
                {result.score} out of {totalMarks} marks earned
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{result.score}</div>
                <div className="text-sm text-blue-600">Score</div>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-center">
                <div className="text-2xl font-bold text-violet-700">{totalMarks}</div>
                <div className="text-sm text-violet-600">Total Possible Score</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <div className="text-2xl font-bold text-red-700">{result.correctCount}</div>
                <div className="text-sm text-red-600">Questions Correct</div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 font-semibold text-gray-900">Submission Details</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  Submission Type:{' '}
                  <span className="font-medium capitalize">{result.submissionType}</span>
                </p>
                <p>
                  Submission Status:{' '}
                  <span className="font-medium capitalize">
                    {String(result.submissionStatus || '').replace('_', ' ')}
                  </span>
                </p>
                <p>
                  Submitted At:{' '}
                  <span className="font-medium">
                    {new Date(
                      result.attempt.end_time || result.attempt.submitted_at
                    ).toLocaleString()}
                  </span>
                </p>
                <p>
                  Time Taken: <span className="font-medium">{timeTakenDisplay}</span>
                </p>
                <p>
                  Questions Correct:{' '}
                  <span className="font-medium">
                    {result.correctCount} / {totalQuestions}
                  </span>
                </p>
              </div>
            </div>

            {result.submissionType === 'auto' ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  This exam was automatically submitted due to a violation of exam rules.
                </p>
              </div>
            ) : null}

            <div
              className={`text-center text-lg font-semibold ${
                passed ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {passed ? 'Congratulations! You passed!' : 'Unfortunately, you did not pass.'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Detail View</CardTitle>
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
                {(result.questionResults || []).map((question) => (
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
      </div>
    </PortalShell>
  );
}
