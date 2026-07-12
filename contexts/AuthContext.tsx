import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';

// Users sign up with a username only; internally we map it to a synthetic
// email on a domain we control, since Supabase Auth is email-based.
const USERNAME_EMAIL_DOMAIN = 'lingoflow.com';
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;

// Local progress is device-scoped; wipe it on identity changes so one
// account's progress never leaks into another account on the same device.
const LOCAL_PROGRESS_KEYS = ['userProfile', 'skillTree', 'sagaMap', 'dailyQuests', 'dailyQuestsDate', 'langPair'];
const clearLocalProgress = () => {
  LOCAL_PROGRESS_KEYS.forEach(key => localStorage.removeItem(key));
  // Per-language placement dismissals ('placementDismissed-<lang>')
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('placementDismissed')) localStorage.removeItem(key);
  }
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  username: string | null;
  isAuthLoading: boolean;
  /** Returns an error message, or null on success. */
  signUp: (username: string, password: string) => Promise<string | null>;
  /** Returns an error message, or null on success. */
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase is not configured; auth is disabled.');
      setIsAuthLoading(false);
      return;
    }

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (username: string, password: string): Promise<string | null> => {
    const trimmed = username.trim();
    if (!USERNAME_REGEX.test(trimmed)) {
      return 'Username must be 3-20 characters: letters, numbers, or underscores.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    const { error } = await getSupabase().auth.signUp({
      email: usernameToEmail(trimmed),
      password,
      options: { data: { username: trimmed.toLowerCase() } },
    });

    if (error) {
      if (/already registered/i.test(error.message)) return 'That username is already taken.';
      return error.message;
    }

    // Fresh identity on this device: start from a clean local slate.
    clearLocalProgress();
    return null;
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<string | null> => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });

    if (error) {
      if (/invalid login credentials/i.test(error.message)) return 'Wrong username or password.';
      return error.message;
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    clearLocalProgress();
  }, []);

  const user = session?.user ?? null;
  const username = (user?.user_metadata?.username as string | undefined) ?? null;

  const value = React.useMemo(
    () => ({ session, user, username, isAuthLoading, signUp, signIn, signOut }),
    [session, user, username, isAuthLoading, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
