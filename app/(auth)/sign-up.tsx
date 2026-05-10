import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ArcadeColors as C, ArcadeFonts as F, ArcadeSpacing as S } from "@/constants/theme";
import { GoogleG } from "@/lib/arcade-shapes";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/google-oauth";

const { width: SW } = Dimensions.get("window");
const GUTTER = 16;

function TricardLogo() {
  return (
      <View style={s.logoBlock}>
        <View style={s.logoDiamond} />
        <Text style={[s.logoText, { color: C.secondaryBright, position: 'absolute', left: 6, top: 6 }]} aria-hidden>
          TRICARD
        </Text>
        <Text style={[s.logoText, { color: C.primaryBright, position: 'absolute', left: 3, top: 3 }]} aria-hidden>
          TRICARD
        </Text>
        <Text style={[s.logoText, { color: C.onSurface }]}>TRICARD</Text>
      </View>
  );
}

function DecorativeCard({ style }: { style?: object }) {
  return (
      <View style={[s.decorCard, style]}>
        <View style={s.decorLine} />
        <View style={[s.decorLine, { top: 16 }]} />
        <View style={[s.decorLine, { top: 32 }]} />
        <View style={s.decorCorner} />
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
                      hint,
                    }: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  accent: string;
  secure?: boolean;
  keyboardType?: any;
  autoComplete?: any;
  right?: React.ReactNode;
  hint?: string;
}) {
  return (
      <View style={s.inputCard}>
        <View style={s.inputHeader}>
          <Text style={s.inputLabel}>{label}</Text>
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
            placeholderTextColor={C.outline}
            selectionColor={accent}
            cursorColor={accent}
        />
        {hint && (
            <Text style={[F.labelSm, { color: C.outline, marginTop: S.xs, letterSpacing: 0.5 }]}>{hint}</Text>
        )}
      </View>
  );
}

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert("REGISTER FAILED", error.message);
    else Alert.alert("CHECK YOUR EMAIL", "Confirm your account to continue.");
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) Alert.alert("GOOGLE AUTH FAILED", error);
    setLoading(false);
  }

  return (
      <View style={s.root}>
        <View style={s.crtOverlay} pointerEvents="none" />
        <SafeAreaView style={s.safe}>

          {/* ── LOGO ── */}
          <View style={s.logoSection}>
            <DecorativeCard style={s.decorLeft} />
            <DecorativeCard style={s.decorRight} />
            <TricardLogo />
            <Text style={s.tagline}>SIGN · UP · TO · PLAY</Text>
          </View>

          <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
          >

            {/* ── FORM ── */}
            <View style={s.form}>
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
                  hint="min. 6 characters"
                  right={
                    <TouchableOpacity onPress={() => setShowPass((v) => !v)} activeOpacity={0.7}>
                      <Text style={s.showPill}>{showPass ? "HIDE" : "SHOW"}</Text>
                    </TouchableOpacity>
                  }
              />
            </View>

            {/* ── PRZYCISKI ── */}
            <View style={s.buttons}>
              <TouchableOpacity
                  style={s.soloBtn}
                  onPress={signUp}
                  disabled={loading}
                  activeOpacity={0.8}
              >
                <Text style={s.soloBtnTitle}>{loading ? "REGISTERING..." : "REGISTER"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={s.multiBtn}
                  onPress={handleGoogle}
                  disabled={loading}
                  activeOpacity={0.8}
              >
                <View style={s.btnLabelGroupCentered}>
                  <GoogleG size={16} />
                  <Text style={[s.multiBtnTitle, { marginLeft: 8 }]}>GOOGLE</Text>
                </View>
              </TouchableOpacity>

              <Link href="/sign-in" asChild>
                <TouchableOpacity style={s.signupBtn} activeOpacity={0.8}>
                  <View style={s.btnLabelGroupCentered}>
                    <Ionicons
                        name="log-in-outline"
                        size={16}
                        color={C.tertiary}
                        style={s.btnIcon}
                    />
                    <Text style={s.signupBtnText}>SIGN IN</Text>
                  </View>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  crtOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    opacity: 0.04,
  },
  safe: {
    flex: 1,
    paddingHorizontal: GUTTER,
  },

  // ── LOGO
  logoSection: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    minHeight: 180,
    marginTop: 50,
    marginBottom: 40,
  },

  decorCard: {
    position: "absolute",
    width: 85,
    height: 122,
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    overflow: "hidden",
  },
  decorLeft: { left: -25, transform: [{ rotate: "-18deg" }] },
  decorRight: { right: -25, transform: [{ rotate: "18deg" }] },
  decorLine: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: C.outlineVariant,
    opacity: 0.6,
  },
  decorCorner: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    opacity: 0.6,
  },

  logoBlock: {
    alignSelf: "center",
    marginBottom: S.xs,
  },
  logoText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 52,
    letterSpacing: 6,
    lineHeight: 58,
  },
  logoDiamond: {
    position: "absolute",
    top: -8,
    left: -12,
    width: 14,
    height: 14,
    backgroundColor: C.tertiaryDim,
    transform: [{ rotate: "45deg" }],
  },

  tagline: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: C.outline,
    letterSpacing: 4,
    marginTop: 12,
    textTransform: "uppercase",
  },

  // ── FORM
  form: {
    gap: 12,
    marginBottom: 24,
  },
  inputCard: {
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 14,
    padding: 14,
  },

  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    color: C.outline,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  inputText: {
    color: C.onSurface,
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 14,
    paddingVertical: 0,
  },
  showPill: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    color: C.outline,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  // ── PRZYCISKI
  buttons: {
    paddingBottom: Platform.OS === "android" ? 20 : 8,
    gap: 16,
  },
  btnLabelGroupCentered: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnIcon: {
    marginRight: 8,
  },

  // REGISTER (jak SoloBtn w sign-in)
  soloBtn: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.primary,
    width: "70%",
    alignSelf: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 16,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  soloBtnTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: C.onSurface || "#ffffff",
    letterSpacing: 1.5,
  },

  // GOOGLE (jak MultiBtn w sign-in)
  multiBtn: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.secondary,
    width: "70%",
    alignSelf: "center",
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  multiBtnTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: C.onSurface || "#ffffff",
    letterSpacing: 1,
  },

  // SIGN IN (powrót — jak signupBtn w sign-in)
  signupBtn: {
    alignSelf: "center",
    width: "70%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.tertiary,
    shadowColor: C.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signupBtnText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 12,
    color: C.onSurface || "#ffffff",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
