import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export async function getUserFromToken(token) {
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return userData;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

export async function createSession(userId) {
  const token = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
  return token;
}

export async function verifySession(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded.userId;
  } catch {
    return null;
  }
}
