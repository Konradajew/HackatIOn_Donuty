import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import {router} from "expo-router";

import { ArcadeColors as C, ArcadeSpacing as S } from '@/constants/theme';

import { styles as s} from './deck.styles';

const { width: SW } = Dimensions.get('window');

// Kolor per typ — dostosuj gdy zmienią się typy w bazie
const TYPE_COLOR: Record<string, string> = {
    DMG:           '#FF1F8F',
    HEAL:          '#C8FF1A',
    POISON:        '#a100ff',
    DMG_BLOCK:     '#fff87a',
    HEAL_REMOVE:   '#19F0DC',
    TIME_BUFF:     '#009dff',
};
const tc = (type?: string | null) => (type && TYPE_COLOR[type]) || C.outlineVariant;

// ── Wymiary ─────────────────────────────────────────────────────────────────
const TOTAL_DECKS = 5;
const DECK_SIZE   = 10;
const SLOT_COLS   = 5;
const PAD         = 12;
const SLOT_GAP    = 5;
const SLOT_W = (SW - PAD * 2 - SLOT_GAP * (SLOT_COLS - 1)) / SLOT_COLS;
const SLOT_H = SLOT_W * 1.4;

const TYPE_COLS = 3;
const TYPE_GAP  = 8;
const TYPE_W    = (SW - PAD * 2 - TYPE_GAP * (TYPE_COLS - 1)) / TYPE_COLS;
const TYPE_H    = TYPE_W * 0.85;

// ── Typy — schema public.cards ──────────────────────────────────────────────
type CardType = {
    card_id: number;
    type: string;
    categories: string[] | null;
};

// ── Mock (aktywny gdy baza pusta) ───────────────────────────────────────────
const MOCK: CardType[] = [
    { card_id: 1, type: 'damage',   categories: ['MATH', 'TRAVEL', 'ENGLISH'] },
    { card_id: 2, type: 'heal',     categories: ['MEDICINE', 'NATURE', 'MOVIES'] },
    { card_id: 3, type: 'poison',   categories: ['CHEMISTRY', 'BOOKS', 'SPACE'] },
    { card_id: 4, type: 'sabotage', categories: ['RELIGION', 'MUSIC', 'CULINARY'] },
    { card_id: 5, type: '50/50',    categories: ['GAMES', 'HISTORY', 'FLAGS'] },
    { card_id: 6, type: 'time',     categories: ['COUNTRIES', 'IT', 'TRIVIA'] },
];

// ── Główny ekran ────────────────────────────────────────────────────────────
export default function DeckScreen() {
    const [activeDeck, setActiveDeck] = useState(0);
    // Każdy deck to tablica card_id (max 10, mogą się powtarzać)
    const [decks, setDecks] = useState<number[][]>(
        Array.from({ length: TOTAL_DECKS }, () => [])
    );
    const [cardTypes, setCardTypes] = useState<CardType[]>([]);

    useEffect(() => { loadCards(); }, []);

    async function loadCards() {
        const { data, error } = await supabase
            .from('cards')
            .select('card_id, type, categories')
            .order('card_id');

        setCardTypes(
            (!error && data && data.length > 0) ? (data as CardType[]) : MOCK
        );
    }

    // ── Pochodne ──────────────────────────────────────────────────────────────
    const currentDeck = decks[activeDeck];
    const filled      = currentDeck.length;
    const isFull      = filled >= DECK_SIZE;

    // Szybki lookup card_id → CardType
    const byId = Object.fromEntries(cardTypes.map(c => [c.card_id, c]));

    // Ile każdego typu jest w aktualnym decku
    const countById: Record<number, number> = {};
    for (const id of currentDeck)
        countById[id] = (countById[id] ?? 0) + 1;

    // ── Akcje ─────────────────────────────────────────────────────────────────
    function addCard(card_id: number) {
        if (isFull) return;
        setDecks(prev => prev.map((d, i) =>
            i === activeDeck ? [...d, card_id] : d
        ));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    function removeSlot(slotIdx: number) {
        setDecks(prev => prev.map((d, i) =>
            i === activeDeck ? d.filter((_, j) => j !== slotIdx) : d
        ));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    function clearDeck() {
        setDecks(prev => prev.map((d, i) => i === activeDeck ? [] : d));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={s.container} edges={['top']}>

            {/* ── Header ── */}
            <View style={s.header}>
                <View style={s.headerRight}>
                    <TouchableOpacity style={s.backBtn} activeOpacity={0.8} onPress={() => router.push("/")}>
                        <Text style={s.backBtnText}>BACK</Text>
                    </TouchableOpacity>
                </View>
                <View>
                    <Text style={s.title}>DECK BUILDER</Text>
                    <Text style={s.subtitle}>{filled} / {DECK_SIZE} CARDS</Text>
                </View>
                <View style={s.headerRight}>
                    {filled > 0 && (
                        <TouchableOpacity onPress={clearDeck} style={s.clearBtn} activeOpacity={0.7}>
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
                            <Text style={[s.tabTitle, active && s.tabTitleActive]}>DECK {i + 1}</Text>
                            <Text style={[s.tabSub,   active && s.tabSubActive]}>
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
                        const card    = card_id !== undefined ? byId[card_id] : null;
                        const color   = tc(card?.type);
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[s.slot, { borderColor: card ? color : C.outlineVariant }]}
                                onPress={() => card && removeSlot(i)}
                                activeOpacity={card ? 0.65 : 1}
                            >
                                {card && (
                                    <>
                                        <Text style={[s.slotType, { color }]}>{card.type}</Text>
                                        <View style={[s.slotBar, { backgroundColor: color + '22' }]} />
                                    </>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Proporcje typów ── */}
                {filled > 0 && (
                    <View style={s.proportionsRow}>
                        {cardTypes.map(card => {
                            const count = countById[card.card_id] ?? 0;
                            if (count === 0) return null;
                            const col = tc(card.type);
                            const pct = (count / DECK_SIZE) * 100;
                            return (
                                <View key={card.card_id} style={[s.propChip, { borderColor: col + '55' }]}>
                                    <Text style={[s.propType, { color: col }]}>{card.type}</Text>
                                    <View style={s.propBarBg}>
                                        <View style={[s.propBarFill, { width: `${pct}%` as any, backgroundColor: col }]} />
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
                        {isFull ? 'DECK PEŁNY · USUŃ KARTĘ ABY DODAĆ' : 'CHOOSE TYPE · TAP TO ADD'}
                    </Text>
                </View>

                <View style={s.typesGrid}>
                    {cardTypes.map(card => {
                        const col   = tc(card.type);
                        const count = countById[card.card_id] ?? 0;
                        return (
                            <TouchableOpacity
                                key={card.card_id}
                                style={[
                                    s.typeCard,
                                    { borderColor: isFull ? C.outlineVariant : col },
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

                                <Text style={[s.typeCardType, { color: isFull ? C.outline : col }]}>
                                    {card.type}
                                </Text>

                                <Text style={s.typeCardCats}>
                                    {card.categories?.join('\n') ?? '—'}
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

