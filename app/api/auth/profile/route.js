import { NextResponse } from 'next/server';

import { profileUpdateSchema, getValidationMessage } from '@/lib/profile-validation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  createAuthenticatedRouteClient,
  getAuthenticatedAppUser,
  getHttpStatus,
} from '@/lib/server-auth';

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

export async function PATCH(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: add SUPABASE_SERVICE_ROLE_KEY to update auth profiles.',
        },
        { status: 503 }
      );
    }

    const { accessToken, authUser, profile } = await getAuthenticatedAppUser(request);
    const payload = await request.json();
    const validation = profileUpdateSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { error: getValidationMessage(validation.error, 'Invalid profile details.') },
        { status: 400 }
      );
    }

    const { name, email } = validation.data;
    const userClient = createAuthenticatedRouteClient(accessToken);
    const previousName = profile.name || '';
    const previousEmail = profile.email || authUser.email || '';
    const nextAuthMetadata = {
      ...(authUser.user_metadata || {}),
      name,
      role: profile.role,
    };

    const { data: updatedProfile, error: profileError } = await userClient
      .from('users')
      .update({
        name,
        email,
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to update your profile.');
    }

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      email: email !== (authUser.email || '').toLowerCase() ? email : undefined,
      user_metadata: nextAuthMetadata,
    });

    if (authUpdateError) {
      await supabaseAdmin
        .from('users')
        .update({
          name: previousName,
          email: previousEmail,
        })
        .eq('id', profile.id);

      throw new Error(authUpdateError.message || 'Failed to update your auth profile.');
    }

    return NextResponse.json(
      {
        message: 'Profile updated successfully.',
        user: {
          ...updatedProfile,
          name,
          email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update your profile.' },
      { status: getHttpStatus(error) }
    );
  }
}
