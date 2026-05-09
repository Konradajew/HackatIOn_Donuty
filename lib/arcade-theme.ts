import { ArcadeColors, ArcadeFonts, ArcadeSpacing } from '@/constants/theme';

export const arc = {
  bg: ArcadeColors.background,
  surface: ArcadeColors.surface,
  surfaceHigh: ArcadeColors.surfaceContainerHigh,
  surfaceHighest: ArcadeColors.surfaceContainerHighest,
  ink: ArcadeColors.onSurface,
  outline: ArcadeColors.outline,
  primaryContainer: ArcadeColors.primaryBright,
  onPrimaryContainer: ArcadeColors.onPrimary,
  secondaryContainer: ArcadeColors.secondaryBright,
  tertiary: ArcadeColors.tertiaryDim,
  onTertiary: ArcadeColors.onTertiary,
  error: ArcadeColors.errorBright,
} as const;

export const arcType = ArcadeFonts;
export const arcSpace = ArcadeSpacing;
