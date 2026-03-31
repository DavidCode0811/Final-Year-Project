import { NextResponse } from 'next/server';

import { getAuthenticatedAppUser, getHttpStatus } from '@/lib/server-auth';

export async function GET(request) {
  try {
    const { authUser, profile } = await getAuthenticatedAppUser(request);

    return NextResponse.json(
      {
        user: profile,
        auth: {
          id: authUser.id,
          email: authUser.email,
          email_confirmed_at: authUser.email_confirmed_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load the authenticated user.' },
      { status: getHttpStatus(error) }
    );
  }
}
