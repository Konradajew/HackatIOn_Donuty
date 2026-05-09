
import { ArcadeColors, ArcadeFonts, ArcadeSpacing } from "@/constants/theme";

export const arc = {
    bg: ArcadeColors.background,
    surfaceLowest: ArcadeColors.surfaceContainerLowest,
    surfaceLow: ArcadeColors.surfaceContainerLow,
    surface: ArcadeColors.surface,
    surfaceHigh: ArcadeColors.surfaceContainerHigh,
    surfaceHighest: ArcadeColors.surfaceContainerHighest,
    surfaceBright: ArcadeColors.surfaceBright,
    ink: ArcadeColors.onSurface,
    inkVariant: ArcadeColors.onSurfaceVariant,
    outline: ArcadeColors.outline,
    outlineVariant: ArcadeColors.outlineVariant,
    primary: ArcadeColors.primaryDim,
    primaryContainer: ArcadeColors.primaryBright,
    onPrimary: ArcadeColors.onPrimary,
    onPrimaryContainer: "#58002d",
    inversePrimary: "#b90064",
    secondary: ArcadeColors.secondaryBright,
    secondaryContainer: ArcadeColors.secondaryBright,
    onSecondary: ArcadeColors.onSecondary,
    onSecondaryContainer: "#00655c",
    tertiary: ArcadeColors.tertiaryDim,
    tertiaryContainer: "#799d00",
    onTertiary: ArcadeColors.onTertiary,
    onTertiaryContainer: "#212e00",
    error: "#ffb4ab",
    errorContainer: ArcadeColors.errorContainer,
    onError: "#690005",
    onErrorContainer: ArcadeColors.onErrorContainer,
} as const;

export const arcType = ArcadeFonts;
export const arcSpace = ArcadeSpacing;