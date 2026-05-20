import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function POST(request) {
  try {
    const { db, profile } = await getAuthenticatedAppUser(request);
    const { exam_id, event_type, metadata = {} } = await request.json();

    if (!isUuid(exam_id) || !event_type) {
      return NextResponse.json(
        { error: 'A valid exam ID and event type are required' },
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

    const attemptId = metadata?.attemptId;
    const hasViolationCount =
      Object.prototype.hasOwnProperty.call(metadata, 'violationCount') ||
      Object.prototype.hasOwnProperty.call(metadata, 'violation_count');
    const hasTabSwitchCount =
      Object.prototype.hasOwnProperty.call(metadata, 'tabSwitchCount') ||
      Object.prototype.hasOwnProperty.call(metadata, 'tab_switch_count');
    const violationCount = Number(metadata?.violationCount ?? metadata?.violation_count);
    const tabSwitchCount = Number(metadata?.tabSwitchCount ?? metadata?.tab_switch_count);
    const warnings = metadata?.warnings;

    if (isUuid(attemptId)) {
      const updates = {
        last_active_at: new Date().toISOString(),
      };

      if (hasViolationCount && Number.isInteger(violationCount)) {
        updates.violation_count = violationCount;
      }

      if (hasTabSwitchCount && Number.isInteger(tabSwitchCount)) {
        updates.tab_switch_count = tabSwitchCount;
      }

      if (Array.isArray(warnings)) {
        updates.warnings = warnings;
      }

      const { error: updateError } = await db
        .from('exam_attempts')
        .update(updates)
        .eq('id', attemptId)
        .eq('student_id', profile.id)
        .eq('exam_id', exam_id);

      if (updateError) {
        console.error('Activity log exam_attempts sync:', updateError);
      }
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
