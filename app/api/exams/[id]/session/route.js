import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

const SESSION_HEADER = 'x-exam-session-id';
const DEVICE_HEADER = 'x-exam-device-id';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function getHeaderValue(request, headerName) {
  const value = request.headers.get(headerName);
  return typeof value === 'string' ? value.trim() : '';
}

function getUuidHeaderValue(request, headerName) {
  const value = getHeaderValue(request, headerName);
  return isUuid(value) ? value : '';
}

async function getExamId(params) {
  const resolvedParams = await params;
  return Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;
}

function buildAttemptSelect() {
  return [
    'id',
    'exam_id',
    'student_id',
    'status',
    'started_at',
    'last_saved_at',
    'submitted_at',
    'created_at',
    'end_time',
    'score',
    'session_id',
    'device_id',
    'is_active',
    'last_active_at',
    'violation_count',
    'tab_switch_count',
    'warnings',
  ].join(',');
}

async function fetchAttempt(db, examId, studentId) {
  const { data, error } = await db
    .from('exam_attempts')
    .select(buildAttemptSelect())
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load your exam attempt.');
  }

  return data;
}

async function updateAttempt(db, attemptId, studentId, examId, updates) {
  const { data, error } = await db
    .from('exam_attempts')
    .update(updates)
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .eq('exam_id', examId)
    .select(buildAttemptSelect())
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update exam session state.');
  }

  return data;
}

export async function GET(request, { params }) {
  try {
    const examId = await getExamId(params);

    if (!isUuid(examId)) {
      return NextResponse.json({ error: 'A valid exam ID is required.' }, { status: 400 });
    }

    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'student',
    });

    const sessionId = getUuidHeaderValue(request, SESSION_HEADER);
    const deviceId = getHeaderValue(request, DEVICE_HEADER);

    const attempt = await fetchAttempt(db, examId, profile.id);

    if (!attempt) {
      return NextResponse.json({ attempt: null }, { status: 200 });
    }

    if (attempt.status === 'in_progress' && attempt.session_id) {
      if (!sessionId || attempt.session_id !== sessionId) {
        return NextResponse.json(
          {
            error:
              'An active exam session already exists for this exam on another device or browser.',
          },
          { status: 409 }
        );
      }
    }

    if (attempt.status === 'in_progress') {
      const updated = await updateAttempt(db, attempt.id, profile.id, examId, {
        session_id: attempt.session_id || sessionId || null,
        device_id: deviceId || attempt.device_id || null,
        is_active: true,
        last_active_at: new Date().toISOString(),
      });

      return NextResponse.json({ attempt: updated }, { status: 200 });
    }

    return NextResponse.json({ attempt }, { status: 200 });
  } catch (error) {
    console.error('Error loading exam session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: getHttpStatus(error) }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const examId = await getExamId(params);

    if (!isUuid(examId)) {
      return NextResponse.json({ error: 'A valid exam ID is required.' }, { status: 400 });
    }

    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'student',
    });

    const sessionId = getUuidHeaderValue(request, SESSION_HEADER);
    const deviceId = getHeaderValue(request, DEVICE_HEADER);

    const attempt = await fetchAttempt(db, examId, profile.id);

    if (attempt) {
      if (attempt.status !== 'in_progress') {
        return NextResponse.json(
          {
            error:
              'This exam attempt has already been completed or submitted. You cannot resume it again.',
          },
          { status: 400 }
        );
      }

      if (attempt.session_id) {
        if (!sessionId || attempt.session_id !== sessionId) {
          return NextResponse.json(
            {
              error:
                'An active exam session already exists for this exam on another device or browser.',
            },
            { status: 409 }
          );
        }
      }

      const updated = await updateAttempt(db, attempt.id, profile.id, examId, {
        session_id: attempt.session_id || sessionId || null,
        device_id: deviceId || attempt.device_id || null,
        is_active: true,
        last_active_at: new Date().toISOString(),
      });

      return NextResponse.json({ attempt: updated }, { status: 200 });
    }

    const { data: createdAttempt, error: createError } = await db
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        student_id: profile.id,
        status: 'in_progress',
        session_id: sessionId || null,
        device_id: deviceId || null,
        is_active: true,
        last_active_at: new Date().toISOString(),
      })
      .select(buildAttemptSelect())
      .single();

    if (createError) {
      throw new Error(createError.message || 'Failed to create your exam attempt.');
    }

    return NextResponse.json({ attempt: createdAttempt }, { status: 201 });
  } catch (error) {
    console.error('Error creating exam session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: getHttpStatus(error) }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const examId = await getExamId(params);

    if (!isUuid(examId)) {
      return NextResponse.json({ error: 'A valid exam ID is required.' }, { status: 400 });
    }

    const { db, profile } = await getAuthenticatedAppUser(request, {
      requireRole: 'student',
    });

    const sessionId = getUuidHeaderValue(request, SESSION_HEADER);
    const { attempt_id, violation_count, tab_switch_count, warnings, is_active } =
      await request.json();

    if (!isUuid(attempt_id)) {
      return NextResponse.json({ error: 'A valid attempt ID is required.' }, { status: 400 });
    }

    const attempt = await fetchAttempt(db, examId, profile.id);

    if (!attempt || attempt.id !== attempt_id) {
      return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
    }

    if (attempt.session_id) {
      if (!sessionId || attempt.session_id !== sessionId) {
        return NextResponse.json(
          {
            error:
              'An active exam session already exists for this exam on another device or browser.',
          },
          { status: 409 }
        );
      }
    }

    const updates = {
      session_id: attempt.session_id || sessionId || null,
      last_active_at: new Date().toISOString(),
    };

    if (typeof tab_switch_count === 'number') {
      updates.tab_switch_count = tab_switch_count;
    }

    if (typeof violation_count === 'number') {
      updates.violation_count = violation_count;
    }

    if (Array.isArray(warnings)) {
      updates.warnings = warnings;
    }

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active;
    }

    const updatedAttempt = await updateAttempt(
      db,
      attempt.id,
      profile.id,
      examId,
      updates
    );

    return NextResponse.json({ attempt: updatedAttempt }, { status: 200 });
  } catch (error) {
    console.error('Error updating exam session state:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: getHttpStatus(error) }
    );
  }
}
