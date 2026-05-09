import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data?.url) return { error: 'Brak URL autoryzacji' };

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // Fast path (iOS / Custom Tab closes cleanly) — exchange code immediately.
  if (res.type === 'success' && res.url) {
    const { queryParams } = Linking.parse(res.url);
    const code = queryParams?.code as string | undefined;
    if (code) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return {};
      const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
      if (ex) return { error: ex.message };
    }
    return {};
  }

  // Android: dismiss/cancel is expected — AuthProvider's deep-link listener completes the flow.
  return {};
}
