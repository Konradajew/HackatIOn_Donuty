import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { getProfile, Profile } from './profile';

function isInvalidRefreshTokenError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = (err as { message?: unknown }).message;
  return typeof msg === 'string' && msg.includes('Invalid Refresh Token');
}

async function purgeStaleSession() {
  // scope: 'local' clears AsyncStorage without a network call (token already invalid server-side)
  try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
}

type AuthContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: boolean;
  nicknameReady: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  profileLoading: false,
  profileError: false,
  nicknameReady: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);

  // Track which userId we last successfully fetched so stale fetches are dropped.
  const fetchingForRef = useRef<string | null>(null);

  async function fetchProfileFor(userId: string) {
    fetchingForRef.current = userId;
    setProfileLoading(true);
    setProfileError(false);

    const result = await getProfile(userId);

    // Drop result if user changed while we were waiting
    if (fetchingForRef.current !== userId) return;

    if (!result.ok) {
      setProfileError(true);
    } else {
      setProfile(result.profile);
      setProfileError(false);
    }
    setProfileLoading(false);
  }

  const refreshProfile = async () => {
    try {
      const { data: { session: current }, error } = await supabase.auth.getSession();
      if (error && isInvalidRefreshTokenError(error)) { await purgeStaleSession(); return; }
      if (!current?.user.id) return;
      await fetchProfileFor(current.user.id);
    } catch (err) {
      if (isInvalidRefreshTokenError(err)) await purgeStaleSession();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error && isInvalidRefreshTokenError(error)) {
          await purgeStaleSession();
          setSession(null);
        } else {
          setSession(s);
          if (s?.user.id) await fetchProfileFor(s.user.id);
        }
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          await purgeStaleSession();
          setSession(null);
        } else {
          console.warn('[auth] getSession failed:', err);
        }
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        fetchingForRef.current = null;
        setProfile(null);
        setProfileLoading(false);
        setProfileError(false);
        return;
      }
      // Only fire a new profile fetch if user.id actually changed
      if (s.user.id !== fetchingForRef.current) {
        setProfile(null);
        fetchProfileFor(s.user.id);
      }
    });

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code as string | undefined;
      const errorDesc = queryParams?.error_description as string | undefined;
      if (errorDesc) {
        console.warn('[auth] OAuth error:', errorDesc);
        return;
      }
      if (!code) return;
      try {
        const { data: { session: existing }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr && isInvalidRefreshTokenError(sessErr)) {
          await purgeStaleSession();
          // fall through — exchange the fresh OAuth code to establish a new session
        } else if (existing) {
          return;
        }
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          try { await WebBrowser.dismissAuthSession(); } catch {}
        } else {
          console.warn('[auth] exchangeCodeForSession failed:', error.message);
        }
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) await purgeStaleSession();
        else console.warn('[auth] handleUrl failed:', err);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const linkingSub = Linking.addEventListener('url', (e) => handleUrl(e.url));

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const nicknameReady = !!profile?.nickname;

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileLoading, profileError, nicknameReady, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
