# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Start Expo dev server
npm run start:tunnel   # Start with Expo tunnel (for physical devices)
npm run android        # Run on Android emulator/device
npm run ios            # Run on iOS simulator
npm run web            # Run in browser
npm run lint           # ESLint check
npm run dev:docker     # Run via Docker
npm run dev:docker:tunnel  # Run via Docker with tunnel
```

Always use `npm`, never `bun` or `bunx`.

## Architecture

**Expo Router** (file-based routing, like Next.js for mobile):
- `app/_layout.tsx` — root layout, loads fonts (Space Grotesk + JetBrains Mono), wraps with `AuthProvider`
- `app/(app)/` — protected routes; `_layout.tsx` redirects unauthenticated users to `/sign-in` and wraps with `QuestionsProvider`
- `app/(auth)/` — auth routes; `_layout.tsx` redirects authenticated users to `/`
- `app/auth/callback.tsx` — OAuth deep-link handler (`donuty://auth/callback`)

**State / Data:**
- `lib/auth-context.tsx` — `AuthProvider` + `useAuth()`, manages Supabase session, handles OAuth PKCE code exchange from deep links
- `lib/forum-store.tsx` — `QuestionsProvider` + `useQuestions()`, all question/voting state is **client-side only** (not persisted to DB yet); tracks voted IDs in Sets to prevent double-voting
- `lib/supabase.ts` — Supabase client (PKCE flow, AsyncStorage session persistence)
- `lib/google-oauth.ts` — Google OAuth via `expo-web-browser`, handles iOS (sync) and Android (async deep-link) differences

**Path alias:** `@/*` maps to the root (e.g. `import { supabase } from '@/lib/supabase'`).

## Styling System

The app has two distinct visual modes — use the correct one per screen:

### Arcade Neon (forum screens)
Used in `forum.tsx`, `add-question.tsx`, `question/[id].tsx`. Import from `@/lib/arcade-theme`:

```ts
import { arc, arcFont } from '@/lib/arcade-theme';

// Colors
arc.bg        // '#0B0B14'  — deep space black background
arc.surface   // '#14142B'  — card/container background
arc.surface2  // '#1F1F3D'  — nested surface / darker layer
arc.ink       // '#F0F0FF'  — primary text
arc.dim       // '#6E6E8E'  — secondary/muted text
arc.pink      // '#FF1F8F'  — primary action, highlights
arc.cyan      // '#19F0DC'  — secondary action
arc.lime      // '#C8FF1A'  — success, correct answer, submit CTA
arc.red       // '#FF3B5C'  — error, downvote

// Fonts
arcFont.display     // 'SpaceGrotesk_700Bold'    — headings
arcFont.displayMd   // 'SpaceGrotesk_500Medium'  — body text
arcFont.mono        // 'JetBrainsMono_500Medium' — UI labels, stats
arcFont.monoBold    // 'JetBrainsMono_700Bold'   — numbers, data
```

Forum screens use `StyleSheet.create()` (not Nativewind) to apply `arc` colors and `arcFont` fonts. Containers use sharp 0px border radius. Glow effects are done with `shadowColor` matching the accent color.

### Plain white (auth screens)
Used in `sign-in.tsx`, `sign-up.tsx`, `index.tsx`. These use **Nativewind** (Tailwind CSS class strings like `className="flex-1 bg-white p-4"`).

Do **not** mix the two systems within a single screen. Arcade screens use StyleSheet + arc theme; auth/home screens use Nativewind.

## Key Conventions

- **New questions** are added to the top of the list in `forum-store.tsx` (`addQuestion` prepends)
- **Voting** is two-step: difficulty rating (1–5) + YES/NO verdict, submitted together via `submitVote(id, { diff, verdict })`
- **Deep link scheme** is `donuty://` — configured in `app.json` under `android.intentFilters`
- Env vars are prefixed `EXPO_PUBLIC_` (Supabase URL + anon key) — copy `.env.example` to `.env`
- **New Architecture** and **React Compiler** are both enabled (`app.json` → `newArchEnabled`, `experiments.reactCompiler`)
- Typed routes are enabled — use typed `href` props when navigating with `expo-router`
