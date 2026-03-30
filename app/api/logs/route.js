import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: add SUPABASE_SERVICE_ROLE_KEY to your environment.',
        },
        { status: 503 }
      );
    }

    const db = supabaseAdmin;

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

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
          user_id: decoded.userId,
          exam_id,
          event_type,
          metadata
        }
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
