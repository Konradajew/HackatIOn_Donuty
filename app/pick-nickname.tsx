import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { isNicknameTaken, upsertNickname } from '@/lib/profile';
import { useAuth } from '@/lib/auth-context';
import { arc, arcSpace, arcType } from '@/lib/arcade-theme';

const NICK_RE = /^[A-Z0-9_]*$/;

type RuleState = 'pass' | 'fail' | 'pending' | 'idle';

function RuleRow({ label, state }: { label: string; state: RuleState }) {
  const pass = state === 'pass';
  const checking = state === 'pending';
  const color = pass ? arc.tertiary : state === 'idle' ? arc.outline : arc.error;
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleCheck, { borderColor: color }]}>
        {checking
          ? <ActivityIndicator size={8} color={arc.secondaryContainer} />
          : pass
            ? <Text style={{ color: arc.bg, fontSize: 9 }}>✓</Text>
            : null
        }
      </View>
      <Text style={[arcType.labelSm, { color, letterSpacing: 1 }]}>{label}</Text>
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

  function handleChange(text: string) {
    const upper = text.toUpperCase();
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
            <Text style={[arcType.labelMd, { color: arc.ink }]}>←</Text>
          </Pressable>
          <View style={{ flex: 1, marginLeft: arcSpace.sm }}>
            <Text style={[arcType.headlineMd, { color: arc.ink, letterSpacing: 2, textTransform: 'uppercase' }]}>
              Pick Handle
            </Text>
            <Text style={[arcType.labelSm, { color: arc.outline, letterSpacing: 1, marginTop: 2 }]}>
              STEP 02 / 03 · NEW PLAYER
            </Text>
          </View>
          <View style={[styles.xpBadge, { borderColor: arc.tertiary + '55', backgroundColor: arc.tertiary + '11' }]}>
            <Text style={[arcType.labelSm, { color: arc.tertiary, letterSpacing: 1 }]}>+15 XP</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={styles.progressFill}>
            <LinearGradient
              colors={[arc.secondaryContainer, arc.secondaryContainer + 'cc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View style={[styles.progressNotch, { left: '33%' }]} />
          <View style={[styles.progressNotch, { left: '66%' }]} />
        </View>

        {/* Avatar preview */}
        <View style={styles.avatarCard}>
          <LinearGradient
            colors={[arc.primaryContainer, arc.secondaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarBox}
          >
            <Text style={[arcType.headlineMd, { color: arc.bg }]}>{initial}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                arcType.headlineMd,
                { color: upperNick.length > 0 ? arc.ink : arc.outline, letterSpacing: 1 },
              ]}
              numberOfLines={1}
            >
              {upperNick.length > 0 ? upperNick : 'PICK ONE'}
            </Text>
            <Text style={[arcType.labelSm, { color: arc.outline, letterSpacing: 1, marginTop: 2 }]}>
              LV.01 · 0 XP · ROOKIE
            </Text>
          </View>
          <View style={[styles.freePill, { borderColor: arc.tertiary + '55', backgroundColor: arc.tertiary + '11' }]}>
            <Text style={[arcType.labelSm, { color: arc.tertiary, letterSpacing: 1 }]}>◉ FREE</Text>
          </View>
        </View>

        {/* Profile-fetch error retry */}
        {profileError && (
          <Pressable style={styles.retryPill} onPress={refreshProfile}>
            <Text style={[arcType.labelSm, { color: arc.error, letterSpacing: 1 }]}>⚠ FETCH ERROR — TAP TO RETRY</Text>
          </Pressable>
        )}

        {/* Big input */}
        <View style={styles.inputBox}>
          <View style={styles.inputTopRow}>
            <Text style={[arcType.labelSm, { color: arc.tertiary, letterSpacing: 2 }]}>YOUR HANDLE</Text>
            <Text style={[arcType.labelSm, { color: arc.outline, letterSpacing: 1 }]}>{upperNick.length} / 16</Text>
          </View>
          <TextInput
            style={[arcType.headlineLgMb, styles.inputText]}
            value={upperNick}
            onChangeText={handleChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            placeholderTextColor={arc.outline}
            placeholder="TYPE HERE"
            selectionColor={arc.tertiary}
            cursorColor={arc.tertiary}
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
            <Text style={[arcType.labelMd, { color: arc.ink, letterSpacing: 2 }]}>
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
              ? <ActivityIndicator color={arc.onTertiary} size="small" />
              : (
                <>
                  <Text style={[arcType.labelMd, { color: arc.onTertiary, letterSpacing: 2, marginLeft: arcSpace.xs }]}>
                    ENTER GAME
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
    backgroundColor: arc.bg,
  },
  scroll: {
    paddingHorizontal: arcSpace.md,
    paddingTop: 64,
    paddingBottom: arcSpace.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: arcSpace.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBadge: {
    paddingHorizontal: arcSpace.sm,
    paddingVertical: arcSpace.xs,
    borderWidth: 1,
  },
  progressTrack: {
    height: 10,
    backgroundColor: arc.surfaceHigh,
    marginBottom: arcSpace.md,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    width: '66%',
    height: '100%',
    overflow: 'hidden',
    shadowColor: arc.secondaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  progressNotch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: arc.bg,
    opacity: 0.6,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: arcSpace.sm + 4,
    marginBottom: arcSpace.md,
    gap: arcSpace.sm + 4,
  },
  avatarBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freePill: {
    paddingHorizontal: arcSpace.sm,
    paddingVertical: arcSpace.xs,
    borderWidth: 1,
  },
  retryPill: {
    backgroundColor: arc.errorContainer,
    borderWidth: 1,
    borderColor: arc.error + '55',
    padding: arcSpace.sm,
    marginBottom: arcSpace.md,
    alignItems: 'center',
  },
  inputBox: {
    backgroundColor: arc.surface,
    borderWidth: 1.5,
    borderColor: arc.tertiary,
    padding: arcSpace.sm + 4,
    marginBottom: arcSpace.sm,
    shadowColor: arc.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  inputTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: arcSpace.xs + 2,
  },
  inputText: {
    color: arc.ink,
    paddingVertical: 0,
  },
  rulesPanel: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: arcSpace.sm + 2,
    gap: arcSpace.xs + 2,
    marginBottom: arcSpace.xl,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: arcSpace.sm,
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
    gap: arcSpace.sm,
  },
  backBtnBottom: {
    flex: 1,
    paddingVertical: arcSpace.sm + 4,
    borderWidth: 1,
    borderColor: arc.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: arcSpace.sm + 4,
    backgroundColor: arc.tertiary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: arc.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
});
