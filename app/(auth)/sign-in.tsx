import { useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google-oauth';
import { ArcadeColors as C, ArcadeSpacing as S, ArcadeFonts as F } from "@/constants/theme";
import { Chamfer, GoogleG } from '@/lib/arcade-shapes';

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color + '55' }]}>
      <Text style={[F.labelSm, { color, textTransform: 'uppercase', letterSpacing: 1 }]}>{label}</Text>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  accent,
  secure,
  keyboardType,
  autoComplete,
  right,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  accent: string;
  secure?: boolean;
  keyboardType?: any;
  autoComplete?: any;
  right?: React.ReactNode;
}) {
  return (
    <View style={[styles.inputCard, { borderColor: accent + '66' }]}>
      <View style={styles.inputHeader}>
        <Text style={[F.labelSm, { color: accent, textTransform: 'uppercase', letterSpacing: 2 }]}>{label}</Text>
        {right}
      </View>
      <TextInput
        style={[F.labelLg, styles.inputText]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize="none"
        placeholderTextColor={C.outline}
        selectionColor={accent}
        cursorColor={accent}
      />
    </View>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('LOGIN FAILED', error.message);
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) Alert.alert('GOOGLE AUTH FAILED', error);
    setLoading(false);
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(255,72,152,0.08)', 'transparent', 'rgba(0,235,215,0.05)']}
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
        <View style={styles.topRow}>
          <Chip label="v0.9.2" color={C.tertiaryDim} />
          <Chip label="◉ ONLINE" color={C.secondaryBright} />
        </View>

        {/* Logo */}
        <View style={styles.logoBlock}>
          <Text style={[styles.logoText, { color: C.secondaryBright, position: 'absolute', left: 6, top: 6 }]} aria-hidden>
            TRICARD
          </Text>
          <Text style={[styles.logoText, { color: C.primaryBright, position: 'absolute', left: 3, top: 3 }]} aria-hidden>
            TRICARD
          </Text>
          <Text style={[styles.logoText, { color: C.onSurface }]}>TRICARD</Text>
          <View style={styles.logoDiamond} />
        </View>
        <Text style={[F.labelSm, styles.logoSub]}>SIGN · IN · TO · PLAY</Text>

        <View style={styles.form}>
          <InputField
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            accent={C.secondaryBright}
            keyboardType="email-address"
            autoComplete="email"
          />
          <InputField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            accent={C.primaryBright}
            secure={!showPass}
            right={
              <Pressable onPress={() => setShowPass(v => !v)}>
                <Text style={[F.labelSm, styles.showPill]}>{showPass ? 'HIDE' : 'SHOW'}</Text>
              </Pressable>
            }
          />

          <View style={styles.rememberRow}>
            <View style={styles.checkRow}>
              <View style={[styles.checkbox, { borderColor: C.secondaryBright }]}>
                <Text style={{ color: C.secondaryBright, fontSize: 9 }}>✓</Text>
              </View>
              <Text style={[F.labelSm, { color: C.outline, letterSpacing: 1 }]}>REMEMBER ME</Text>
            </View>
            <Text style={[F.labelSm, { color: C.tertiaryDim, letterSpacing: 1 }]}>FORGOT?</Text>
          </View>

          <Pressable
            onPress={signIn}
            disabled={loading}
            style={({ pressed }) => pressed ? { opacity: 0.85 } : undefined}
          >
            <Chamfer
              fill={C.primaryBright}
              stroke={C.primaryBright}
              strokeWidth={1.5}
              glow={C.primaryBright}
              glowRadius={16}
              chamfer={[0, 8, 0, 8]}
              style={styles.primaryBtn}
            >
              <View style={styles.ctaInner}>
                <View>
                  <Text style={[styles.ctaTitle, { color: C.background }]}>
                    {loading ? 'SIGNING IN...' : 'SIGN IN'}
                  </Text>
                  <Text style={[F.labelSm, { color: C.background, opacity: 0.7, letterSpacing: 1, marginTop: 2 }]}>
                    resume your match log
                  </Text>
                </View>
              </View>
            </Chamfer>
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={[F.labelSm, { color: C.outline, letterSpacing: 3, marginHorizontal: S.sm }]}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={handleGoogle}
          disabled={loading}
          style={({ pressed }) => pressed ? { opacity: 0.85 } : undefined}
        >
          <Chamfer
            fill={C.surface}
            stroke={C.secondaryBright}
            strokeWidth={1.5}
            chamfer={[0, 8, 0, 8]}
          >
            <View style={styles.googleInner}>
              <View style={styles.googleLeft}>
                <GoogleG size={20} />
                <View style={{ marginLeft: S.sm }}>
                  <Text style={[styles.ctaTitle, { color: C.onSurface }]}>GOOGLE</Text>
                  <Text style={[F.labelSm, { color: C.outline, letterSpacing: 1, marginTop: 2 }]}>one-tap auth</Text>
                </View>
              </View>
            </View>
          </Chamfer>
        </Pressable>

        {/* Decorative card frames */}
        <View style={[styles.deco, styles.decoLeft]} pointerEvents="none" />
        <View style={[styles.deco, styles.decoRight]} pointerEvents="none" />

        <View style={styles.footer}>
          <Text style={[F.labelSm, { color: C.outline, letterSpacing: 1 }]}>NEW PLAYER? </Text>
          <Link href="/sign-up" asChild>
            <Pressable>
              <Text style={[F.labelSm, { color: C.tertiaryDim, letterSpacing: 1 }]}>CREATE ACCOUNT ▸</Text>
            </Pressable>
          </Link>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: S.lg,
  },
  chip: {
    paddingHorizontal: S.sm + 2,
    paddingVertical: S.xs + 1,
    backgroundColor: C.surface,
    borderWidth: 1,
  },
  logoBlock: {
    alignSelf: 'center',
    marginBottom: S.xs,
  },
  logoText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 52,
    letterSpacing: 6,
    lineHeight: 58,
  },
  logoDiamond: {
    position: 'absolute',
    top: -8,
    right: -12,
    width: 14,
    height: 14,
    backgroundColor: C.tertiaryDim,
    transform: [{ rotate: '45deg' }],
  },
  logoSub: {
    color: C.outline,
    textAlign: 'center',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: S.xl,
  },
  form: {
    gap: S.sm,
  },
  inputCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    padding: S.sm + 2,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.xs + 2,
  },
  inputText: {
    color: C.onSurface,
    paddingVertical: 0,
  },
  showPill: {
    color: C.outline,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    paddingHorizontal: S.xs + 2,
    paddingVertical: 2,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: S.xs,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs + 2,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    marginTop: S.xs,
  },
  ctaInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.md + 2,
    paddingVertical: S.md + 2,
  },
  ctaTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    letterSpacing: 2,
    lineHeight: 19,
  },
  ctaGlyph: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 19,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: S.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.surfaceContainerHigh,
  },
  googleInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.md,
    paddingVertical: S.md + 2,
  },
  googleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deco: {
    position: 'absolute',
    width: 72,
    height: 102,
    borderWidth: 1.5,
    opacity: 0.3,
  },
  decoLeft: {
    left: -28,
    top: 220,
    borderColor: C.tertiaryDim,
    transform: [{ rotate: '-18deg' }],
  },
  decoRight: {
    right: -28,
    top: 360,
    borderColor: C.secondaryBright,
    transform: [{ rotate: '16deg' }],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: S.xl,
  },
});
