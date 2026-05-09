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
- `app/_layout.tsx` — root layout, loads 5 fonts (Space Grotesk 400/600/700 + JetBrains Mono 400/500), keeps splash up until fonts ready, wraps with `AuthProvider`
- `app/(app)/` — protected routes; `_layout.tsx` redirects unauthenticated users to `/sign-in` and users without a nickname to `/pick-nickname`
- `app/(auth)/` — auth routes; `_layout.tsx` redirects authenticated+nickname users to `/`, authenticated+no-nickname users to `/pick-nickname`
- `app/pick-nickname.tsx` — top-level route (outside both groups), accessible only after login but before nickname is set
- `app/auth/callback.tsx` — OAuth deep-link handler (`donuty://auth/callback`)

**State / Data:**
- `lib/auth-context.tsx` — `AuthProvider` + `useAuth()`, exposes `{ session, profile, loading, profileLoading, profileError, nicknameReady, refreshProfile }`. Profile fetch is race-safe (stale fetches dropped via `profileFetchedForUserIdRef`). `loading=true` until both initial session AND profile fetch resolve
- `lib/profile.ts` — `getProfile(userId)`, `isNicknameTaken(nick)`, `upsertNickname(userId, nick)`. Distinguishes "no profile row" from "fetch error"
- `lib/forum-store.tsx` — `QuestionsProvider` + `useQuestions()`, all question/voting state is **client-side only** (not persisted to DB yet); tracks voted IDs in Sets to prevent double-voting
- `lib/supabase.ts` — Supabase client (PKCE flow, AsyncStorage session persistence)
- `lib/google-oauth.ts` — Google OAuth via `expo-web-browser`, handles iOS (sync) and Android (async deep-link) differences

**Three-state auth routing:**
| State | Redirect to |
|---|---|
| No session | `/sign-in` |
| Session + no nickname | `/pick-nickname` |
| Session + nickname set | `/` (app) |

**Path alias:** `@/*` maps to the root (e.g. `import { supabase } from '@/lib/supabase'`).

## Styling System

The app has two distinct visual modes — use the correct one per screen:

### Arcade Neon (all game screens + auth screens)
**Canonical token source: `design_arcade_neon.md`** (Material-3-style spec in the repo root).

Import from `@/lib/arcade-theme`:

```ts
import { arc, arcType, arcSpace } from '@/lib/arcade-theme';

// --- Colors (M3 semantic roles) ---
arc.bg               // '#13121c'  — background
arc.surface          // '#1f1f28'  — card/container
arc.surfaceHigh      // '#292933'  — elevated surface
arc.surfaceHighest   // '#34343e'  — top surface
arc.ink              // '#e4e1ee'  — primary text
arc.outline          // '#aa8891'  — muted/secondary
arc.primaryContainer // '#ff4898'  — Electric Pink fill (buttons, borders)
arc.onPrimaryContainer // '#58002d' — text on pink
arc.secondaryContainer // '#00ebd7' — Cyan fill
arc.tertiary         // '#a7d700'  — Neon Lime (success, submit CTA)
arc.onTertiary       // '#273500'  — text on lime
arc.error            // '#ffb4ab'  — error state

// --- Typography presets (all include fontFamily, fontSize, lineHeight) ---
arcType.displayLg    // Space Grotesk 700 / 48px
arcType.headlineLg   // Space Grotesk 700 / 32px
arcType.headlineLgMb // Space Grotesk 700 / 24px  ← use on mobile headings
arcType.headlineMd   // Space Grotesk 600 / 20px
arcType.bodyLg       // Space Grotesk 400 / 18px
arcType.bodyMd       // Space Grotesk 400 / 16px
arcType.labelLg      // JetBrains Mono 500 / 14px  ← data, stats
arcType.labelMd      // JetBrains Mono 500 / 12px  ← UI labels
arcType.labelSm      // JetBrains Mono 400 / 10px  ← small tags, uppercase

// --- Spacing (4px base unit) ---
arcSpace.xs = 4 / sm = 8 / md = 16 / lg = 24 / xl = 40
```

Arcade screens use **`StyleSheet.create()`** (not Nativewind). Containers use **sharp 0px corners**. Glow effects use `shadowColor` matching the accent color + `shadowOpacity/Radius` (iOS) and `elevation` (Android — no colored glow on Android, accepted).

Background: use `expo-linear-gradient` to approximate the spec's radial gradients. Scanline overlay is optional atmosphere.

### White / plain (deprecated — do not use for new screens)
The original white Nativewind screens have been replaced. All current auth + game screens use Arcade Neon.

## Key Conventions

- **Forum questions** — new questions prepend to top of list in `forum-store.tsx` (`addQuestion` unshifts). Voting is two-step: difficulty rating (1–5) + YES/NO verdict, submitted together via `submitVote(id, { diff, verdict })`
- **Nickname gate** — `nicknameReady = !!profile?.nickname`. Every layout checks `loading || profileLoading` before rendering any redirect to prevent flicker. `refreshProfile()` (from `useAuth`) is called after successful upsert; the gate re-evaluates automatically without `router.replace`
- **Nickname uniqueness** — live availability via debounced `isNicknameTaken` (350ms). Final write (`upsertNickname`) is canonical; on `error.code === '23505'` the UI shows the rule as failed
- **Deep link scheme** is `donuty://` — configured in `app.json` under `android.intentFilters`
- Env vars are prefixed `EXPO_PUBLIC_` (Supabase URL + anon key) — copy `.env.example` to `.env`
- **New Architecture** and **React Compiler** are both enabled (`app.json` → `newArchEnabled`, `experiments.reactCompiler`)
- Typed routes are enabled — use typed `href` props when navigating with `expo-router`

## Supabase — RLS requirements

The `profiles` table must have RLS policies allowing:
- `SELECT` publicly (or for `auth.uid()`) so `isNicknameTaken` works without elevated keys
- `INSERT` / `UPDATE` where `auth.uid() = id` so users can upsert their own profile row

If the upsert silently fails (no row created), RLS is the likely cause.
