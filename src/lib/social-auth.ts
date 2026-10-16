import { Platform } from 'react-native';

// Apple/Google sign-in goes through the Render backend (shared with Atossa:
// https://atossa-backend.onrender.com, `backend/app/routers/basket_buddy.py`
// in the atossa repo). The app gets an identity token from Apple or Google,
// the server verifies it and answers with a normal Supabase session for this
// project, which use-auth.ts installs with `supabase.auth.setSession`.
const authApiUrl = process.env.EXPO_PUBLIC_AUTH_API_URL ?? 'https://atossa-backend.onrender.com';

// Google OAuth client IDs (Google Cloud Console). The server checks ID tokens
// against the Web client, so GoogleSignin must request it as the audience
// even on iOS/Android; the iOS/Android clients are what let Google issue the
// device a token at all.
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

// Lazy-require Google Sign-In so the bundle still loads in Expo Go and on the
// web, which don't include the native module. The stub's signIn() throws a
// message the welcome screen shows as-is.
let GoogleSignin: any;
let statusCodes: Record<string, string> = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
};
try {
  if (Platform.OS === 'web') throw new Error('web');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
  GoogleSignin.configure({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId || undefined,
    scopes: ['profile', 'email'],
  });
} catch {
  GoogleSignin = {
    hasPlayServices: async () => true,
    signIn: async () => {
      throw new Error('Google sign-in needs the App Store / Play Store build, not Expo Go.');
    },
    signOut: async () => {},
  };
}

export interface SupabaseTokens {
  access_token: string;
  refresh_token: string;
}

async function exchange(
  provider: 'apple' | 'google',
  body: { id_token: string; display_name?: string; access_token?: string }
): Promise<SupabaseTokens> {
  const response = await fetch(`${authApiUrl}/basket-buddy/auth/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token || !data?.refresh_token) {
    const detail = typeof data?.detail === 'string' ? data.detail : null;
    throw new Error(detail ?? `Sign-in failed (${response.status})`);
  }
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

export function exchangeAppleToken(identityToken: string, displayName: string | null) {
  return exchange('apple', { id_token: identityToken, display_name: displayName ?? undefined });
}

/** Runs the native Google sheet; resolves to null when the user cancels. */
export async function signInWithGoogleNative(): Promise<SupabaseTokens | null> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (result?.type === 'cancelled') return null;
    // v16 returns { type: 'success', data: { idToken, user } }; older versions
    // returned the user object directly.
    const userInfo = result?.data ?? result;
    const idToken: string | undefined = userInfo?.idToken;
    if (!idToken) throw new Error('No identity token received from Google');

    // Google's iOS ID tokens carry an `at_hash` claim that the server checks
    // against the access token, so send that too.
    const { accessToken } = await GoogleSignin.getTokens();
    return await exchange('google', {
      id_token: idToken,
      display_name: userInfo?.user?.name ?? undefined,
      access_token: accessToken,
    });
  } catch (err: any) {
    if (err?.code === statusCodes.SIGN_IN_CANCELLED || err?.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    throw err;
  }
}

/** Forget the Google account so the next sign-in shows the account picker again. */
export async function signOutOfGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google, or the native module is missing — nothing to do.
  }
}
