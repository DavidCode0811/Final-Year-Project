'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { supabase, supabaseStorageKey } from '@/lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const clearLegacyStorage = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');

    if (supabaseStorageKey) {
      window.localStorage.removeItem(supabaseStorageKey);
    }
  };

  const syncProfile = async (accessToken) => {
    const response = await fetch('/api/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load your account.');
    }

    return data.user;
  };

  const applySession = async (session) => {
    clearLegacyStorage();

    if (!session?.access_token) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return null;
    }

    const profile = await syncProfile(session.access_token);

    setUser(profile);
    setToken(session.access_token);
    setLoading(false);

    return profile;
  };

  useEffect(() => {
    let active = true;

    const syncAuthState = async (session) => {
      if (!active) {
        return;
      }

      try {
        await applySession(session);
      } catch (error) {
        console.error('Failed to synchronize Supabase auth state:', error);

        if (active) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }

        if (session) {
          await supabase.auth.signOut();
        }
      }
    };

    const initializeAuth = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      await syncAuthState(session);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAuthState(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async ({ email, password }) => {
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      throw new Error(error.message || 'Failed to sign in.');
    }

    await applySession(data.session);
    return data;
  };

  const signUp = async ({ name, email, password, role }) => {
    setLoading(true);

    const emailRedirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          name: name.trim(),
          role,
        },
      },
    });

    if (error) {
      setLoading(false);
      throw new Error(error.message || 'Failed to create your account.');
    }

    if (data.session) {
      await applySession(data.session);
    } else {
      setLoading(false);
    }

    return {
      ...data,
      requiresEmailVerification: !data.session,
    };
  };

  const refreshUser = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return applySession(session);
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    clearLegacyStorage();
    setUser(null);
    setToken(null);
    setLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signIn,
        signUp,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
