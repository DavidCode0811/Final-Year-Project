'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';
import QuestionEditorDialog from '@/components/QuestionEditorDialog';
import PortalShell from '@/components/PortalShell';
import { useMounted } from '@/hooks/use-mounted';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createEmptyQuestionForm,
  getNextQuestionOrderIndex,
  mapQuestionToFormValues,
  QUESTION_OPTION_LABELS,
  sortQuestionsByOrder,
} from '@/lib/exam-questions';
import { updateLecturerExamPublishStatus } from '@/lib/lecturer-exams';
import {
  createQuestionForLecturer,
  deleteQuestionForLecturer,
  fetchExamQuestionsForLecturer,
  updateQuestionForLecturer,
} from '@/lib/exam-questions-client';

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

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="border-slate-200 bg-white/85 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ExamQuestionsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  const params = useParams();
  const examId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editorValues, setEditorValues] = useState(createEmptyQuestionForm(0));
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [publishingExam, setPublishingExam] = useState(false);

  const [questionPendingDelete, setQuestionPendingDelete] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);

  useEffect(() => {
    if (!mounted || loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'lecturer') {
      router.replace('/dashboard');
    }
  }, [loading, mounted, router, user]);

  const loadQuestions = async () => {
    if (!mounted || !examId || !user || !token) {
      return;
    }

    setLoadingData(true);
    setLoadError('');

    try {
      const data = await fetchExamQuestionsForLecturer(examId, user, token);
      setExam(data.exam);
      setQuestions(sortQuestionsByOrder(data.questions || []));
    } catch (error) {
      setLoadError(error.message || 'Failed to load questions.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (mounted && user?.role === 'lecturer' && token && examId) {
      loadQuestions();
    }
  }, [examId, mounted, token, user]);

  const totalMarks = useMemo(
    () => questions.reduce((total, question) => total + Number(question.marks || 0), 0),
    [questions]
  );

  const openCreateDialog = () => {
    setEditorMode('create');
    setEditingQuestionId(null);
    setEditorValues(createEmptyQuestionForm(getNextQuestionOrderIndex(questions)));
    setEditorOpen(true);
  };

  const openEditDialog = (question) => {
    setEditorMode('edit');
    setEditingQuestionId(question.id);
    setEditorValues(mapQuestionToFormValues(question));
    setEditorOpen(true);
  };

  const handleSaveQuestion = async (values) => {
    if (!user || !token) {
      toast.error('You need to be signed in to manage questions.');
      return;
    }

    setSavingQuestion(true);

    try {
      if (editorMode === 'edit' && editingQuestionId) {
        await updateQuestionForLecturer(examId, editingQuestionId, user, token, values);
        toast.success('Question updated successfully.');
      } else {
        await createQuestionForLecturer(examId, user, token, values);
        toast.success('Question added successfully.');
      }

      setEditorOpen(false);
      await loadQuestions();
    } catch (error) {
      toast.error(error.message || 'Unable to save question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionPendingDelete || !user || !token) {
      return;
    }

    setDeletingQuestion(true);

    try {
      await deleteQuestionForLecturer(examId, questionPendingDelete.id, user, token);
      toast.success('Question deleted successfully.');
      setQuestionPendingDelete(null);
      await loadQuestions();
    } catch (error) {
      toast.error(error.message || 'Unable to delete question.');
    } finally {
      setDeletingQuestion(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!exam || !user) {
      return;
    }

    setPublishingExam(true);

    try {
      const updatedExam = await updateLecturerExamPublishStatus(
        exam.id,
        user.id,
        !exam.is_published
      );

      setExam(updatedExam);
      toast.success(
        updatedExam.is_published
          ? 'Exam published successfully.'
          : 'Exam moved back to draft.'
      );
    } catch (publishError) {
      toast.error(
        publishError.message || 'Unable to update the exam publishing status.'
      );
    } finally {
      setPublishingExam(false);
    }
  };

  if (!mounted || loading || !user) {
    return <FullScreenLoader message="Checking your workspace..." />;
  }

  if (user.role !== 'lecturer') {
    return <FullScreenLoader message="Redirecting you to your dashboard..." />;
  }

  if (loadingData) {
    return <FullScreenLoader message="Loading exam questions..." />;
  }

  return (
    <>
      <PortalShell
        title={exam?.title ? `${exam.title} Questions` : 'Question Management'}
        description="Create, update, and organize the question set for this exam."
        showThemeToggle={false}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="border-slate-300 bg-white/80">
              <Link href={`/dashboard/exams/${examId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Exam
              </Link>
            </Button>
            <Button
              type="button"
              variant={exam?.is_published ? 'outline' : 'default'}
              className={
                exam?.is_published
                  ? 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }
              onClick={handlePublishToggle}
              disabled={publishingExam || !exam}
            >
              {publishingExam
                ? exam?.is_published
                  ? 'Unpublishing...'
                  : 'Publishing...'
                : exam?.is_published
                  ? 'Unpublish Exam'
                  : 'Publish Exam'}
            </Button>
            <Button
              type="button"
              className="bg-slate-950 text-white hover:bg-slate-800"
              onClick={openCreateDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>
        }
        contentClassName="mx-auto max-w-7xl"
      >
        {loadError ? (
          <Alert className="border-rose-200 bg-rose-50 text-rose-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load the question manager</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{loadError}</span>
              <Button
                type="button"
                variant="outline"
                className="border-rose-300 bg-white text-rose-800 hover:bg-rose-100"
                onClick={loadQuestions}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard icon={FileText} label="Total Questions" value={questions.length} />
              <StatCard icon={CheckCircle2} label="Total Marks" value={totalMarks} />
              <StatCard
                icon={ListOrdered}
                label="Exam Status"
                value={exam?.is_published ? 'Published' : 'Draft'}
              />
            </div>

            <div className="mt-8 flex justify-center">
              <div className="space-y-6 w-full max-w-4xl">
                {questions.length === 0 ? (
                  <Card className="border-dashed border-slate-300 bg-white/75">
                    <CardContent className="py-16 text-center">
                      <FileText className="mx-auto h-12 w-12 text-slate-400" />
                      <h2 className="mt-4 text-lg font-semibold text-slate-950">No questions yet</h2>
                      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                        Start building this exam by adding the first question in the modal.
                      </p>
                      <Button
                        type="button"
                        className="mt-6 bg-slate-950 text-white hover:bg-slate-800"
                        onClick={openCreateDialog}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Question
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  questions.map((question, index) => (
                    <Card key={question.id} className="border-slate-200 bg-white/90 shadow-sm">
                      <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-slate-300 bg-slate-50 text-slate-700"
                              >
                                Question {index + 1}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="border-blue-200 bg-blue-50 text-blue-700"
                              >
                                Order {question.order_index}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                {question.marks} marks
                              </Badge>
                            </div>
                            <CardTitle className="text-lg leading-7 text-slate-950">
                              {question.question_text}
                            </CardTitle>
                            <CardDescription>
                              Correct answer: {question.correct_answer}
                            </CardDescription>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-slate-300 bg-white"
                              onClick={() => openEditDialog(question)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                              onClick={() => setQuestionPendingDelete(question)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {question.options?.map((option, optionIndex) => {
                          const isCorrect = option === question.correct_answer;

                          return (
                            <div
                              key={`${question.id}-${optionIndex}-${option}`}
                              className={`rounded-2xl border px-4 py-3 ${
                                isCorrect
                                  ? 'border-emerald-200 bg-emerald-50'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      isCorrect
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-white text-slate-600'
                                    }`}
                                  >
                                    Option {QUESTION_OPTION_LABELS[optionIndex] || optionIndex + 1}
                                  </div>
                                  <p className="text-sm leading-6 text-slate-700">{option}</p>
                                </div>

                                {isCorrect ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-600 bg-emerald-600 text-white"
                                  >
                                    Correct Answer
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

            </div>
          </>
        )}
      </PortalShell>

      <QuestionEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mode={editorMode}
        initialValues={editorValues}
        draftKey={`${examId}-${editorMode}-${editingQuestionId ?? 'new'}`}
        onSubmit={handleSaveQuestion}
        submitting={savingQuestion}
      />

      <AlertDialog
        open={Boolean(questionPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingQuestion) {
            setQuestionPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected question will be permanently removed from this exam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingQuestion}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleDeleteQuestion}
              disabled={deletingQuestion}
            >
              {deletingQuestion ? 'Deleting...' : 'Delete Question'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
