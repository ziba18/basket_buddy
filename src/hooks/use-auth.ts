import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';

import { readCache, writeCache } from '@/lib/local-cache';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/shopping';

WebBrowser.maybeCompleteAuthSession();

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
      signInWithGoogle: async () => {
        try {
          const redirectTo = AuthSession.makeRedirectUri();
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, skipBrowserRedirect: true },
          });
          if (error || !data?.url) return error?.message ?? 'Could not start Google sign-in';

          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type !== 'success' || !result.url) return null;

          const hashIndex = result.url.indexOf('#');
          const params = new URLSearchParams(
            hashIndex >= 0 ? result.url.slice(hashIndex + 1) : ''
          );
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (!accessToken || !refreshToken) {
            return params.get('error_description') ?? 'Google sign-in failed';
          }

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          return sessionError?.message ?? null;
        } catch (err) {
          return err instanceof Error ? err.message : 'Google sign-in failed';
        }
      },
      signInWithApple: async () => {
        try {
          const rawNonce = Crypto.randomUUID();
          const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce
          );

          let credential;
          try {
            credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
              nonce: hashedNonce,
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

          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: rawNonce,
          });

          const fullName = credential.fullName;
          const nickname = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ');
          if (!error && nickname) {
            const { data } = await supabase.auth.getUser();
            if (data.user) {
              await supabase.from('profiles').update({ nickname }).eq('id', data.user.id);
            }
          }

          return error?.message ?? null;
        } catch (err) {
          return err instanceof Error ? err.message : 'Apple sign-in failed';
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      deleteAccount: async () => {
        const { error } = await supabase.rpc('delete_account');
        if (error) return error.message;
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
