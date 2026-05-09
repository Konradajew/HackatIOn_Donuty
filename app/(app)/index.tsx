import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { ArcadeColors as C } from "@/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SW } = Dimensions.get("window");
const GUTTER = 16;

function HudIconButton({
                         icon,
                         onPress,
                       }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
}) {
  return (
      <TouchableOpacity style={s.iconBtn} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={icon} size={18} color={C.outline} />
      </TouchableOpacity>
  );
}

function SoloPlayButton({ onPress }: { onPress: () => void }) {
  return (
      <TouchableOpacity style={s.soloBtn} onPress={onPress} activeOpacity={0.8}>
        <Text style={s.soloBtnTitle}>PLAY SOLO</Text>
      </TouchableOpacity>
  );
}

function MultiButton({ onPress }: { onPress: () => void }) {
  return (
      <TouchableOpacity style={s.multiBtn} onPress={onPress} activeOpacity={0.8}>
        <Text style={s.multiBtnTitle}>PLAY MULTIPLAYER</Text>
      </TouchableOpacity>
  );
}

function GhostButton({
                       label,
                       icon,
                       borderColor,
                       iconColor,
                       onPress,
                     }: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  borderColor: string;
  iconColor: string;
  onPress?: () => void;
}) {
  return (
      <TouchableOpacity
          style={[s.ghostBtn, { borderColor, shadowColor: borderColor }]}
          onPress={onPress}
          activeOpacity={0.8}
      >
        <View style={s.btnLabelGroupCentered}>
          <Ionicons name={icon} size={16} color={iconColor} style={s.btnIcon} />
          <Text style={s.ghostBtnTitle} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </TouchableOpacity>
  );
}

function ExitButton({ onPress }: { onPress: () => void }) {
  return (
      <TouchableOpacity style={s.exitBtn} onPress={onPress} activeOpacity={0.8}>
        <View style={s.btnLabelGroupCentered}>
          <Ionicons
              name="power-outline"
              size={16}
              color={C.error}
              style={s.btnIcon}
          />
          <Text style={s.exitBtnText}>EXIT</Text>
        </View>
      </TouchableOpacity>
  );
}

function TricardLogo() {
  return (
      <View style={s.logoWrapper}>
        <Text style={[s.logoBase, s.logoMain]}>TRICARD</Text>
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

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const username =
      session?.user?.user_metadata?.full_name?.toUpperCase() ??
      session?.user?.email?.split("@")[0]?.toUpperCase() ??
      "PLAYER";

  return (
      <View style={s.root}>
        <View style={s.crtOverlay} pointerEvents="none" />
        <SafeAreaView style={s.safe}>
          {/* ── HUD ── */}
          <View style={s.hud}>
            <View style={s.hudLeft}>
              <HudIconButton icon="settings-outline" />
              <HudIconButton icon="help-circle-outline" />
            </View>

            <View style={s.hudRight}>
              <View style={s.profileText}>
                <Text style={s.profileName}>{username.slice(0, 20)}</Text>
              </View>
              <View style={s.avatar}>
                <Text style={s.avatarLetter}>{username.charAt(0)}</Text>
              </View>
            </View>
          </View>

          {/* ── LOGO ── */}
          <View style={s.logoSection}>
            <DecorativeCard style={s.decorLeft} />
            <DecorativeCard style={s.decorRight} />
            <TricardLogo />
            <Text style={s.tagline}>CARD · BATTLE · TRIVIA</Text>
          </View>

          {/* ── PRZYCISKI ── */}
          <View style={s.buttons}>
            <SoloPlayButton onPress={() => {}} />
            <MultiButton onPress={() => {}} />

            {/* Dwa przyciski obok siebie */}
            <View style={s.ghostRow}>
              <GhostButton
                  label="FORUM"
                  icon="chatbubbles-outline"
                  borderColor={C.tertiary}
                  iconColor={C.tertiary}
              />
              <GhostButton
                  label="DECK"
                  icon="layers-outline"
                  borderColor={C.primaryDim}
                  iconColor={C.primaryDim}
                  onPress={() => router.push("/deck")}
              />
            </View>

            <ExitButton onPress={() => supabase.auth.signOut()} />
          </View>
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

  // ── HUD
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 16 : 4,
    paddingBottom: 8,
  },
  hudLeft: { flexDirection: "row", gap: 8 },
  hudRight: { flexDirection: "row", alignItems: "center", gap: 8 },

  iconBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },

  profileText: { alignItems: "flex-end" },
  profileName: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 14,
    color: C.secondary,
    letterSpacing: 1.2,
  },
  avatar: {
    width: 42,
    height: 42,
    backgroundColor: C.primaryBright,
    borderWidth: 2,
    borderColor: C.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    color: "#000",
  },

  // ── LOGO
  logoSection: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    minHeight: 180,
    marginTop: 50,
    marginBottom: 50,
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
  decorLeft: { left: -20, transform: [{ rotate: "-18deg" }] },
  decorRight: { right: -20, transform: [{ rotate: "18deg" }] },
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

  logoWrapper: {
    width: SW - GUTTER * 2,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBase: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: SW > 380 ? 68 : 56,
    letterSpacing: -2,
    textTransform: "uppercase",
    position: "absolute",
  },
  logoMain: {
    color: "#ffffff",
    textShadowColor: C.primaryDim,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  tagline: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: C.outline,
    letterSpacing: 4,
    marginTop: 12,
    textTransform: "uppercase",
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

  // PLAY SOLO
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

  // PLAY MULTIPLAYER
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

  // KONTENER DLA FORUM I DECK
  ghostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "center",
    width: "70%",
    gap: 12,
  },

  // GHOST (FORUM / DECK)
  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: C.onSurface || "#ffffff",
    letterSpacing: 1.5,
  },

  // EXIT
  exitBtn: {
    alignSelf: "center",
    width: "45%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.error,
    shadowColor: C.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  exitBtnText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 12,
    color: C.onSurface || "#ffffff",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});