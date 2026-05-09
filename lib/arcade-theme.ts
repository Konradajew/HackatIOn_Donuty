// Canonical token source: design_arcade_neon.md (Material-3-style)
// Colors map 1:1 to M3 role names from the spec.
export const arc = {
  // Background / surface tonal layers
  bg: '#13121c',
  surfaceLowest: '#0d0d16',
  surfaceLow: '#1b1b24',
  surface: '#1f1f28',
  surfaceHigh: '#292933',
  surfaceHighest: '#34343e',
  surfaceBright: '#393843',
  // Text
  ink: '#e4e1ee',
  inkVariant: '#e3bdc7',
  // Outline
  outline: '#aa8891',
  outlineVariant: '#5b3f47',
  // Primary — Electric Pink
  primary: '#ffb0c9',
  primaryContainer: '#ff4898',
  onPrimary: '#650034',
  onPrimaryContainer: '#58002d',
  inversePrimary: '#b90064',
  // Secondary — Cyan/Teal
  secondary: '#9ffff1',
  secondaryContainer: '#00ebd7',
  onSecondary: '#003732',
  onSecondaryContainer: '#00655c',
  // Tertiary — Neon Lime
  tertiary: '#a7d700',
  tertiaryContainer: '#799d00',
  onTertiary: '#273500',
  onTertiaryContainer: '#212e00',
  // Error
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  onErrorContainer: '#ffdad6',
} as const;

// Typography presets — fontFamily strings match loaded font names exactly.
// Space Grotesk → headlines/body; JetBrains Mono → labels/stats
export const arcType = {
  displayLg: {
    fontFamily: 'SpaceGrotesk_700Bold' as const,
    fontSize: 48,
    lineHeight: 53,
    letterSpacing: -0.96,
  },
  headlineLg: {
    fontFamily: 'SpaceGrotesk_700Bold' as const,
    fontSize: 32,
    lineHeight: 38,
  },
  headlineLgMb: {
    fontFamily: 'SpaceGrotesk_700Bold' as const,
    fontSize: 24,
    lineHeight: 29,
  },
  headlineMd: {
    fontFamily: 'SpaceGrotesk_600SemiBold' as const,
    fontSize: 20,
    lineHeight: 26,
  },
  bodyLg: {
    fontFamily: 'SpaceGrotesk_400Regular' as const,
    fontSize: 18,
    lineHeight: 27,
  },
  bodyMd: {
    fontFamily: 'SpaceGrotesk_400Regular' as const,
    fontSize: 16,
    lineHeight: 24,
  },
  labelLg: {
    fontFamily: 'JetBrainsMono_500Medium' as const,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: 0.7,
  },
  labelMd: {
    fontFamily: 'JetBrainsMono_500Medium' as const,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  labelSm: {
    fontFamily: 'JetBrainsMono_400Regular' as const,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.0,
  },
} as const;

// Spacing — 4px base unit from design_arcade_neon.md
export const arcSpace = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;
