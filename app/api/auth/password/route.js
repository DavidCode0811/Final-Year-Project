import { NextResponse } from 'next/server';

import { passwordChangeSchema, getValidationMessage } from '@/lib/profile-validation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  createAnonServerClient,
  getAuthenticatedAppUser,
  getHttpStatus,
} from '@/lib/server-auth';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: add SUPABASE_SERVICE_ROLE_KEY to update passwords.',
        },
        { status: 503 }
      );
    }

    const { authUser } = await getAuthenticatedAppUser(request);
    const payload = await request.json();
    const validation = passwordChangeSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { error: getValidationMessage(validation.error, 'Invalid password details.') },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;
    const verificationClient = createAnonServerClient();
    const { error: verificationError } = await verificationClient.auth.signInWithPassword({
      email: authUser.email,
      password: currentPassword,
    });

    if (verificationError) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 400 }
      );
    }

    const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      {
        password: newPassword,
      }
    );

    if (updatePasswordError) {
      throw new Error(updatePasswordError.message || 'Failed to update password.');
    }

    return NextResponse.json(
      { message: 'Password changed successfully.' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update your password.' },
      { status: getHttpStatus(error) }
    );
  }
}
