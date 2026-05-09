// Arcade Neon - color palette
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
    errorContainer: "#93000a",
    onErrorContainer: "#ffdad6",
    errorBright: "#ffb4ab",

    // Utility
    gold: "#FFD700",

    // Aliases for existing colors from previous arc style
    primaryContainer: "#ff4898",
    secondaryContainer: "#19F0DC",
    tertiaryContainer: "#a7d700",

} as const;

export const ArcadeFonts = {
    displayLg: {
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 48,
        lineHeight: 53,
        letterSpacing: -0.96,
    },

    headlineLg: {
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 32,
        lineHeight: 38,
    },

    headlineLgMb: {
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 24,
        lineHeight: 29,
    },

    headlineMd: {
        fontFamily: "SpaceGrotesk_600SemiBold",
        fontSize: 20,
        lineHeight: 26,
    },

    bodyLg: {
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 18,
        lineHeight: 27,
    },

    bodyMd: {
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 16,
        lineHeight: 24,
    },
    labelLg: {
        fontFamily: "JetBrainsMono_500Medium",
        fontSize: 14,
        lineHeight: 17,
        letterSpacing: 0.7,
    },

    labelMd: {
        fontFamily: "JetBrainsMono_500Medium",
        fontSize: 12,
        lineHeight: 14,
        letterSpacing: 0.6,
    },

    labelSm: {
        fontFamily: "JetBrainsMono_400Regular",
        fontSize: 10,
        lineHeight: 12,
        letterSpacing: 1,
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
