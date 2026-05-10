# Tricard — Dokumentacja techniczna

> Dokument opisuje architekturę i implementację aplikacji **Tricard** (Donuty) — mobilnej gry karcianej opartej na quizach. Wizja produktu znajduje się w [README.md](README.md). Tutaj skupiamy się wyłącznie na warstwie technicznej: stack, struktura, frontend, backend (Supabase Postgres) i konwencje.

---

## Spis treści

1. [Stack technologiczny](#1-stack-technologiczny)
2. [Struktura repozytorium](#2-struktura-repozytorium)
3. [Konfiguracja środowiska](#3-konfiguracja-środowiska)
4. [Frontend — routing i bramki autoryzacyjne](#4-frontend--routing-i-bramki-autoryzacyjne)
5. [Frontend — moduły domenowe](#5-frontend--moduły-domenowe)
6. [Frontend — system designu (Arcade Neon)](#6-frontend--system-designu-arcade-neon)
7. [Backend — model danych (Supabase Postgres)](#7-backend--model-danych-supabase-postgres)
8. [Backend — funkcje RPC](#8-backend--funkcje-rpc)
9. [Logika gry](#9-logika-gry)
10. [Logika forum i głosowań](#10-logika-forum-i-głosowań)
11. [Konwencje kodowe](#11-konwencje-kodowe)
12. [Znane ograniczenia i ryzyka](#13-znane-ograniczenia-i-ryzyka)

---

## 1. Stack technologiczny

| Warstwa | Technologia | Wersja |
|---|---|---|
| Framework mobilny | Expo (React Native) | ~54.0 |
| Język | TypeScript | ~5.9 |
| Routing | expo-router (file-based) | ~6.0 |
| Backend / DB / Auth | Supabase (Postgres + Realtime + Auth) | ^2.105 |
| Stylowanie | StyleSheet (arcade) + NativeWind/Tailwind (legacy) | 4.2 / 3.4 |
| Animacje | react-native-reanimated, react-native-worklets | ~4.1 / 0.5 |
| Grafika | react-native-svg + svg-transformer | ^15.12 |
| Fonty | Space Grotesk + JetBrains Mono (Google Fonts) | 0.4 |
| Auth provider | Email/hasło + Google OAuth (`expo-web-browser`) | — |
| Storage | AsyncStorage (PKCE session persistence) | 2.2 |
| Testy | Jest + jest-expo | ~29.7 |

**Architektura runtime:** Expo **New Architecture** + **React Compiler** włączone (`app.json` → `newArchEnabled`, `experiments.reactCompiler`).

**Cały backend gry żyje w Supabase Postgres** — logika rozgrywki to funkcje SQL (`SECURITY DEFINER`) wywoływane przez `supabase.rpc(...)`. W aplikacji nie ma osobnego serwera Node/Go.

---

## 2. Struktura repozytorium

```
HackatIOn_Donuty/
├── app/                       # Expo Router — file-based routing
│   ├── _layout.tsx            # root layout: fonty, AuthProvider, splash
│   ├── (app)/                 # trasy chronione (zalogowany + nickname)
│   │   ├── _layout.tsx        # gate auth + nickname
│   │   ├── index.tsx          # ekran główny (HUD, matchmaking)
│   │   ├── game.tsx           # rozgrywka
│   │   ├── game-summary.tsx   # podsumowanie meczu
│   │   ├── deck.tsx           # deck-builder (5 decków × 10 kart)
│   │   ├── forum.tsx          # lista pytań społeczności
│   │   ├── add-question.tsx   # formularz dodawania pytania
│   │   └── question/[id].tsx  # ekran pytania + głosowanie
│   ├── (auth)/                # sign-in / sign-up
│   ├── auth/callback.tsx      # OAuth deep-link handler
│   └── pick-nickname.tsx      # wybór nicku
│
├── components/
│   ├── arcade/                # overlaye gry (Victory, Defeat, QuestionSheet, CardHelpModal, CardFireOverlay)
│   └── cards/                 # 6 typów kart + base-card + typed-card
│
├── lib/                       # logika domenowa i klient API
│   ├── supabase.ts            # klient Supabase
│   ├── auth-context.tsx       # AuthProvider + useAuth
│   ├── profile.ts             # profil, isNicknameTaken, upsertNickname
│   ├── google-oauth.ts        # OAuth (iOS sync, Android deep-link)
│   ├── match-api.ts           # wrapper RPC: decks, matchmaking, akcje meczu
│   ├── match-store.tsx        # store stanu meczu (Realtime)
│   ├── use-matchmaking.ts     # hook kolejki / matchmakingu
│   ├── forum-api.ts           # wrapper RPC: forum, głosowanie
│   ├── forum-store.tsx        # cache pytań (klient)
│   ├── difficulty.ts          # przeliczanie gwiazdek z głosów + shuffle
│   ├── difficulty.test.ts     # testy jednostkowe
│   ├── arcade-theme.ts        # tokeny M3 (kolory/typo/spacing)
│   └── arcade-shapes.tsx      # ozdobniki SVG
│
├── constants/
│   ├── theme.ts               # ArcadeColors (paleta semantyczna)
│   └── categories.ts          # mapowanie kart → kategorie wiedzy
│
├── supabase/
│   ├── migrations/            # 14 migracji SQL (0001…0014) — schema + RLS + RPC
│   └── seeds/                 # CSV pytań + skrypty Pythonowe
│
├── scripts/                   # narzędzia (Docker dev, gen-icon, reset)
├── design_arcade_neon.md      # spec designu (M3-style)
├── CLAUDE.md                  # instrukcje dla AI / konwencje
├── README.md                  # wizja produktu (PL/EN)
├── app.json                   # konfiguracja Expo (deep link `donuty://`)
└── Dockerfile.dev / docker-compose.yml
```

---

## 3. Konfiguracja środowiska

### 3.1 Zmienne środowiskowe

`.env` w roocie (skopiować z `.env.example`). Prefix `EXPO_PUBLIC_` jest wymagany, żeby Expo wstrzyknęło zmienną w bundle:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

### 3.2 Uruchamianie

```bash
npm run dev:docker:tunnel
```
---

## 4. Frontend — routing i bramki autoryzacyjne

Aplikacja ma **trzy stany użytkownika** i layouty pilnują, żeby z każdego stanu trafić we właściwe miejsce:

| Stan | Warunek | Cel przekierowania |
|---|---|---|
| Niezalogowany | `!session` | `/sign-in` |
| Zalogowany, brak nickname | `session && !profile.nickname` | `/pick-nickname` |
| Zalogowany + nickname | `session && profile.nickname` | `/` (app root) |

---

## 5. Frontend — moduły domenowe

### 5.1 Auth (`lib/auth-context.tsx`, `lib/profile.ts`, `lib/google-oauth.ts`)

`AuthProvider` udostępnia:

```ts
{
  session,            // Supabase Session | null
  profile,            // Profile | null
  loading,            // true do czasu zakończenia init session + profile
  profileLoading,
  profileError,
  nicknameReady,      // !!profile?.nickname
  refreshProfile,
}
```

- Walidacja nicku: debounced `isNicknameTaken` (350 ms) tylko jako podpowiedź UI; jedyną kanoniczną walidacją jest `upsertNickname`. Błąd `23505` (unique violation) ⇒ konflikt nicku.
- Google OAuth: na iOS synchroniczny `expo-web-browser`, na Androidzie zwraca przez deep-link async.

### 5.2 Karty i deck-building

- 6 typów kart, każdy z 3 kategoriami wiedzy (`constants/categories.ts`, `components/cards/typed-card.tsx` → `ICON_MAP`, `CARD_META`).
- Deck = **10 kart**, gracz utrzymuje do **5 decków**, jeden oznaczony jako aktywny (`profiles.selected_deck_id`).
- Edytor: [app/(app)/deck.tsx](app/(app)/deck.tsx) — responsywny, skalowanie fontów `scale()`, breakpointy `IS_SMALL/IS_NARROW`.
- Klient RPC: `lib/match-api.ts` → `listMyDecks`, `upsertDeck`, `deleteDeck`, `setActiveDeck`.

### 5.3 Matchmaking i rozgrywka

- `lib/use-matchmaking.ts` — hook stanu (`idle | queueing | matched | error`), funkcje `quickMatch`, `practiceVsBot`, `cancel`.
- `lib/match-store.tsx` — subskrypcja Realtime na akcjach przeciwnika i timerach.
- [app/(app)/game.tsx](app/(app)/game.tsx) — UI walki; overlaye z `components/arcade/` (`QuestionSheet`, `VictoryOverlay`, `DefeatOverlay`, `CardFireOverlay`).
- Klient RPC: `lib/match-api.ts` → `findMatchOrQueue`, `leaveQueue`, `startBotMatch`, `botTakeTurn`, `getMatchSnapshot`, `playCard`, `answerQuestion`, `concedeMatch`.

### 5.4 Forum

- `lib/forum-api.ts` — wrapper RPC.
- `lib/forum-store.tsx` — `QuestionsProvider` + `useQuestions()`. Cache klienta z anty-double-vote (Sety ID).
- Nowe pytania `unshift` na początek listy.
- Głos = `{ verdict: 'up' | 'down', diff: 1..5 }` wysyłany jednym wywołaniem `submitVote(qId, verdict, diff)`.

---

## 6. Frontend — system designu (Arcade Neon)

Spec: [design_arcade_neon.md](design_arcade_neon.md). Tokeny w `lib/arcade-theme.ts`:

```ts
arc.bg | surface | surfaceHigh | surfaceHighest
arc.ink | outline
arc.primaryContainer    // Electric Pink
arc.secondaryContainer  // Cyan
arc.tertiary            // Neon Lime
arc.error
arcType.displayLg | headlineLg | headlineMd | bodyLg | bodyMd
arcType.labelLg | labelMd | labelSm
arcSpace.xs=4 / sm=8 / md=16 / lg=24 / xl=40
```

Zasady:

- Ekrany gry i auth używają **`StyleSheet.create()`**, nie NativeWind.
- **Sharp 0px corners**.
- **Glow:** `shadowColor` w kolorze akcentu + `shadowOpacity/Radius` (iOS), `elevation` (Android — bez kolorowego glow, akceptowalne).
- **Tła:** `expo-linear-gradient` przybliżający radial neon.
- **Skalowanie responsywne:** `scale(size) = round(size * clamp(SW/375, 0.82, 1.3))`. Breakpointy: `IS_SMALL < 360`, `IS_NARROW < 380`. Wszystkie napisy mogące się nie zmieścić używają `adjustsFontSizeToFit + numberOfLines={1}`.

Białe ekrany NativeWind są deprecated i nie powinny być używane do nowych ekranów.

---

## 7. Backend — model danych (Supabase Postgres)

Cały backend = Postgres (Supabase). Frontend nie wysyła zapytań biznesowych bezpośrednio do tabel — wywołuje **funkcje RPC** (`SECURITY DEFINER`) zdefiniowane w migracjach.

### 7.1 Tabele

#### `profiles`
Profil użytkownika powiązany 1:1 z `auth.users`.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | `uuid` PK | = `auth.uid()` |
| `nickname` | `varchar UNIQUE` | unikalny pseudonim w grze |
| `created_at` | `timestamptz` | default `now()` |
| `selected_deck_id` | `int` FK → `decks.id` | aktywny deck do matchmakingu |

#### `cards`
Statyczny katalog 6 typów kart. Wypełniany seedem.

| Kolumna | Typ | Opis |
|---|---|---|
| `card_id` | `int IDENTITY` PK | id karty |
| `type` | `varchar` CHECK | `DMG`, `HEAL`, `POISON`, `DMG_BLOCK`, `HEAL_REMOVE`, `TIME_BUFF` |
| `categories` | `text[]` | lista 3 kategorii wiedzy |

#### `decks`
Deck = 10 kart wybranych przez gracza. Każdy gracz ma do 5 decków (`deck_number` 1..5).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | `int IDENTITY` PK | |
| `user_id` | `uuid` FK → `profiles.id` | |
| `deck_number` | `int` | 1..5 (slot decka) |
| `cards` | `int[]` | 10 elementów `card_id` |

#### `questions`
Pula pytań społeczności.

| Kolumna | Typ | Opis |
|---|---|---|
| `q_id` | `int IDENTITY` PK | |
| `title` | `varchar` | treść pytania |
| `correct_answer` | `varchar` | poprawna odpowiedź |
| `wrong_answers` | `text[]` | 3 błędne odpowiedzi |
| `category` | `enum` | kategoria wiedzy (typ user-defined) |
| `explanation` | `varchar` | wyjaśnienie pokazywane po odpowiedzi |
| `author_id` | `uuid` FK → `profiles.id` | autor zgłoszenia |
| `created_at` | `timestamptz` | |
| `yes_votes` | `int` | licznik upvote (denormalizacja) |
| `no_votes` | `int` | licznik downvote |
| `diff_sum` | `int` | suma ocen trudności |
| `diff_count` | `int` | liczba ocen trudności |

`diff_sum/diff_count` pozwala wyliczyć `diff_avg` bez dodatkowych zapytań.

#### `question_votes`
Pojedynczy głos użytkownika na pytanie (klucz `(question_id, user_id)` — jeden głos na osobę).

| Kolumna | Typ | Opis |
|---|---|---|
| `question_id` | `int` FK → `questions.q_id` | część PK |
| `user_id` | `uuid` FK → `profiles.id` | część PK |
| `verdict` | `text` CHECK | `'up'` lub `'down'` |
| `difficulty` | `smallint` CHECK 1..5 | ocena trudności |
| `created_at` | `timestamptz` | |

Trigger `question_votes_after_insert` aktualizuje denormalizowane liczniki w `questions` przy każdym głosie.

#### `matches`
Stan pojedynczego meczu — głównie po stronie serwera. Wszystko, co potrzebne do odtworzenia stanu, leży w jednym wierszu.

| Kolumna | Typ | Opis |
|---|---|---|
| `m_id` | `int IDENTITY` PK | |
| `is_currently_played` | `bool` | aktywny mecz |
| `player1_id`, `player2_id` | `uuid` FK | |
| `whose_turn` | `uuid` FK → `profiles.id` | tura aktywnego gracza |
| `player1_hp`, `player2_hp` | `int` default 100 | |
| `player1_active_deck_id`, `player2_active_deck_id` | `int` FK → `decks.id` | |
| `player1_status`, `player2_status` | `jsonb` | efekty statusowe (poison/block/etc.) |
| `turn_started_at` | `timestamp` | timer tury |
| `question_started_at` | `timestamp` | timer pytania |
| `current_question_id` | `int` FK → `questions.q_id` | |
| `current_question_options` | `jsonb` | przetasowane warianty odpowiedzi |
| `current_correct_index` | `smallint` | indeks poprawnej odp. |
| `current_question_modifier` | `text` | aktywny modyfikator pytania (np. blackout/disabled) |
| `current_blackout_idx` | `int` | indeks zasłoniętej odp. |
| `current_disabled_idxs` | `int[]` | indeksy zablokowanych odp. (np. po 50/50) |
| `player1_remaining_cards`, `player2_remaining_cards` | `smallint[]` | karty w bibliotece |
| `player1_hand`, `player2_hand` | `jsonb` | aktualna ręka (`[{id, cat}, ...]`) |
| `player1_discard_pile`, `player2_discard_pile` | `smallint[]` | stos odrzutów |
| `pending_card_id` | `smallint` | karta zagrana, czeka na pytanie |
| `winner_id` | `uuid` FK | wygrany |
| `started_at`, `finished_at` | `timestamptz` | |
| `answer_log` | `jsonb` | pełny log akcji (do podsumowania meczu) |

#### `matchmaking_queue`
Kolejka graczy oczekujących na mecz.

| Kolumna | Typ | Opis |
|---|---|---|
| `user_id` | `uuid` PK FK → `profiles.id` | |
| `created_at` | `timestamptz` | priorytet kolejkowania |
| `deck_id` | `int` FK → `decks.id` | deck z którym gracz wchodzi do meczu |

### 7.2 Specjalne tożsamości

- **Bot UUID:** `00000000-0000-0000-0000-000000000b07` (stała `BOT_UUID` w `lib/match-api.ts`). Wprowadzony w migracji `0006_backfill_decks_and_bot.sql`. Mecze treningowe tworzy `start_bot_match`, ruchy bota wykonuje `bot_take_turn`.

### 7.3 RLS (Row Level Security) — krytyczne

`profiles`:
- `SELECT` publiczne (lub dla `auth.uid()`) — wymagane przez `isNicknameTaken`.
- `INSERT/UPDATE` dozwolone tam, gdzie `auth.uid() = id`.

> Jeśli `upsertNickname` "przechodzi" bez błędu, a wiersz nie powstaje — to RLS, nie kod aplikacji.

Większość operacji na meczach i decku odbywa się przez funkcje `SECURITY DEFINER`, więc tabele `matches`, `decks`, `matchmaking_queue` mają zazwyczaj zamknięte uprawnienia dla `anon/authenticated` — klient operuje na nich wyłącznie przez RPC.

### 7.4 Statusy w `jsonb` — encoding

`player{1,2}_status` używają krótkich kluczy:

| Klucz | Znaczenie | Źródło |
|---|---|---|
| `ps` | poison stack — zadaje obrażenia co turę | karta `POISON` |
| `ba` | block ammount — bufor obrażeń przeciwnika | karta `DMG_BLOCK` |
| `rw` | remove wrong — eliminacja błędnych odpowiedzi (50/50) | karta `HEAL_REMOVE` |
| `et` | extra time — dodatkowe sekundy do timera | karta `TIME_BUFF` |

---

## 8. Backend — funkcje RPC

Wszystkie funkcje są w schemacie `public`. Frontend wywołuje je przez `supabase.rpc(name, params)`. Funkcje gry są `SECURITY DEFINER` z `search_path = public, pg_temp` i mają zdjęte `EXECUTE` z `PUBLIC` (dostęp przez polityki Supabase).

> Nazwy migracji (`0001` … `0014`) wprowadzają i ewoluują te funkcje. Aktualna definicja danej funkcji to **najświeższa** migracja, w której się pojawia (Postgres używa `CREATE OR REPLACE`).

### 8.1 Decki

#### `list_my_decks() → setof (id int, deck_number int, cards int[], is_selected bool)`
Zwraca wszystkie decki zalogowanego użytkownika z flagą czy są aktywne.
Wywołanie: `supabase.rpc('list_my_decks')`.

#### `upsert_deck(p_deck_number int, p_cards int2[]) → int`
Tworzy lub aktualizuje deck w slocie `1..5`. Waliduje, że `p_cards` ma 10 elementów i wszystkie istnieją w `cards`. Zwraca `decks.id`.
Wywołanie: `supabase.rpc('upsert_deck', { p_deck_number, p_cards })`.

#### `delete_deck(p_deck_id int) → void`
Usuwa deck (z weryfikacją własności).

#### `set_active_deck(p_deck_id int) → void`
Ustawia `profiles.selected_deck_id`. Weryfikuje że deck należy do wywołującego.

#### `create_starter_deck() → int`
Tworzy domyślny deck dla nowego użytkownika (mig. `0009`). Zwykle wywoływany przy pierwszej wizycie.

### 8.2 Matchmaking i mecz vs bot

#### `find_match_or_queue(p_deck_id int) → jsonb`
Atomowa operacja: jeśli w `matchmaking_queue` jest inny gracz → tworzy mecz i zwraca `Snapshot` ze statusem `match_started`. Jeśli kolejka pusta → wstawia wywołującego do kolejki i zwraca `{ status: 'queued', queued_at }`.

Możliwe statusy odpowiedzi (typ `MatchOrQueueResult`):
- `queued`
- `match_in_progress` (gracz ma już aktywny mecz)
- `match_started`
- `match_finished`

#### `leave_queue() → void`
Usuwa wywołującego z kolejki (mig. `0008`).

#### `start_bot_match(p_deck_id int) → jsonb`
Tworzy mecz przeciwko botowi (mig. `0008`). Bot ma własny deck, jego karty i HP są w tej samej tabeli `matches`. Zwraca `Snapshot & { status: 'bot_match_started' }`.

#### `bot_take_turn(p_match_id int) → jsonb`
Wykonuje pełną turę bota (zagrywa kartę → odpowiada na pytanie → kończy turę). Implementuje prostą strategię (mig. `0008`). Zwraca aktualny `Snapshot`.

### 8.3 Snapshot — odczyt stanu

#### `match_snapshot(p_match_id int, p_viewer_id uuid) → jsonb`
**Kluczowa funkcja widoku.** Zwraca stan meczu spersonalizowany pod widza:
- `you` — pełna ręka, biblioteka, stos odrzutów, pełen status (z poisonem itd.).
- `opponent` — tylko liczniki: `hand_size`, `remaining_cards_count`, `discard_pile_count`, `status_public` (statusy widoczne dla obu graczy).
- `current_question` — `q_id`, `title`, `options` (już zashufflowane), `category`, `difficulty`, `blackout_idx`, `disabled_idxs`.
- `pending_card_id`, `whose_turn`, `turn_started_at`, `question_started_at`, `winner_id`, `finished_at`.
- `answer_log` (cały log) + `last_answer` (skrót dla animacji).

Odpowiada typowi `Snapshot` z `lib/match-api.ts`. Nie ekspozuje `current_correct_index` ani odpowiedniego `correct_answer` — to chroni przed wyciekiem odpowiedzi do klienta przed odpowiedzią gracza.

#### `get_match_snapshot(p_match_id int) → jsonb`
Cienki wrapper na `match_snapshot(p_match_id, auth.uid())`. To jest funkcja wołana z klienta przez `getMatchSnapshot(matchId)`.

#### `check_match_timeout(p_match_id int) → jsonb`
Sprawdza i egzekwuje timeout (mig. `0007`). Jeśli pytanie/tura przekroczyła limit czasu, automatycznie kończy aktywność (przegrywa pytanie albo oddaje turę). Wołane głównie wewnętrznie / przez bota.

### 8.4 Akcje gracza

#### `play_card(p_match_id int, p_slot_idx int) → jsonb`
Gracz zagrywa kartę z ręki (slot 0..N). Walidacje: czy to jego tura, czy slot istnieje, czy nie ma `pending_card_id`. Wybiera pytanie z kategorii karty (`get_game_question`), zapisuje opcje przetasowane do `current_question_options`, ustawia modyfikatory (`current_blackout_idx`, `current_disabled_idxs`) na podstawie `*_status` przeciwnika/własnych. Zwraca `Snapshot`.

> Sygnatura zmieniła się w mig. `0011_match_history_and_play_slot.sql` — z `(p_match_id, p_card_id)` na `(p_match_id, p_slot_idx)`. Klient w `match-api.ts` używa wariantu z `p_slot_idx`.

#### `answer_question(p_match_id int, p_answer_index int) → jsonb`
Gracz odpowiada na pytanie. Dla `p_answer_index = -1` (`QUESTION_TIMEOUT_SENTINEL`) traktuje jak timeout. Logika:
1. Porównuje z `current_correct_index`.
2. Wpisuje wpis do `answer_log`.
3. Jeśli poprawnie — wywołuje `apply_card_effect(match, type, is_p1, difficulty)`.
4. Jeśli błędnie / timeout — zadaje −5 HP wywołującemu.
5. Konsumuje statusy (np. `et` na bazie `effect_tier`).
6. Sprawdza czy ktoś ma `hp = 0` — jeśli tak, wywołuje `end_match`.
7. Inaczej — `end_turn`.

Zwraca `Snapshot`.

#### `concede_match(p_match_id int) → jsonb`
Gracz poddaje mecz (mig. `0009`). Ustawia `winner_id` na przeciwnika i kończy mecz.

### 8.5 Mechanika kart

#### `apply_card_effect(p_match_id int, p_card_type text, p_caster_is_p1 bool, p_difficulty int DEFAULT 1) → void`
Aplikuje efekt karty skalowany do trudności pytania (mig. `0013`):

| Tier | Trudność (★) | DMG | HEAL | poison | block | rw | et |
|---|---|---|---|---|---|---|---|
| 1 | 1–2 | 12 | 10 | +1 | +2 | +1 | +3 |
| 2 | 3–4 | 15 | 12 | +1 | +3 | +2 | +5 |
| 3 | 5 | 20 | 15 | +2 | +4 | +3 | +7 |

Karty z mieszanym efektem (`DMG_BLOCK`, `HEAL_REMOVE`, `TIME_BUFF`) zadają/leczą stałe 5 HP + dorzucają status. Pełna macierz w `0013_difficulty_scaling.sql`.

#### `effect_tier(p_difficulty int) → int`
Pomocnicza, immutable. Mapuje 1–2★ → 1, 3–4★ → 2, 5★ → 3.

#### `card_effect_multiplier(p_card_type text, p_difficulty int) → int`
Starsza wersja skalera (mig. `0002`), zachowana dla zgodności.

#### `end_turn(p_match_id int) → void`
Przekazuje turę przeciwnikowi: czyści `pending_card_id`, `current_question_*`, ustawia `whose_turn`, dociąga karty (`draw_cards`), aplikuje persistent statuses (poison tick).

#### `end_match(p_match_id int, p_winner_id uuid) → void`
Ustawia `is_currently_played=false`, `winner_id`, `finished_at`. Czyści kolejki.

#### `draw_cards(p_match_id int, p_player_id uuid, p_count int) → void`
Przenosi `p_count` kart z `*_remaining_cards` do `*_hand` używając `shuffle_array`. Jeśli biblioteka pusta — przetasowuje stos odrzutów.

### 8.6 Helpery tablicowe i jsonb

#### `shuffle_array(arr anyarray) → anyarray`
Tasuje tablicę przy użyciu `random()`. Używane do tasowania bibliotek i odpowiedzi.

#### `array_remove_one(p_array anyarray, p_item anyelement) → anyarray`
Usuwa **jedno** wystąpienie elementu z tablicy (nie wszystkie, jak Postgresowy `array_remove`).

#### `remove_from_hand_jsonb(p_hand jsonb, p_card_id int) → jsonb`
Usuwa pierwszą kartę z `p_hand` (struktura `[{id, cat}, ...]`) o podanym `id`.

### 8.7 Forum

#### `add_forum_question(p_category text, p_title text, p_correct text, p_wrong text[], p_explanation text) → int`
Wstawia nowe pytanie autorstwa wywołującego, zwraca `q_id`. Walidacje: 3 błędne odpowiedzi, niepuste pola.

#### `submit_forum_vote(p_question_id int, p_verdict text, p_difficulty int) → void`
Zapisuje głos (`up`/`down`) + ocenę trudności (1–5). Klucz `(question_id, user_id)` zapobiega podwójnym głosom. Trigger `question_votes_after_insert` aktualizuje denormalizowane liczniki na `questions`.

#### `list_forum_questions() → setof ForumQuestionRaw`
Zwraca wszystkie pytania wraz z metadanymi:
- `yes_votes`, `no_votes`, `diff_avg = diff_sum / NULLIF(diff_count, 0)`.
- `voted_by_me` — czy wywołujący już głosował (lewy join na `question_votes`).
- `author_nickname` — denormalizowany z `profiles`.

#### `get_game_question(p_category text DEFAULT NULL) → jsonb`
Losuje pytanie z puli zakwalifikowanej (próg `score = yes_votes - no_votes >= 50`) opcjonalnie filtrując po kategorii. Zwraca `q_id`, `title`, `category`, `difficulty`, `correct_answer`, `wrong_answers`. Klient (`forum-api.ts`) shuffluje odpowiedzi po stronie JS.

### 8.8 Triggery

- **`question_votes_after_insert`** (mig. `0010`) — po INSERT na `question_votes` aktualizuje `questions.yes_votes/no_votes/diff_sum/diff_count`. Pozwala odczytywać statystyki bez agregacji.

---

## 9. Logika gry

### 9.1 Pętla rozgrywki

```
[start meczu]
  ↓ find_match_or_queue / start_bot_match
[tura gracza]
  ↓ play_card                    → losowane pytanie z kategorii karty
[odpowiedź]
  ↓ answer_question              → poprawna ⇒ apply_card_effect, błędna/timeout ⇒ −5 HP
  ↓ end_turn                     → poison tick, dociągnięcie kart, switch tury
[koniec gdy hp ≤ 0]
  ↓ end_match
[snapshot do podsumowania → game-summary.tsx]
```

### 9.2 Reguły Gry

- HP startowe: 100. Śmierć gracza przy: 0 hp.
- Błędna odpowiedź lub timeout: −5 HP dla zagrywającego.
- Poprawna odpowiedź: pełen efekt karty zeskalowany do trudności pytania.
- Każdy gracz na ręce ma N kart (drawowane przez `draw_cards`), reszta w `*_remaining_cards`. Po zagraniu i zakończeniu tury karta ląduje w `*_discard_pile`.
- Modyfikatory pytań:
  - **Hide** (`current_blackout_idx`) — jedna z odpowiedzi przykryta.
  - **50/50** (`current_disabled_idxs`) — dwie błędne odpowiedzi zdezaktywowane.

### 9.3 Bot

- UUID stały, deck domyślny.
- Strategia: zagrywa pierwszą sensowną kartę, odpowiada poprawnie z prawdopodobieństwem zależnym od trudności.

### 9.4 Kategorie kart

| Card type | Efekt | Kategorie wiedzy |
|---|---|---|
| `DMG` | Direct damage | Math, Travel, English |
| `HEAL` | Self heal | Medicine, Nature, Movies |
| `POISON` | Poison stack co turę | Chemistry, Books, Space |
| `DMG_BLOCK` (Hide) | Mały DMG + blackout odp. | Religion, Music, Culinary |
| `HEAL_REMOVE` (50/50) | Mały HEAL + remove 2 wrong | Games, History, Flags |
| `TIME_BUFF` (Time) | Mały DMG + HEAL + extra time | IT, Countries, Useless facts |

---

## 10. Logika forum i głosowań

- Pytania zgłaszane przez społeczność trafiają do puli pytań.
- Każdy zalogowany użytkownik może oddać jeden głos:
  - `verdict ∈ {up, down}` - ocena czy pytanie jest dobre.
  - `difficulty ∈ 1..5` - gwiazdki trudności.
- Próg kwalifikacji do gry: 50 głosów.
- Średnia trudność wpływa na siłę efektu karty (przez `effect_tier` w `apply_card_effect`).
- Cache klienta: `lib/forum-store.tsx` - odśwież po dodaniu/głosowaniu.

---

## 11. Konwencje kodowe

- **Pakietnik:** zawsze `npm`.
- **Routing:** typed routes włączone - używamy typowanego `Href`/`router.push({ pathname, params })`.
- **Stylowanie nowych ekranów:** tokeny arcade, sharp corners, brak NativeWind.
- **Animacje:** Reanimated 4 + worklets 0.5 (kompatybilne z New Architecture).
- **SVG:** importy `.svg` jako komponenty (transformer w `metro.config.js`).
- **Forum store:** nowe pytania `unshift` na początek listy.
- **Voting:** dwustopniowy (verdict + diff), wysyłany jednym RPC.

---

## 12. Znane ograniczenia i ryzyka

- **Realtime** wymaga aktywnej subskrypcji w `match-store.tsx`; rozłączenie sieci = utrata aktualizacji do reconnect.
- **Android shadow** - kolorowy glow nieosiągalny natywnie;
- **OAuth** różni się między iOS a Android
---
