import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const redirectTo = Linking.createURL('/');
  console.log('[google-oauth] redirectTo =', redirectTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data?.url) return { error: 'Brak URL autoryzacji' };

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type === 'cancel' || res.type === 'dismiss') return { error: 'Anulowano logowanie' };
  if (res.type !== 'success') return { error: 'Nie udało się otworzyć przeglądarki' };

  const url = new URL(res.url);
  const code = url.searchParams.get('code');
  if (!code) return { error: 'Brak kodu autoryzacji w odpowiedzi' };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return { error: exchangeError.message };
  return {};
}
