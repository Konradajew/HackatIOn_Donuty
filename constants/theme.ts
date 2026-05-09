/**
 * Arcade Neon Design System
 * Source: design_arcade_neon.md
 */

export const ArcadeColors = {
  // Surfaces
  background: "#13121c",
  surface: "#1f1f28",
  surfaceDim: "#13121c",
  surfaceBright: "#393843",
  surfaceContainerLowest: "#0d0d16",
  surfaceContainerLow: "#1b1b24",
  surfaceContainer: "#1f1f28",
  surfaceContainerHigh: "#292933",
  surfaceContainerHighest: "#34343e",

  // Text
  onSurface: "#e4e1ee",
  onSurfaceVariant: "#e3bdc7",

  // Borders
  outline: "#aa8891",
  outlineVariant: "#5b3f47",

  // Primary — Electric Pink
  primary: "#FF1F8F",
  primaryBright: "#ff4898",
  primaryDim: "#ffb0c9",
  onPrimary: "#650034",

  // Secondary — Cyan / Teal
  secondary: "#19F0DC",
  secondaryBright: "#00ebd7",
  onSecondary: "#003732",

  // Tertiary — Neon Lime
  tertiary: "#C8FF1A",
  tertiaryDim: "#a7d700",
  onTertiary: "#273500",

  // Error
  error: "#ff4444",

  // Utility
  gold: "#FFD700",
} as const;

export const ArcadeFonts = {
  displayLg: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 48,
    letterSpacing: -1,
  },
  headlineLg: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 32 },
  headlineMd: { fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 20 },
  bodyLg: { fontFamily: "SpaceGrotesk_400Regular", fontSize: 18 },
  bodyMd: { fontFamily: "SpaceGrotesk_400Regular", fontSize: 16 },
  labelLg: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 14,
    letterSpacing: 1,
  },
  labelMd: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 12,
    letterSpacing: 1,
  },
  labelSm: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    letterSpacing: 2,
  },
} as const;

export const ArcadeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  gutter: 16,
} as const;

// ── Legacy export — kept so existing components (collapsible, use-theme-color) don't break
const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: ArcadeColors.onSurface,
    background: ArcadeColors.background,
    tint: ArcadeColors.primary,
    icon: ArcadeColors.outline,
    tabIconDefault: ArcadeColors.outline,
    tabIconSelected: ArcadeColors.primary,
  },
};
