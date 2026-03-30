'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PortalShell from '@/components/PortalShell';
import { Plus, Trash2 } from 'lucide-react';

export default function CreateExamPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [questions, setQuestions] = useState([
    { question_text: '', options: ['', '', '', ''], correct_answer: '' }
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'lecturer')) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: '', options: ['', '', '', ''], correct_answer: '' }
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validQuestions = questions.filter(
      q => q.question_text && q.options.every(o => o) && q.correct_answer
    );

    if (validQuestions.length === 0) {
      setError('Please add at least one complete question');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          duration: parseInt(duration),
          questions: validQuestions
        })
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Failed to create exam');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <PortalShell
      title="Create New Exam"
      description="Use the admin sidebar to move around, then build and publish your next assessment here."
      contentClassName="mx-auto max-w-4xl"
    >
      <Card className="border-slate-200 bg-white/85 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Exam</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Exam Title</Label>
              <Input
                id="title"
                placeholder="e.g., Final Exam - Mathematics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="e.g., 60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">Questions</Label>
                <Button type="button" onClick={addQuestion} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>

              {questions.map((question, qIndex) => (
                <Card key={qIndex} className="border-slate-200 bg-slate-50/80">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <Label>Question {qIndex + 1}</Label>
                        {questions.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(qIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        ) : null}
                      </div>

                      <Textarea
                        placeholder="Enter question text"
                        value={question.question_text}
                        onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                        required
                      />

                      <div className="space-y-2">
                        <Label>Options</Label>
                        {question.options.map((option, oIndex) => (
                          <Input
                            key={oIndex}
                            placeholder={`Option ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            required
                          />
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Input
                          placeholder="Enter the exact correct answer"
                          value={question.correct_answer}
                          onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating Exam...' : 'Create Exam'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
