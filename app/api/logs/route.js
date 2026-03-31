import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

export async function POST(request) {
  try {
    const { db, profile } = await getAuthenticatedAppUser(request);
    const { exam_id, event_type, metadata = {} } = await request.json();

    if (!exam_id || !event_type) {
      return NextResponse.json(
        { error: 'Exam ID and event type are required' },
        { status: 400 }
      );
    }

    const { data: log, error } = await db
      .from('activity_logs')
      .insert([
        {
          user_id: profile.id,
          exam_id,
          event_type,
          metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Activity log insert:', error);
      return NextResponse.json(
        { error: 'Failed to log activity' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Activity logged successfully', log },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: getHttpStatus(error) }
    );
  }
}
