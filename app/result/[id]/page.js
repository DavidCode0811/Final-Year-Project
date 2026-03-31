'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PortalShell from '@/components/PortalShell';
import { CircleCheck as CheckCircle2, Circle as XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('exam_id', examId)
        .maybeSingle();

      if (responseError || !response) {
        router.push('/dashboard');
        return;
      }

      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          questions(id)
        `)
        .eq('id', examId)
        .maybeSingle();

      if (!examError && examData) {
        setExam(examData);
      }

      setResult(response);
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

  const totalQuestions = exam?.questions?.length || 0;
  const percentage = totalQuestions > 0 ? ((result.score / totalQuestions) * 100).toFixed(1) : 0;
  const passed = percentage >= 50;

  return (
    <PortalShell
      title="Exam Result"
      description="Your student sidebar stays available here so you can move back to the dashboard at any time."
      contentClassName="mx-auto max-w-2xl"
    >
      <Card className="border-slate-200 bg-white/85 shadow-sm">
        <CardHeader className="text-center">
          <div className="mb-4">
            {passed ? (
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="mx-auto h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {exam?.title || 'Exam Results'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="mb-2 text-6xl font-bold text-slate-900">
              {percentage}%
            </div>
            <p className="text-gray-600">
              {result.score} out of {totalQuestions} questions correct
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{result.score}</div>
              <div className="text-sm text-blue-600">Correct</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <div className="text-2xl font-bold text-red-700">
                {totalQuestions - result.score}
              </div>
              <div className="text-sm text-red-600">Incorrect</div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">Submission Details</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p>
                Submission Type:{' '}
                <span className="font-medium capitalize">
                  {result.submission_type}
                </span>
              </p>
              <p>
                Submitted At:{' '}
                <span className="font-medium">
                  {new Date(result.submitted_at).toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          {result.submission_type === 'auto' ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                This exam was automatically submitted due to a violation of exam rules.
              </p>
            </div>
          ) : null}

          <div className={`text-center text-lg font-semibold ${
            passed ? 'text-green-600' : 'text-red-600'
          }`}>
            {passed ? 'Congratulations! You passed!' : 'Unfortunately, you did not pass.'}
          </div>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
