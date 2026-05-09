---
name: Arcade Neon
colors:
  surface: '#13121c'
  surface-dim: '#13121c'
  surface-bright: '#393843'
  surface-container-lowest: '#0d0d16'
  surface-container-low: '#1b1b24'
  surface-container: '#1f1f28'
  surface-container-high: '#292933'
  surface-container-highest: '#34343e'
  on-surface: '#e4e1ee'
  on-surface-variant: '#e3bdc7'
  inverse-surface: '#e4e1ee'
  inverse-on-surface: '#302f3a'
  outline: '#aa8891'
  outline-variant: '#5b3f47'
  surface-tint: '#ffb0c9'
  primary: '#ffb0c9'
  on-primary: '#650034'
  primary-container: '#ff4898'
  on-primary-container: '#58002d'
  inverse-primary: '#b90064'
  secondary: '#9ffff1'
  on-secondary: '#003732'
  secondary-container: '#00ebd7'
  on-secondary-container: '#00655c'
  tertiary: '#a7d700'
  on-tertiary: '#273500'
  tertiary-container: '#799d00'
  on-tertiary-container: '#212e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd9e2'
  primary-fixed-dim: '#ffb0c9'
  on-primary-fixed: '#3e001e'
  on-primary-fixed-variant: '#8e004b'
  secondary-fixed: '#37fce8'
  secondary-fixed-dim: '#00decb'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#bff500'
  tertiary-fixed-dim: '#a7d700'
  on-tertiary-fixed: '#151f00'
  on-tertiary-fixed-variant: '#3a4d00'
  background: '#13121c'
  on-background: '#e4e1ee'
  surface-variant: '#34343e'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system establishes a high-octane, competitive atmosphere for a trivia card battler. It merges the nostalgic energy of 80s arcade cabinets with futuristic, digital interfaces. The aesthetic is a hybrid of **Brutalism** and **Glassmorphism**, characterized by aggressive color contrasts, technical precision, and light-emissive surfaces.

The UI should feel "charged"—as if the interface itself is powered by high-voltage neon tubes. Visual interest is maintained through kinetic textures like scanlines and holographic chromatic aberration, ensuring the experience feels immersive and game-centric rather than utilitarian.

## Colors

The palette is anchored by a deep space-black neutral to provide maximum contrast for the neon primaries. 

- **Electric Pink (#FF1F8F):** Used for critical actions, player health, and high-intensity alerts.
- **Cyan/Teal (#19F0DC):** Used for technical data, secondary navigation, and "safe" player states.
- **Neon Lime (#C8FF1A):** Reserved for success states, energy meters, and "Ready" indicators.

All interactive elements should utilize a "glow" state using the provided RGBA variables to simulate light emission against the dark background. Surfaces should occasionally use a 2% opacity scanline overlay to reinforce the arcade hardware feel.

## Typography

The typography strategy relies on the tension between the geometric, expressive **Space Grotesk** and the rigid, technical **JetBrains Mono**.

- **Space Grotesk** is for narrative, headlines, and card titles. In its largest weights, it should be set with tight letter-spacing to feel impactful.
- **JetBrains Mono** is reserved for all UI labels, statistics, countdowns, and technical readouts. It should always be used for numerical data to maintain an "arcade terminal" look.
- Use **Uppercase** styling for `label-sm` and `label-md` to enhance the industrial aesthetic.

## Layout & Spacing

This design system uses a **Fluid Grid** based on a 4px base unit. 

- **Grid:** A 12-column grid for desktop and 4-column grid for mobile.
- **Rhythm:** Spacing is tight and intentional. Elements are grouped closely to mimic the dense information display of a fighter-game HUD.
- **Safe Areas:** Maintain a 16px internal margin on mobile to ensure critical battle UI (health bars, timers) is not obscured by physical device corners.
- **Adaptation:** On mobile, the card tray occupies the bottom 30% of the screen, while the trivia prompt takes the center. On desktop, these elements shift to a more horizontal orientation to maximize the "stadium" feel of the battle arena.

## Elevation & Depth

Depth is communicated through **light emission** rather than physical shadows. 

- **Tonal Layers:** Surfaces further back are darker (`#0B0B14`). Elevated surfaces (cards, modals) use `#1C1C29` with a semi-transparent cyan or pink border.
- **Neon Glow:** Active or "High-Elevation" elements utilize `box-shadow` with large blur radii and the primary or secondary glow colors to simulate light casting onto the background.
- **Holographic Layers:** High-value cards use a glassmorphic overlay with a `backdrop-filter: blur(10px)` and a subtle diagonal linear gradient of Electric Pink to Cyan at 20% opacity.
- **Scanlines:** A fixed overlay across the entire viewport provides a subtle texture that grounds all elements in a physical "CRT" space.

## Shapes

The shape language is **Sharp (0px)**. All containers, buttons, and cards must have perfectly square corners to lean into the digital-brutalist aesthetic. 

- **Angled Accents:** Use 45-degree chamfered corners for special UI elements like "Next Round" buttons or player avatars to create a more aggressive, aerodynamic feel.
- **Borders:** Every container should have a minimum 1px solid border. Active containers should have a 2px "neon" border with a matching outer glow.

## Components

### Buttons
Primary buttons use a solid Electric Pink fill with black JetBrains Mono text. On hover, they emit a pink outer glow. Secondary buttons are ghost-style with a Cyan border and Cyan text.

### Cards
Cards are the center of the experience. They feature a `#14141F` background, a 1px border, and a scanline texture. When a card is selected, it gains a "Holographic" sheen—a moving gradient overlay that shifts based on the device's tilt (or mouse movement).

### HUD Labels
Statistical readouts (Score, Time, Multiplier) should be wrapped in small, sharp-edged boxes with `label-sm` text. Use Neon Lime for positive multipliers and Electric Pink for low-time warnings.

### Input Fields
Inputs are simple 1px Cyan underlines or full rectangles with no fill. The cursor should be a solid, blinking Cyan block, reminiscent of a terminal prompt.

### Progress Bars
Health and energy bars are segmented into blocks rather than a smooth fill, reinforcing the retro-digital feel. Use Neon Lime for energy and Electric Pink for health.