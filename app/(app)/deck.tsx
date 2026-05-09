import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SW } = Dimensions.get("window");

// ── Design tokens ───────────────────────────────────────────────────────────
const BG = "#13121c";
const SURFACE = "#1f1f28";
const SURF_LOW = "#1b1b24";
const BORDER = "#5b3f47";
const TEXT = "#e4e1ee";
const DIM = "#aa8891";
const LIME = "#C8FF1A";
const CYAN = "#19F0DC";

// Kolor per typ — dostosuj gdy zmienią się typy w bazie
const TYPE_COLOR: Record<string, string> = {
  DMG: "#FF1F8F",
  HEAL: "#C8FF1A",
  DOT: "#ff7a00",
  SABOTAGE: "#a07aff",
  "50/50": "#19F0DC",
  TIME: "#FFD700",
};
const tc = (type?: string | null) => (type && TYPE_COLOR[type]) || BORDER;

// ── Wymiary ─────────────────────────────────────────────────────────────────
const TOTAL_DECKS = 5;
const DECK_SIZE = 10;
const SLOT_COLS = 5;
const PAD = 12;
const SLOT_GAP = 5;
const SLOT_W = (SW - PAD * 2 - SLOT_GAP * (SLOT_COLS - 1)) / SLOT_COLS;
const SLOT_H = SLOT_W * 1.4;

const TYPE_COLS = 3;
const TYPE_GAP = 8;
const TYPE_W = (SW - PAD * 2 - TYPE_GAP * (TYPE_COLS - 1)) / TYPE_COLS;
const TYPE_H = TYPE_W * 0.85;

// ── Typy — schema public.cards ──────────────────────────────────────────────
type CardType = {
  card_id: number;
  type: string;
  categories: string[] | null;
};

// ── Mock (aktywny gdy baza pusta) ───────────────────────────────────────────
const MOCK: CardType[] = [
  { card_id: 1, type: "DMG", categories: ["MATH", "TRAVEL", "ENGLISH"] },
  { card_id: 2, type: "HEAL", categories: ["MEDICINE", "NATURE", "MOVIES"] },
  { card_id: 3, type: "DOT", categories: ["CHEMISTRY", "BOOKS", "SPACE"] },
  {
    card_id: 4,
    type: "SABOTAGE",
    categories: ["RELIGION", "MUSIC", "CULINARY"],
  },
  { card_id: 5, type: "50/50", categories: ["GAMES", "HISTORY", "FLAGS"] },
  { card_id: 6, type: "TIME", categories: ["COUNTRIES", "IT", "TRIVIA"] },
];

// ── Główny ekran ────────────────────────────────────────────────────────────
export default function DeckScreen() {
  const [activeDeck, setActiveDeck] = useState(0);
  // Każdy deck to tablica card_id (max 10, mogą się powtarzać)
  const [decks, setDecks] = useState<number[][]>(
    Array.from({ length: TOTAL_DECKS }, () => []),
  );
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    const { data, error } = await supabase
      .from("cards")
      .select("card_id, type, categories")
      .order("card_id");

    setCardTypes(
      !error && data && data.length > 0 ? (data as CardType[]) : MOCK,
    );
  }

  // ── Pochodne ──────────────────────────────────────────────────────────────
  const currentDeck = decks[activeDeck];
  const filled = currentDeck.length;
  const isFull = filled >= DECK_SIZE;

  // Szybki lookup card_id → CardType
  const byId = Object.fromEntries(cardTypes.map((c) => [c.card_id, c]));

  // Ile każdego typu jest w aktualnym decku
  const countById: Record<number, number> = {};
  for (const id of currentDeck) countById[id] = (countById[id] ?? 0) + 1;

  // ── Akcje ─────────────────────────────────────────────────────────────────
  function addCard(card_id: number) {
    if (isFull) return;
    setDecks((prev) =>
      prev.map((d, i) => (i === activeDeck ? [...d, card_id] : d)),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function removeSlot(slotIdx: number) {
    setDecks((prev) =>
      prev.map((d, i) =>
        i === activeDeck ? d.filter((_, j) => j !== slotIdx) : d,
      ),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function clearDeck() {
    setDecks((prev) => prev.map((d, i) => (i === activeDeck ? [] : d)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>DECK BUILDER</Text>
          <Text style={s.subtitle}>
            {filled} / {DECK_SIZE} CARDS
          </Text>
        </View>
        <View style={s.headerRight}>
          {filled > 0 && (
            <TouchableOpacity
              onPress={clearDeck}
              style={s.clearBtn}
              activeOpacity={0.7}
            >
              <Text style={s.clearBtnText}>CLEAR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.saveBtn} activeOpacity={0.8}>
            <Text style={s.saveBtnText}>SAVE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Deck tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
        style={s.tabsWrap}
      >
        {Array.from({ length: TOTAL_DECKS }, (_, i) => {
          const active = activeDeck === i;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setActiveDeck(i)}
              style={[s.tab, active && s.tabActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTitle, active && s.tabTitleActive]}>
                DECK {i + 1}
              </Text>
              <Text style={[s.tabSub, active && s.tabSubActive]}>
                {decks[i].length} CARDS
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Sloty decku ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionText}>CURRENT DECK · TAP TO REMOVE</Text>
        </View>

        <View style={s.slotsGrid}>
          {Array.from({ length: DECK_SIZE }, (_, i) => {
            const card_id = currentDeck[i];
            const card = card_id !== undefined ? byId[card_id] : null;
            const color = tc(card?.type);
            return (
              <TouchableOpacity
                key={i}
                style={[s.slot, { borderColor: card ? color : BORDER }]}
                onPress={() => card && removeSlot(i)}
                activeOpacity={card ? 0.65 : 1}
              >
                {card && (
                  <>
                    <Text style={[s.slotType, { color }]}>{card.type}</Text>
                    <View
                      style={[s.slotBar, { backgroundColor: color + "22" }]}
                    />
                    <Text style={[s.slotCat, { color: color + "bb" }]}>
                      {card.categories?.[0] ?? ""}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Proporcje typów ── */}
        {filled > 0 && (
          <View style={s.proportionsRow}>
            {cardTypes.map((card) => {
              const count = countById[card.card_id] ?? 0;
              if (count === 0) return null;
              const col = tc(card.type);
              const pct = (count / DECK_SIZE) * 100;
              return (
                <View
                  key={card.card_id}
                  style={[s.propChip, { borderColor: col + "55" }]}
                >
                  <Text style={[s.propType, { color: col }]}>{card.type}</Text>
                  <View style={s.propBarBg}>
                    <View
                      style={[
                        s.propBarFill,
                        { width: `${pct}%` as any, backgroundColor: col },
                      ]}
                    />
                  </View>
                  <Text style={[s.propCount, { color: col }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={s.divider} />

        {/* ── Wybór typów ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionText}>
            {isFull
              ? "DECK PEŁNY · USUŃ KARTĘ ABY DODAĆ"
              : "CHOOSE TYPE · TAP TO ADD"}
          </Text>
        </View>

        <View style={s.typesGrid}>
          {cardTypes.map((card) => {
            const col = tc(card.type);
            const count = countById[card.card_id] ?? 0;
            return (
              <TouchableOpacity
                key={card.card_id}
                style={[
                  s.typeCard,
                  { borderColor: isFull ? BORDER : col },
                  isFull && s.typeCardDisabled,
                ]}
                onPress={() => addCard(card.card_id)}
                disabled={isFull}
                activeOpacity={0.7}
              >
                {/* Licznik w rogu */}
                {count > 0 && (
                  <View style={[s.badge, { backgroundColor: col }]}>
                    <Text style={s.badgeText}>{count}</Text>
                  </View>
                )}

                <Text style={[s.typeCardType, { color: isFull ? DIM : col }]}>
                  {card.type}
                </Text>

                <Text style={s.typeCardCats}>
                  {card.categories?.join("\n") ?? "—"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── StyleSheet ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURF_LOW,
  },
  title: {
    color: TEXT,
    fontFamily: "monospace",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
  },
  subtitle: {
    color: DIM,
    fontFamily: "monospace",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  clearBtnText: {
    color: DIM,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  saveBtn: {
    backgroundColor: LIME,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: "#000",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },

  tabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURF_LOW,
    maxHeight: 60,
  },
  tabsRow: {
    paddingHorizontal: PAD,
    paddingVertical: 8,
    gap: 6,
    flexDirection: "row",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    minWidth: 72,
    alignItems: "center",
  },
  tabActive: {
    borderColor: CYAN,
    backgroundColor: "#0a1f1e",
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tabTitle: {
    color: DIM,
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  tabTitleActive: { color: CYAN },
  tabSub: {
    color: BORDER,
    fontFamily: "monospace",
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  tabSubActive: { color: CYAN + "aa" },

  sectionRow: { paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 6 },
  sectionText: {
    color: DIM,
    fontFamily: "monospace",
    fontSize: 8,
    letterSpacing: 2,
  },

  // Deck slots
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: PAD,
    gap: SLOT_GAP,
  },
  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderWidth: 1,
    backgroundColor: SURFACE,
    padding: 5,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  slotType: {
    fontFamily: "monospace",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
  },
  slotBar: { flex: 1, marginVertical: 3 },
  slotCat: { fontFamily: "monospace", fontSize: 6, letterSpacing: 0.5 },

  // Proporcje
  proportionsRow: {
    paddingHorizontal: PAD,
    paddingTop: 10,
    gap: 5,
  },
  propChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    backgroundColor: SURFACE,
  },
  propType: {
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    width: 64,
  },
  propBarBg: { flex: 1, height: 4, backgroundColor: BORDER },
  propBarFill: { height: 4 },
  propCount: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    width: 20,
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: PAD,
    marginTop: 12,
    marginBottom: 4,
  },

  // Siatka 6 typów kart
  typesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: PAD,
    gap: TYPE_GAP,
    paddingTop: 4,
  },
  typeCard: {
    width: TYPE_W,
    height: TYPE_H,
    borderWidth: 1,
    backgroundColor: SURFACE,
    padding: 10,
    justifyContent: "space-between",
  },
  typeCardDisabled: { opacity: 0.45 },
  typeCardType: {
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
  },
  typeCardCats: {
    color: DIM,
    fontFamily: "monospace",
    fontSize: 7,
    letterSpacing: 0.5,
    lineHeight: 11,
  },

  // Badge z liczbą
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  badgeText: {
    color: "#000",
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
  },
});
