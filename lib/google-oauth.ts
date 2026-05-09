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

  // Snapshot prior user id so the race below can distinguish a genuine new
  // sign-in from spurious TOKEN_REFRESHED / INITIAL_SESSION events that carry
  // the same user.
  const priorUserId = (await supabase.auth.getSession()).data.session?.user.id ?? null;

  // On Android, openAuthSessionAsync never resolves on its own: the OS delivers
  // the donuty:// redirect as a deep link (handled by AuthProvider), but the
  // Chrome Custom Tab activity stays alive — dismissAuthSession() is a no-op on
  // Android. Race against onAuthStateChange so the caller's loading state clears
  // as soon as the session is established, without waiting for the user to back
  // out of the Custom Tab.
  let unsubscribe: (() => void) | null = null;
  const authPromise = new Promise<'auth'>((resolve) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user.id ?? null;
      const isNewUser = newUserId !== null && newUserId !== priorUserId;
      if (isNewUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        resolve('auth');
      }
    });
    unsubscribe = () => subscription.unsubscribe();
  });

  const browserPromise = WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    .then((r) => ({ kind: 'browser' as const, r }));

  try {
    const winner = await Promise.race([
      browserPromise,
      authPromise.then(() => ({ kind: 'auth' as const })),
    ]);

    if (winner.kind === 'auth') {
      // Best-effort on iOS; no-op on Android Custom Tabs — accepted limitation.
      try { await WebBrowser.dismissAuthSession(); } catch {}
      return {};
    }

    // Browser resolved first — iOS fast path (ASWebAuthenticationSession closes
    // cleanly) or user cancelled before completing auth.
    const { r } = winner;
    if (r.type === 'success' && r.url) {
      const { queryParams } = Linking.parse(r.url);
      const code = queryParams?.code as string | undefined;
      if (code) {
        let existingSession = null;
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error) existingSession = session;
        } catch { /* fall through */ }
        if (existingSession) return {};
        const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
        if (ex) return { error: ex.message };
      }
    }
    return {};
  } finally {
    unsubscribe?.();
  }
}
