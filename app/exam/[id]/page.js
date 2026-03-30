'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ExamTimer } from '@/components/ExamTimer';
import { WarningModal } from '@/components/WarningModal';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TriangleAlert as AlertTriangle, Shield } from 'lucide-react';

import { useFocusTracker } from '@/antiCheat/useFocusTracker';
import { useVisibilityTracker } from '@/antiCheat/useVisibilityTracker';
import { useInactivityMonitor } from '@/antiCheat/useInactivityMonitor';
import { useBroadcastChannel } from '@/antiCheat/useBroadcastChannel';
import { useAutoSubmit } from '@/antiCheat/useAutoSubmit';

export default function ExamPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const examId = params.id;

  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [fetchingExam, setFetchingExam] = useState(true);
  const [warningModal, setWarningModal] = useState({ open: false, title: '', message: '' });
  const [focusLossCount, setFocusLossCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logActivity = useCallback(async (eventType, metadata = {}) => {
    if (!token || !examId) return;

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exam_id: examId,
          event_type: eventType,
          metadata
        })
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [token, examId]);

  const submitExam = useCallback(async (submissionType = 'manual') => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exam_id: examId,
          answers,
          submission_type: submissionType
        })
      });

      const data = await response.json();

      if (response.ok) {
        await logActivity(submissionType === 'auto' ? 'auto_submit' : 'manual_submit', {
          score: data.score,
          total: data.total
        });
        router.push(`/result/${examId}`);
      }
    } catch (error) {
      console.error('Submission failed:', error);
      setIsSubmitting(false);
    }
  }, [token, examId, answers, router, logActivity, isSubmitting]);

  const { triggerAutoSubmit } = useAutoSubmit({
    onSubmit: async (reason) => {
      await logActivity('auto_submit_triggered', { reason });
      await submitExam('auto');
    },
    enabled: hasStarted
  });

  useFocusTracker({
    onFocusLoss: () => {
      const newCount = focusLossCount + 1;
      setFocusLossCount(newCount);
      logActivity('focus_loss', { count: newCount });

      if (newCount >= 3) {
        setWarningModal({
          open: true,
          title: 'Multiple Focus Loss Detected',
          message: 'You have lost focus multiple times. The exam will be auto-submitted if this continues.'
        });
      } else {
        setWarningModal({
          open: true,
          title: 'Focus Loss Detected',
          message: 'Please remain focused on the exam window.'
        });
      }

      if (newCount >= 5) {
        triggerAutoSubmit('excessive_focus_loss');
      }
    },
    enabled: hasStarted
  });

  useVisibilityTracker({
    onVisibilityChange: (isHidden) => {
      if (isHidden && hasStarted) {
        logActivity('tab_hidden');
        setWarningModal({
          open: true,
          title: 'Tab Switch Detected',
          message: 'Switching tabs during the exam is not allowed. The exam will be submitted automatically.'
        });
        setTimeout(() => {
          triggerAutoSubmit('tab_switch');
        }, 3000);
      }
    },
    enabled: hasStarted
  });

  useInactivityMonitor({
    onInactivityWarning: () => {
      setWarningModal({
        open: true,
        title: 'Inactivity Detected',
        message: 'You appear to be inactive. Please interact with the exam to continue.'
      });
      logActivity('inactivity_warning');
    },
    onInactivityTimeout: () => {
      logActivity('inactivity_timeout');
      triggerAutoSubmit('inactivity');
    },
    warningThreshold: 15000,
    timeoutThreshold: 30000,
    checkInterval: 10000,
    enabled: hasStarted
  });

  useBroadcastChannel({
    channelName: `exam_${examId}`,
    onMultipleTabsDetected: () => {
      logActivity('multi_tab_detected');
      setWarningModal({
        open: true,
        title: 'Multiple Tabs Detected',
        message: 'Opening the exam in multiple tabs is not allowed. The exam will be submitted automatically.'
      });
      setTimeout(() => {
        triggerAutoSubmit('multiple_tabs');
      }, 3000);
    },
    enabled: hasStarted
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/dashboard');
      return;
    }

    if (user && token && examId) {
      fetchExam();
    }
  }, [user, token, loading, examId, router]);

  useEffect(() => {
    if (hasStarted) {
      const handleContextMenu = (e) => e.preventDefault();
      const handleCopy = (e) => e.preventDefault();
      const handleCut = (e) => e.preventDefault();

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);

      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('cut', handleCut);
      };
    }
  }, [hasStarted]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/exams/${examId}`);
      const data = await response.json();

      if (response.ok) {
        setExam(data.exam);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch exam:', error);
      router.push('/dashboard');
    } finally {
      setFetchingExam(false);
    }
  };

  const startExam = () => {
    setHasStarted(true);
    logActivity('exam_started');
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleManualSubmit = () => {
    submitExam('manual');
  };

  if (loading || fetchingExam || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Exam Details</h3>
              <ul className="space-y-1 text-blue-800 text-sm">
                <li>Duration: {exam.duration} minutes</li>
                <li>Questions: {exam.questions?.length || 0}</li>
                <li>Type: Multiple Choice</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">Anti-Cheating Rules</h3>
                  <ul className="space-y-1 text-yellow-800 text-sm">
                    <li>Do not switch tabs or windows</li>
                    <li>Do not leave the exam page</li>
                    <li>Do not open multiple tabs</li>
                    <li>Remain active throughout the exam</li>
                    <li>Copy/paste and right-click are disabled</li>
                    <li>Excessive focus loss will result in auto-submission</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Auto-Submission Warning</h3>
                  <p className="text-red-800 text-sm">
                    The exam will be automatically submitted if you:
                  </p>
                  <ul className="space-y-1 text-red-800 text-sm mt-2">
                    <li>Switch tabs or minimize the browser</li>
                    <li>Open the exam in multiple tabs</li>
                    <li>Remain inactive for too long</li>
                    <li>Lose focus more than 5 times</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button onClick={startExam} className="w-full" size="lg">
              I Understand - Start Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6">
      <WarningModal
        isOpen={warningModal.open}
        title={warningModal.title}
        message={warningModal.message}
        onDismiss={() => setWarningModal({ open: false, title: '', message: '' })}
      />

      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex justify-between items-center sticky top-4 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-sm text-gray-600">
              {Object.keys(answers).length} of {exam.questions?.length || 0} answered
            </p>
          </div>
          <div className="flex items-center gap-4">
            {focusLossCount > 0 && (
              <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                Focus Loss: {focusLossCount}/5
              </div>
            )}
            <ExamTimer
              duration={exam.duration}
              onTimeUp={() => triggerAutoSubmit('time_up')}
            />
          </div>
        </div>

        <div className="space-y-6">
          {exam.questions?.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{question.question_text}</p>
                <RadioGroup
                  value={answers[question.id] || ''}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {question.options?.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`q${question.id}-opt${optIndex}`} />
                      <Label
                        htmlFor={`q${question.id}-opt${optIndex}`}
                        className="cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 sticky bottom-4">
          <Button
            onClick={handleManualSubmit}
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </Button>
        </div>
      </div>
    </div>
  );
}
