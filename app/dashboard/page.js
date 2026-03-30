'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import PortalShell from '@/components/PortalShell';
import { Clock, BookOpen, FileText, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const [exams, setExams] = useState([]);
  const [fetchingExams, setFetchingExams] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && token) {
      fetchExams();
    }
  }, [user, token]);

  const fetchExams = async () => {
    try {
      const response = await fetch('/api/exams');
      const data = await response.json();
      if (response.ok) {
        setExams(data.exams);
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setFetchingExams(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const headerActions = user.role === 'lecturer' ? (
    <Button asChild>
      <Link href="/create-exam">
        <Plus className="mr-2 h-4 w-4" />
        Create Exam
      </Link>
    </Button>
  ) : null;

  return (
    <PortalShell
      title={`Welcome, ${user.name}`}

      actions={headerActions}
      contentClassName="mx-auto max-w-7xl"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white/80 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-slate-100 p-3">
              <BookOpen className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Exams</p>
              <p className="text-2xl font-bold text-slate-950">{exams.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/80 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Clock className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="text-2xl font-bold text-slate-950">
                {user.role === 'student' ? 'Student' : 'Admin'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/80 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-slate-100 p-3">
              <FileText className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Workspace</p>
              <p className="text-2xl font-bold text-slate-950">
                {user.role === 'student' ? 'Assessment' : 'Management'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {user.role === 'student' ? 'Available Exams' : 'Your Exams'}
          </h2>
          <p className="text-gray-600">
            {user.role === 'student'
              ? 'Select an exam to start taking it'
              : 'Manage and view your created exams'}
          </p>
        </div>
      </div>

      {fetchingExams ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white/70">
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No exams available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="border-slate-200 bg-white/85 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <CardDescription>
                  By {exam.lecturer?.name || 'Unknown'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Duration: {exam.duration} minutes
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Questions: {exam.question_count}
                  </div>
                </div>
                {user.role === 'student' ? (
                  <Button asChild className="w-full">
                    <Link href={`/exam/${exam.id}`}>Start Exam</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
