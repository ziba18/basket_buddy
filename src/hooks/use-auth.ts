import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';

import { readCache, writeCache } from '@/lib/local-cache';
import { exchangeAppleToken, signInWithGoogleNative, signOutOfGoogle } from '@/lib/social-auth';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/shopping';

const profileCacheKey = (userId: string) => `cache:profile:${userId}`;

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, nickname: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signInWithApple: () => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    let isMounted = true;

    readCache<Profile>(profileCacheKey(userId)).then((cached) => {
      if (!isMounted || !cached) return;
      setProfile(cached);
    });

    supabase
      .from('profiles')
      .select('id, nickname')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted || !data) return;
        const fresh: Profile = { id: data.id, nickname: data.nickname };
        setProfile(fresh);
        writeCache(profileCacheKey(userId), fresh);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile: session ? profile : null,
      isLoading,
      signUp: async (email, password, nickname) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname } },
        });
        return error?.message ?? null;
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      // Both social sign-ins get an identity token natively, have the Render
      // backend verify it (src/lib/social-auth.ts), and install the Supabase
      // session it returns. Email/password stays on Supabase Auth directly.
      signInWithGoogle: async () => {
        try {
          const tokens = await signInWithGoogleNative();
          if (!tokens) return null;
          const { error } = await supabase.auth.setSession(tokens);
          return error?.message ?? null;
        } catch (err) {
          return err instanceof Error ? err.message : 'Google sign-in failed';
        }
      },
      signInWithApple: async () => {
        try {
          let credential;
          try {
            credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });
          } catch (err) {
            if (
              err &&
              typeof err === 'object' &&
              'code' in err &&
              err.code === 'ERR_REQUEST_CANCELED'
            ) {
              return null;
            }
            throw err;
          }

          if (!credential.identityToken) return 'Apple sign-in failed';

          // Apple only shares the name on the very first sign-in; the server
          // uses it as the nickname when it creates the account.
          const fullName = credential.fullName;
          const nickname = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ');
          const tokens = await exchangeAppleToken(credential.identityToken, nickname || null);
          const { error } = await supabase.auth.setSession(tokens);
          return error?.message ?? null;
        } catch (err) {
          return err instanceof Error ? err.message : 'Apple sign-in failed';
        }
      },
      signOut: async () => {
        await signOutOfGoogle();
        await supabase.auth.signOut();
      },
      deleteAccount: async () => {
        const { error } = await supabase.rpc('delete_account');
        if (error) return error.message;
        await signOutOfGoogle();
        await supabase.auth.signOut();
        return null;
      },
    }),
    [session, profile, isLoading]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
