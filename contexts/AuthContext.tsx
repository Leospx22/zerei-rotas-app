import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  createProfileForUser,
  getCurrentProfile,
  type UserProfile,
} from '@/lib/userProfile';

export interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  refreshProfile: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setProfile(null);
      return;
    }

    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        setProfile(null);
        return;
      }

      const loadedProfile = await getCurrentProfile();
      setProfile(loadedProfile ?? (await createProfileForUser(currentUser)));
    } catch {
      // Temporary network/auth refresh failures must not destabilize local route work.
      return;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session) await refreshProfile();
      })
      .catch(() => {
        if (mounted) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
      } else {
        setTimeout(() => refreshProfile().catch(() => {}), 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) throw new Error('Conta não configurada neste ambiente.');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    await refreshProfile();
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!supabase) throw new Error('Conta não configurada neste ambiente.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) throw error;

    if (data.user && data.session) {
      await createProfileForUser(data.user);
      await refreshProfile();
    }

    return { requiresEmailConfirmation: Boolean(data.user && !data.session) };
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Conta não configurada neste ambiente.');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        configured: isSupabaseConfigured,
        refreshProfile,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
