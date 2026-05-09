# Graph Report - .  (2026-05-09)

## Corpus Check
- Corpus is ~23,965 words - fits in a single context window. You may not need a graph.

## Summary
- 190 nodes · 248 edges · 26 communities (23 shown, 3 thin omitted)
- Extraction: 76% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI Component Internals|UI Component Internals]]
- [[_COMMUNITY_App Route Files|App Route Files]]
- [[_COMMUNITY_Screen Architecture|Screen Architecture]]
- [[_COMMUNITY_Build Tooling Config|Build Tooling Config]]
- [[_COMMUNITY_UI Component Library|UI Component Library]]
- [[_COMMUNITY_Android Branding Assets|Android Branding Assets]]
- [[_COMMUNITY_Adaptive Icon System|Adaptive Icon System]]
- [[_COMMUNITY_Project Reset Script|Project Reset Script]]
- [[_COMMUNITY_Authentication Subsystem|Authentication Subsystem]]
- [[_COMMUNITY_App Icon Design|App Icon Design]]
- [[_COMMUNITY_Splash Screen Branding|Splash Screen Branding]]
- [[_COMMUNITY_React Logo Assets|React Logo Assets]]
- [[_COMMUNITY_Docker Dev Script|Docker Dev Script]]
- [[_COMMUNITY_Theme System|Theme System]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_External Link Component|External Link Component]]
- [[_COMMUNITY_Haptic Tab Component|Haptic Tab Component]]
- [[_COMMUNITY_Docker Infrastructure|Docker Infrastructure]]

## God Nodes (most connected - your core abstractions)
1. `useThemeColor()` - 8 edges
2. `useAuth()` - 7 edges
3. `expo-router` - 7 edges
4. `supabase` - 6 edges
5. `Sign-In Screen` - 6 edges
6. `App Icon (icon.png)` - 6 edges
7. `Root App Layout` - 5 edges
8. `Sign-Up Screen` - 5 edges
9. `Auth Group Layout (unauthenticated)` - 5 edges
10. `Collapsible UI Component` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Android Icon Background (Adaptive Icon Asset)` --conceptually_related_to--> `Expo App Configuration (app.json/app.config)`  [INFERRED]
  assets/images/android-icon-background.png → app.json
- `Babel Config` --conceptually_related_to--> `Global CSS (NativeWind entry)`  [INFERRED]
  babel.config.js → global.css
- `Root App Layout` --references--> `Global CSS (NativeWind entry)`  [EXTRACTED]
  app/_layout.tsx → global.css
- `Docker Compose expo-app Service` --references--> `detectLanIp Function`  [INFERRED]
  docker-compose.yml → scripts/start-docker.mjs
- `Expo Env Type Declaration` --conceptually_related_to--> `expo-router`  [INFERRED]
  expo-env.d.ts → app/_layout.tsx

## Hyperedges (group relationships)
- **NativeWind Build Pipeline (Babel + Metro + Tailwind)** — babel_config, metro_config, tailwind_config [INFERRED 0.95]
- **Auth Flow Screens (SignIn + SignUp + AuthLayout)** — app_auth_signin, app_auth_signup, app_auth_layout [EXTRACTED 1.00]
- **Supabase Auth Integration (Supabase client + AuthContext + Google OAuth)** — lib_supabase, lib_auth_context, lib_google_oauth [INFERRED 0.95]
- **Authentication Subsystem (Supabase + Google OAuth + AuthContext)** — supabase_supabaseClient, googleoauth_signInWithGoogle, authcontext_AuthProvider [INFERRED 0.95]
- **Theme System (Colors + useColorScheme + useThemeColor)** — theme_Colors, usecolorscheme_useColorScheme, usethemecolor_useThemeColor [INFERRED 0.95]
- **Docker Dev Environment (docker-compose + start-docker + detectLanIp)** — dockercompose_expoApp, startdocker_script, startdocker_detectLanIp [EXTRACTED 1.00]

## Communities (26 total, 3 thin omitted)

### Community 0 - "UI Component Internals"
Cohesion: 0.13
Nodes (18): ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps (+10 more)

### Community 1 - "App Route Files"
Cohesion: 0.18
Nodes (9): Home(), AppLayout(), AuthLayout(), AuthContext, AuthContextType, AuthProvider(), useAuth(), signInWithGoogle() (+1 more)

### Community 2 - "Screen Architecture"
Cohesion: 0.2
Nodes (16): App Home Screen (index), App Group Layout (authenticated), Auth Group Layout (unauthenticated), Sign-In Screen, Sign-Up Screen, Root App Layout, ExternalLink Component, Expo Env Type Declaration (+8 more)

### Community 3 - "Build Tooling Config"
Cohesion: 0.14
Nodes (14): Babel Config, ESLint Config, babel-preset-expo, nativewind/babel preset, nativewind/metro withNativeWind, nativewind/preset (Tailwind), Global CSS (NativeWind entry), config (+6 more)

### Community 4 - "UI Component Library"
Cohesion: 0.22
Nodes (14): HelloWave Component, ParallaxScrollView Component, ThemedText Component, ThemedView Component, Collapsible UI Component, IconSymbol Component (Android/Web / MaterialIcons), IconSymbol Component (iOS / SF Symbols), Theme Constants (Colors) (+6 more)

### Community 5 - "Android Branding Assets"
Cohesion: 0.2
Nodes (14): Android Adaptive Icon System, Android Icon Background (Adaptive Icon Asset), Android Adaptive Icon Foreground (PNG), Donuty App (Hackathon Project), Partial React Logo PNG, Donuty Brand Chevron / Caret Symbol, Brand Color â€” Blue Gradient (Light to Mid Blue), Branding / Decorative Background Asset (+6 more)

### Community 6 - "Adaptive Icon System"
Cohesion: 0.31
Nodes (10): Android Adaptive Icon System, Android Adaptive Icon â€” Monochrome Variant, Android 13+ Themed Icons (Monochrome Layer), Assets Images Directory, Chevron / Caret Logo Mark (Inverted V Shape), Donuty App, Expo App Icon Configuration, Expo Web Support (+2 more)

### Community 7 - "Project Reset Script"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 8 - "Authentication Subsystem"
Cohesion: 0.43
Nodes (7): AuthContextType (Session + loading), AuthProvider Context Component, useAuth Hook, signInWithGoogle Function, AsyncStorage Session Persistence, PKCE Auth Flow Configuration, Supabase Client Instance

### Community 9 - "App Icon Design"
Cohesion: 0.52
Nodes (7): App Icon (icon.png), Blue Chevron / Lambda Symbol, Light Blue Color Scheme, 3D Glossy Skeuomorphic Design Language, Donuty App (Hackathon Project), Expo Default Icon Template, Icon Grid / Safe Zone Guidelines

### Community 10 - "Splash Screen Branding"
Cohesion: 0.43
Nodes (7): Donuty App Branding Identity, Concentric Circles Logo Symbol, Donut Visual Metaphor (top-down view), Expo Splash Screen Loading Context, Subtle Grid Overlay Design Element, Minimalist White & Grey Color Palette, Splash Screen Icon (splash-icon.png)

### Community 11 - "React Logo Assets"
Cohesion: 0.73
Nodes (6): Pixel Density Variant Set, React / React Native Framework, React Logo Asset (Canonical), React Logo (1x), React Logo (2x), React Logo (3x)

### Community 13 - "Theme System"
Cohesion: 0.4
Nodes (5): Colors Theme Tokens, Fonts Theme Tokens, useColorScheme Hook (native), useColorScheme Hook (web/SSR-safe), useThemeColor Hook

### Community 14 - "Project Documentation"
Cohesion: 0.5
Nodes (4): create-expo-app Tool, Expo Project README, File-Based Routing Concept, reset-project Script

### Community 17 - "Haptic Tab Component"
Cohesion: 0.67
Nodes (3): HapticTab Component, expo-haptics, @react-navigation/bottom-tabs

### Community 18 - "Docker Infrastructure"
Cohesion: 1.0
Nodes (3): Docker Compose expo-app Service, detectLanIp Function, start-docker Script

## Ambiguous Edges - Review These
- `Light Blue Color Scheme` → `Donuty App (Hackathon Project)`  [AMBIGUOUS]
  assets/images/icon.png · relation: rationale_for

## Knowledge Gaps
- **51 isolated node(s):** `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }`, `{ withNativeWind }`, `config` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Light Blue Color Scheme` and `Donuty App (Hackathon Project)`?**
  _Edge tagged AMBIGUOUS (relation: rationale_for) - confidence is low._
- **Why does `Root App Layout` connect `Screen Architecture` to `Build Tooling Config`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `Global CSS (NativeWind entry)` connect `Build Tooling Config` to `Screen Architecture`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Component Internals` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Build Tooling Config` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._