import { createClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase-admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_AUTH_PLACEHOLDER = '__managed_by_supabase_auth__';

const fallbackServerClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getServerClient() {
  const client = supabaseAdmin ?? fallbackServerClient;

  if (!client) {
    throw createHttpError(
      'Server misconfiguration: missing Supabase environment variables.',
      503
    );
  }

  return client;
}

function normalizeRole(role) {
  return role === 'lecturer' ? 'lecturer' : 'student';
}

function getMetadataString(authUser, key) {
  const value = authUser?.user_metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getProfileName(authUser) {
  const metadataName = getMetadataString(authUser, 'name');

  if (metadataName) {
    return metadataName;
  }

  if (authUser?.email) {
    return authUser.email.split('@')[0];
  }

  return 'User';
}

function sanitizeProfile(profile) {
  if (!profile) {
    return null;
  }

  const { password, ...safeProfile } = profile;
  return safeProfile;
}

async function getSupabaseAuthUser(accessToken) {
  if (!accessToken) {
    throw createHttpError('Unauthorized', 401);
  }

  const client = getServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw createHttpError('Unauthorized', 401);
  }

  return user;
}

async function findExistingProfile(client, authUser) {
  const { data: profileById, error: profileByIdError } = await client
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileByIdError) {
    throw createHttpError(profileByIdError.message || 'Failed to load user profile.', 500);
  }

  if (profileById) {
    return profileById;
  }

  if (!authUser.email) {
    return null;
  }

  const { data: profileByEmail, error: profileByEmailError } = await client
    .from('users')
    .select('*')
    .eq('email', authUser.email)
    .maybeSingle();

  if (profileByEmailError) {
    throw createHttpError(profileByEmailError.message || 'Failed to load user profile.', 500);
  }

  return profileByEmail;
}

async function updateExistingProfile(client, profile, authUser) {
  const nextName = getProfileName(authUser);
  const nextEmail = authUser.email || profile.email;
  const updates = {};

  if (nextName && profile.name !== nextName) {
    updates.name = nextName;
  }

  if (nextEmail && profile.email !== nextEmail) {
    updates.email = nextEmail;
  }

  if (Object.keys(updates).length === 0) {
    return sanitizeProfile(profile);
  }

  const { data, error } = await client
    .from('users')
    .update(updates)
    .eq('id', profile.id)
    .select('*')
    .single();

  if (error) {
    throw createHttpError(error.message || 'Failed to update user profile.', 500);
  }

  return sanitizeProfile(data);
}

async function insertNewProfile(client, authUser) {
  if (!authUser.email) {
    throw createHttpError('Authenticated user is missing an email address.', 400);
  }

  const payload = {
    id: authUser.id,
    name: getProfileName(authUser),
    email: authUser.email,
    role: normalizeRole(getMetadataString(authUser, 'role')),
    password: SUPABASE_AUTH_PLACEHOLDER,
  };

  const { data, error } = await client
    .from('users')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw createHttpError(error.message || 'Failed to create user profile.', 500);
  }

  return sanitizeProfile(data);
}

async function syncProfileForAuthUser(client, authUser) {
  const existingProfile = await findExistingProfile(client, authUser);

  if (existingProfile) {
    return updateExistingProfile(client, existingProfile, authUser);
  }

  return insertNewProfile(client, authUser);
}

function getAccessTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw createHttpError('Unauthorized', 401);
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();

  if (!accessToken) {
    throw createHttpError('Unauthorized', 401);
  }

  return accessToken;
}

export async function syncUserProfileFromAccessToken(accessToken) {
  const client = getServerClient();
  const authUser = await getSupabaseAuthUser(accessToken);
  const profile = await syncProfileForAuthUser(client, authUser);

  return {
    accessToken,
    authUser,
    profile,
    db: client,
  };
}

export async function getAuthenticatedAppUser(request, options = {}) {
  const accessToken = getAccessTokenFromRequest(request);
  const result = await syncUserProfileFromAccessToken(accessToken);

  if (options.requireRole && result.profile.role !== options.requireRole) {
    throw createHttpError(
      options.requireRole === 'lecturer'
        ? 'Only lecturers can perform this action.'
        : 'Unauthorized',
      403
    );
  }

  return result;
}

export function getHttpStatus(error, fallbackStatus = 500) {
  return error?.status || fallbackStatus;
}
