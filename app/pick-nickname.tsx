import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { isNicknameTaken, upsertNickname } from '@/lib/profile';
import { useAuth } from '@/lib/auth-context';
import { ArcadeColors as C, ArcadeSpacing as S, ArcadeFonts as F } from "@/constants/theme";

const NICK_RE = /^[A-Z0-9_]*$/;

type RuleState = 'pass' | 'fail' | 'pending' | 'idle';

function RuleRow({ label, state }: { label: string; state: RuleState }) {
  const pass = state === 'pass';
  const checking = state === 'pending';
  const color = pass ? C.tertiaryDim : state === 'idle' ? C.outline : C.error;
  return (
      <View style={styles.ruleRow}>
        <View style={[styles.ruleCheck, { borderColor: color }]}>
          {checking
              ? <ActivityIndicator size={8} color={C.secondaryBright} />
              : pass
                  ? <Text style={{ color: C.background, fontSize: 9 }}>✓</Text>
                  : null
          }
        </View>
        <Text style={[F.labelSm, { color, letterSpacing: 1 }]}>{label}</Text>
      </View>
  );
}

export default function PickNickname() {
  const { session, loading, profileLoading, nicknameReady, refreshProfile, profileError } = useAuth();
  const [nick, setNick] = useState('');
  const [taken, setTaken] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [backPending, setBackPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const upper = value.toUpperCase();
    if (!NICK_RE.test(upper) || upper.length < 3 || upper.length > 16) {
      setTaken(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    setTaken(null);
    debounceRef.current = setTimeout(async () => {
      const isTaken = await isNicknameTaken(upper);
      setTaken(isTaken);
      setChecking(false);
    }, 350);
  }, []);

  // Guard redirects
  if (loading || profileLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (nicknameReady) return <Redirect href="/" />;

  const userId = session.user.id;
  const upperNick = nick.toUpperCase();

  // Validation rules
  const ruleLength = upperNick.length >= 3 && upperNick.length <= 16;
  const ruleChars = NICK_RE.test(upperNick);
  const ruleAvail: RuleState = checking
      ? 'pending'
      : taken === false
          ? 'pass'
          : taken === true
              ? 'fail'
              : 'idle';

  const allValid = ruleLength && ruleChars && ruleAvail === 'pass';

  function handleChange(text: string) {
    const upper = text.toUpperCase();
    setNick(upper);
    checkAvailability(upper);
  }

  function fillSuggestion(name: string) {
    const upper = name.toUpperCase();
    setNick(upper);
    checkAvailability(upper);
  }

  async function handleSubmit() {
    if (!allValid || submitting) return;
    setSubmitting(true);
    const { error } = await upsertNickname(userId, upperNick);
    if (error) {
      if (error.code === '23505') {
        setTaken(true);
        Alert.alert('HANDLE TAKEN', 'Someone grabbed it just now. Pick another.');
      } else {
        Alert.alert('ERROR', error.message);
      }
      setSubmitting(false);
      return;
    }
    await refreshProfile();
    // Gate in this component re-evaluates and redirects to /
  }

  async function handleBack() {
    if (backPending) return;
    setBackPending(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('ERROR', error.message);
      setBackPending(false);
    }
    // context clears session → (auth) layout redirects to /sign-in
  }

  const initial = upperNick.length > 0 ? upperNick[0] : '?';

  return (
      <View style={styles.root}>
        <LinearGradient
            colors={['rgba(255,72,152,0.06)', 'transparent', 'rgba(167,215,0,0.05)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
        />

        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
        >
          {/* Header row */}
          <View style={styles.headerRow}>
            <Pressable
                style={[styles.backBtn, backPending && { opacity: 0.5 }]}
                onPress={handleBack}
                disabled={backPending}
            >
              <Text style={[F.labelMd, { color: C.onSurface }]}>←</Text>
            </Pressable>
            <View style={{ flex: 1, marginLeft: S.sm }}>
              <Text style={[F.headlineMd, { color: C.onSurface, letterSpacing: 2, textTransform: 'uppercase' }]}>
                Choose nickname
              </Text>
            </View>
          </View>

          {/* Profile-fetch error retry */}
          {profileError && (
              <Pressable style={styles.retryPill} onPress={refreshProfile}>
                <Text style={[F.labelSm, { color: C.error, letterSpacing: 1 }]}>⚠ FETCH ERROR — TAP TO RETRY</Text>
              </Pressable>
          )}

          {/* Big input */}
          <View style={styles.inputBox}>
            <View style={styles.inputTopRow}>
              <Text style={[F.labelSm, { color: C.tertiaryDim, letterSpacing: 2 }]}>YOUR HANDLE</Text>
              <Text style={[F.labelSm, { color: C.outline, letterSpacing: 1 }]}>{upperNick.length} / 16</Text>
            </View>
            <TextInput
                style={[F.headlineLgMb, styles.inputText]}
                value={upperNick}
                onChangeText={handleChange}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={16}
                placeholderTextColor={C.outline}
                placeholder="TYPE HERE"
                selectionColor={C.tertiaryDim}
                cursorColor={C.tertiaryDim}
            />
          </View>

          {/* Validation rules */}
          <View style={styles.rulesPanel}>
            <RuleRow label="3 — 16 CHARS" state={upperNick.length === 0 ? 'idle' : ruleLength ? 'pass' : 'fail'} />
            <RuleRow label="A-Z, 0-9, _ ALLOWED" state={upperNick.length === 0 ? 'idle' : ruleChars ? 'pass' : 'fail'} />
            <RuleRow label="HANDLE NOT TAKEN" state={ruleAvail} />
          </View>

          {/* Bottom CTAs */}
          <View style={styles.bottomRow}>
            <Pressable
                style={[styles.backBtnBottom, backPending && { opacity: 0.5 }]}
                onPress={handleBack}
                disabled={backPending}
            >
              <Text style={[F.labelMd, { color: C.onSurface, letterSpacing: 2 }]}>
                {backPending ? '...' : '← BACK'}
              </Text>
            </Pressable>
            <Pressable
                style={[
                  styles.submitBtn,
                  (!allValid || submitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!allValid || submitting}
            >
              {submitting
                  ? <ActivityIndicator color={C.onTertiary} size="small" />
                  : (
                      <>
                        <Text style={[F.labelMd, { color: C.onTertiary, letterSpacing: 2, marginLeft: S.xs }]}>
                          CONFIRM
                        </Text>
                      </>
                  )
              }
            </Pressable>
          </View>
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    paddingHorizontal: S.md,
    paddingTop: 64,
    paddingBottom: S.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPill: {
    backgroundColor: C.errorContainer,
    borderWidth: 1,
    borderColor: C.error + '55',
    padding: S.sm,
    marginBottom: S.md,
    alignItems: 'center',
  },
  inputBox: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.tertiaryDim,
    padding: S.sm + 4,
    marginTop: S.xl,
    marginBottom: S.lg,
    shadowColor: C.tertiaryDim,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  inputTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: S.xs + 2,
  },
  inputText: {
    color: C.onSurface,
    paddingVertical: 0,
  },
  rulesPanel: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    padding: S.md + 2,
    gap: S.sm + 2,
    marginBottom: S.lg,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  ruleCheck: {
    width: 14,
    height: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: S.sm,
  },
  backBtnBottom: {
    flex: 1,
    paddingVertical: S.sm + 4,
    borderWidth: 1,
    borderColor: C.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: S.sm + 4,
    backgroundColor: C.tertiaryDim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.tertiaryDim,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
});