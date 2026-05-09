import { useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google-oauth';
import { arc, arcSpace, arcType } from '@/lib/arcade-theme';
import { GoogleG } from '@/lib/arcade-shapes';

const { width: SW } = Dimensions.get('window');

// ── Atomy zgodne z home ─────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.chip, { borderColor: color + '66' }]}>
      <Text style={[s.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function DecorativeCard({ style }: { style?: object }) {
  return (
    <View style={[s.decorCard, style]} pointerEvents="none">
      <View style={s.decorLine} />
      <View style={[s.decorLine, { top: 16 }]} />
      <View style={[s.decorLine, { top: 32 }]} />
      <View style={s.decorCorner} />
    </View>
  );
}

function TricardLogo() {
  return (
    <View style={s.logoWrapper}>
      <Text style={[s.logoBase, s.logoMain]}>TRICARD</Text>
    </View>
  );
}

function InputField({
  label, value, onChangeText, accent, secure, keyboardType, autoComplete, right,
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
    <View style={[s.inputCard, { borderColor: accent + '66' }]}>
      <View style={s.inputHeader}>
        <Text style={[s.inputLabel, { color: accent }]}>{label}</Text>
        {right}
      </View>
      <TextInput
        style={s.inputText}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize="none"
        placeholderTextColor={arc.outline}
        selectionColor={accent}
        cursorColor={accent}
      />
    </View>
  );
}

// ── Główny ekran ────────────────────────────────────────────────────────────
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
    <View style={s.root}>
      <View style={s.crtOverlay} pointerEvents="none" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Status chips (jak HUD na home) ── */}
        <View style={s.topRow}>
          <Chip label="v0.9.2" color={arc.tertiary} />
          <Chip label="◉ ONLINE" color={arc.secondaryContainer} />
        </View>

        {/* ── Logo + decoracje boczne ── */}
        <View style={s.logoSection}>
          <DecorativeCard style={s.decorLeft} />
          <DecorativeCard style={s.decorRight} />
          <TricardLogo />
          <Text style={s.tagline}>SIGN · IN · TO · PLAY</Text>
        </View>

        {/* ── Formularz ── */}
        <View style={s.form}>
          <InputField
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            accent={arc.secondaryContainer}
            keyboardType="email-address"
            autoComplete="email"
          />
          <InputField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            accent={arc.primaryContainer}
            secure={!showPass}
            right={
              <Pressable onPress={() => setShowPass(v => !v)}>
                <Text style={s.showPill}>{showPass ? 'HIDE' : 'SHOW'}</Text>
              </Pressable>
            }
          />

          <View style={s.rememberRow}>
            <View style={s.checkRow}>
              <View style={[s.checkbox, { borderColor: arc.secondaryContainer }]}>
                <Text style={{ color: arc.secondaryContainer, fontSize: 9 }}>✓</Text>
              </View>
              <Text style={s.rememberText}>REMEMBER ME</Text>
            </View>
            <Text style={s.forgotText}>FORGOT?</Text>
          </View>

          {/* ── Submit (pill jak PLAY SOLO) ── */}
          <TouchableOpacity
            onPress={signIn}
            disabled={loading}
            activeOpacity={0.8}
            style={[s.primaryBtn, loading && { opacity: 0.6 }]}
          >
            <Text style={s.primaryBtnText}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Divider ── */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>// OR</Text>
          <View style={s.dividerLine} />
        </View>

        {/* ── Google (pill jak MULTIPLAYER) ── */}
        <TouchableOpacity
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.8}
          style={[s.googleBtn, loading && { opacity: 0.6 }]}
        >
          <View style={s.googleInner}>
            <GoogleG size={18} />
            <Text style={s.googleText}>CONTINUE WITH GOOGLE</Text>
          </View>
        </TouchableOpacity>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerLabel}>NEW PLAYER? </Text>
          <Link href="/sign-up" asChild>
            <Pressable>
              <Text style={s.footerLink}>CREATE ACCOUNT ▸</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

// ── StyleSheet ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: arc.bg },
  crtOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: 0.04,
  },
  scroll: {
    paddingHorizontal: arcSpace.md,
    paddingTop: 64,
    paddingBottom: arcSpace.xl,
  },

  // ── Top chips (HUD)
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: arcSpace.lg,
  },
  chip: {
    paddingHorizontal: arcSpace.sm + 2,
    paddingVertical: arcSpace.xs + 1,
    backgroundColor: arc.surface,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Logo section (z decoracyjnymi kartami jak na home)
  logoSection: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    minHeight: 180,
    marginTop: arcSpace.md,
    marginBottom: arcSpace.lg,
  },
  decorCard: {
    position: 'absolute',
    width: 85,
    height: 122,
    backgroundColor: arc.surfaceHigh,
    borderWidth: 1,
    borderColor: arc.outlineVariant,
    overflow: 'hidden',
  },
  decorLeft: { left: -20, top: 30, transform: [{ rotate: '-18deg' }] },
  decorRight: { right: -20, top: 30, transform: [{ rotate: '18deg' }] },
  decorLine: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: arc.outlineVariant,
    opacity: 0.6,
  },
  decorCorner: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: arc.outlineVariant,
    opacity: 0.6,
  },

  logoWrapper: {
    width: SW - arcSpace.md * 2,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBase: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: SW > 380 ? 60 : 50,
    letterSpacing: -2,
    textTransform: 'uppercase',
    position: 'absolute',
  },
  logoMain: {
    color: '#ffffff',
    textShadowColor: arc.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  tagline: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 4,
    marginTop: arcSpace.sm + 4,
    textTransform: 'uppercase',
    position: 'absolute',
    bottom: -8,
  },

  // ── Form
  form: {
    gap: arcSpace.sm,
    marginTop: arcSpace.sm,
  },
  inputCard: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    padding: arcSpace.sm + 2,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: arcSpace.xs + 2,
  },
  inputLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  inputText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: arc.ink,
    paddingVertical: 0,
    letterSpacing: 0.5,
  },
  showPill: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    paddingHorizontal: arcSpace.xs + 2,
    paddingVertical: 2,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: arcSpace.xs,
    paddingHorizontal: arcSpace.xs,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: arcSpace.xs + 2,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 1,
  },
  forgotText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.tertiary,
    letterSpacing: 1,
  },

  // ── Pill buttons (jak na home)
  primaryBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: arc.primaryContainer,
    width: '100%',
    alignSelf: 'center',
    shadowColor: arc.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: arcSpace.sm,
  },
  primaryBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: arc.ink,
    letterSpacing: 2,
  },
  googleBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: arc.secondaryContainer,
    width: '100%',
    alignSelf: 'center',
    shadowColor: arc.secondaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: arcSpace.sm + 2,
  },
  googleText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: arc.ink,
    letterSpacing: 1.5,
  },

  // ── Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: arcSpace.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: arc.surfaceHigh,
  },
  dividerText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 3,
    marginHorizontal: arcSpace.sm,
  },

  // ── Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: arcSpace.xl,
  },
  footerLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 1,
  },
  footerLink: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.tertiary,
    letterSpacing: 1,
  },
});
