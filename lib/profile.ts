import { supabase } from './supabase';

export type Profile = {
  id: string;
  nickname: string | null;
  created_at: string;
};

// Distinguishes "no row yet" (profile: null) from "fetch failed" (ok: false)
export type ProfileLoadResult =
  | { ok: true; profile: Profile | null }
  | { ok: false };

export async function getProfile(userId: string): Promise<ProfileLoadResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, profile: data };
}

// Returns true if the nickname exists for a different user.
// On network error returns false — submit is the canonical uniqueness check.
export async function isNicknameTaken(nick: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nick)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export async function upsertNickname(userId: string, nickname: string) {
  return supabase
    .from('profiles')
    .upsert({ id: userId, nickname }, { onConflict: 'id' })
    .select()
    .single();
}
