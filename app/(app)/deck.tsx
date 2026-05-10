import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";

import { ArcadeColors as C } from '@/constants/theme';
import { listMyDecks, upsertDeck, setActiveDeck, type CardType } from '@/lib/match-api';
import { ICON_MAP, CARD_META } from '@/components/cards/typed-card';

const { width: SW } = Dimensions.get('window');

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

type CardTypeRow = {
    card_id: number;
    type: string;
    categories: string[] | null;
};

export default function DeckScreen() {
    const [activeDeck, setActiveDeckTab] = useState(0);
    const [decks, setDecks] = useState<number[][]>(
        Array.from({ length: TOTAL_DECKS }, () => [])
    );
    const [deckIds, setDeckIds] = useState<(number | null)[]>(
        Array.from({ length: TOTAL_DECKS }, () => null)
    );
    const [activeDeckDbId, setActiveDeckDbId] = useState<number | null>(null);
    const [cardTypes, setCardTypes] = useState<CardTypeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([loadCards(), loadMyDecks()]).finally(() => setLoading(false));
    }, []);

    async function loadCards() {
        const { data, error } = await supabase
            .from('cards')
            .select('card_id, type, categories')
            .order('card_id');
        if (!error && data && data.length > 0) {
            setCardTypes(data as CardTypeRow[]);
        }
    }

    async function loadMyDecks() {
        try {
            const rows = await listMyDecks();
            if (!rows?.length) return;
            const newDecks = Array.from({ length: TOTAL_DECKS }, () => [] as number[]);
            const newIds = Array.from({ length: TOTAL_DECKS }, () => null as number | null);
            let newActiveId: number | null = null;
            for (const row of rows) {
                const i = row.deck_number - 1;
                if (i >= 0 && i < TOTAL_DECKS) {
                    newDecks[i] = row.cards;
                    newIds[i] = row.id;
                }
                if (row.is_selected) newActiveId = row.id;
            }
            setDecks(newDecks);
            setDeckIds(newIds);
            setActiveDeckDbId(newActiveId);
        } catch (e) {
            console.warn('Failed to load decks:', e);
        }
    }

    const currentDeck = decks[activeDeck];
    const filled      = currentDeck.length;
    const isFull      = filled >= DECK_SIZE;
    const canSave     = filled === DECK_SIZE && !saving;

    const byId = Object.fromEntries(cardTypes.map(c => [c.card_id, c]));

    const countById: Record<number, number> = {};
    for (const id of currentDeck) countById[id] = (countById[id] ?? 0) + 1;

    function addCard(card_id: number) {
        if (isFull) return;
        setDecks(prev => prev.map((d, i) => i === activeDeck ? [...d, card_id] : d));
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

    async function saveDeck() {
        if (!canSave) return;
        setSaving(true);
        try {
            const id = await upsertDeck(activeDeck + 1, currentDeck);
            setDeckIds(prev => prev.map((v, i) => i === activeDeck ? id : v));
        } catch (e) {
            console.warn('Failed to save deck:', e);
        } finally {
            setSaving(false);
        }
    }

    async function useThisDeck() {
        const id = deckIds[activeDeck];
        if (!id) return;
        try {
            await setActiveDeck(id);
            setActiveDeckDbId(id);
        } catch (e) {
            console.warn('Failed to set active deck:', e);
        }
    }

    if (loading) {
        return (
            <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
                <ActivityIndicator color={C.secondaryBright} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container} edges={['top']}>

            {/* ── Header ── */}
            <View style={s.header}>
                <View style={s.headerRight}>
                    <TouchableOpacity style={s.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
                        <Text style={s.backBtnText}>←</Text>
                    </TouchableOpacity>
                </View>
                <View>
                    <Text style={s.title}>DECK BUILDER</Text>
                    <Text style={[s.subtitle, filled === DECK_SIZE && { color: C.tertiaryDim }]}>
                        {filled} / {DECK_SIZE} CARDS
                    </Text>
                </View>
                <View style={s.headerRight}>
                    {filled > 0 && (
                        <TouchableOpacity onPress={clearDeck} style={s.clearBtn} activeOpacity={0.7}>
                            <Text style={s.clearBtnText}>CLEAR</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[s.saveBtn, !canSave && { opacity: 0.35 }]}
                        activeOpacity={0.8}
                        onPress={saveDeck}
                        disabled={!canSave}
                    >
                        {saving
                            ? <ActivityIndicator size="small" color="#000" />
                            : <Text style={s.saveBtnText}>SAVE</Text>
                        }
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
                    const active  = activeDeck === i;
                    const isUsed  = deckIds[i] !== null && deckIds[i] === activeDeckDbId;
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setActiveDeckTab(i)}
                            style={[
                                s.tab,
                                active && s.tabActive,
                                isUsed && { borderColor: C.tertiaryDim },
                            ]}
                            activeOpacity={0.8}
                        >
                            <Text style={[s.tabTitle, active && s.tabTitleActive, isUsed && { color: C.tertiaryDim }]}>
                                {isUsed ? '★ ' : ''}DECK {i + 1}
                            </Text>
                            <Text style={[s.tabSub, active && s.tabSubActive]}>
                                {decks[i].length} CARDS
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── "Use this deck" action bar ── */}
                {deckIds[activeDeck] !== null && (
                    <View style={{ flexDirection: 'row', paddingHorizontal: PAD, paddingTop: 10, gap: 8 }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderWidth: 1,
                                borderColor: deckIds[activeDeck] === activeDeckDbId ? C.tertiaryDim : C.outlineVariant,
                                backgroundColor: deckIds[activeDeck] === activeDeckDbId ? C.tertiaryDim + '22' : 'transparent',
                                alignItems: 'center',
                            }}
                            onPress={useThisDeck}
                            disabled={deckIds[activeDeck] === activeDeckDbId}
                            activeOpacity={0.7}
                        >
                            <Text style={{
                                fontFamily: 'JetBrainsMono_500Medium',
                                fontSize: 11,
                                letterSpacing: 1.5,
                                color: deckIds[activeDeck] === activeDeckDbId ? C.tertiaryDim : C.outline,
                            }}>
                                {deckIds[activeDeck] === activeDeckDbId ? '★ ACTIVE DECK' : 'USE THIS DECK'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Sloty decku ── */}
                <View style={s.sectionRow}>
                    <Text style={s.sectionText}>CURRENT DECK · TAP TO REMOVE</Text>
                </View>

                <View style={s.slotsGrid}>
                    {Array.from({ length: DECK_SIZE }, (_, i) => {
                        const card_id = currentDeck[i];
                        const card    = card_id !== undefined ? byId[card_id] : null;
                        const color   = card ? (CARD_META[card.type as CardType]?.color ?? C.outlineVariant) : C.outlineVariant;
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[s.slot, { borderColor: card ? color : C.outlineVariant }]}
                                onPress={() => card && removeSlot(i)}
                                activeOpacity={card ? 0.65 : 1}
                            >
                                {card && (() => {
                                    const Icon = ICON_MAP[card.type as CardType];
                                    return (
                                        <>
                                            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                                {Icon && <Icon width={Math.round(SLOT_W * 0.5)} height={Math.round(SLOT_W * 0.5)} />}
                                            </View>
                                            <Text style={[s.slotType, { color, textAlign: 'center' }]}>{CARD_META[card.type as CardType]?.label ?? card.type}</Text>
                                        </>
                                    );
                                })()}
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
                            const col = CARD_META[card.type as CardType]?.color ?? C.outlineVariant;
                            const pct = (count / DECK_SIZE) * 100;
                            return (
                                <View key={card.card_id} style={[s.propChip, { borderColor: col + '55' }]}>
                                    <Text style={[s.propType, { color: col }]}>{CARD_META[card.type as CardType]?.label ?? card.type}</Text>
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
                        {isFull ? 'DECK FULL · TAP SLOT ABOVE TO REMOVE' : 'CHOOSE TYPE · TAP TO ADD'}
                    </Text>
                </View>

                <View style={s.typesGrid}>
                    {cardTypes.map(card => {
                        const col   = CARD_META[card.type as CardType]?.color ?? C.outlineVariant;
                        const count = countById[card.card_id] ?? 0;
                        const Icon  = ICON_MAP[card.type as CardType];
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
                                {count > 0 && (
                                    <View style={[s.badge, { backgroundColor: col }]}>
                                        <Text style={s.badgeText}>{count}</Text>
                                    </View>
                                )}
                                <View style={{ alignItems: 'center' }}>
                                    {Icon && <Icon width={Math.round(TYPE_W * 0.32)} height={Math.round(TYPE_W * 0.32)} />}
                                </View>
                                <Text style={[s.typeCardType, { color: isFull ? C.outline : col }]}>
                                    {CARD_META[card.type as CardType]?.label ?? card.type}
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

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.outlineVariant,
        backgroundColor: C.surfaceContainerLow,
    },
    title:    { color: C.onSurface, fontFamily: 'JetBrainsMono_500Medium', fontSize: 17, fontWeight: '700', letterSpacing: 2 },
    subtitle: { color: C.outline,  fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1,  marginTop: 2 },

    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    clearBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: C.outlineVariant,
    },
    clearBtnText: { color: C.outline, fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
    saveBtn: {
        backgroundColor: C.tertiary,
        paddingHorizontal: 18,
        paddingVertical: 8,
        shadowColor: C.tertiary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 8,
    },
    saveBtnText: { color: '#000', fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, fontWeight: '700', letterSpacing: 2 },


    backBtn: {
        width: 32,
        height: 32,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.outlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnText: {
        color: C.onSurface,
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 18,
    },

    tabsWrap: { borderBottomWidth: 1, borderBottomColor: C.outlineVariant, backgroundColor: C.surfaceContainerLow, maxHeight: 60 },
    tabsRow:  { paddingHorizontal: PAD, paddingVertical: 8, gap: 6, flexDirection: 'row' },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: C.outlineVariant,
        backgroundColor: C.surface,
        minWidth: 72,
        alignItems: 'center',
    },
    tabActive: {
        borderColor: C.secondary,
        backgroundColor: '#0a1f1e',
        shadowColor: C.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    tabTitle:       { color: C.outline,    fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
    tabTitleActive: { color: C.secondary },
    tabSub:         { color: C.outlineVariant, fontFamily: 'JetBrainsMono_500Medium', fontSize: 8, letterSpacing: 0.5, marginTop: 2 },
    tabSubActive:   { color: C.secondary + 'aa' },

    sectionRow:  { paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 6 },
    sectionText: { color: C.outline, fontFamily: 'JetBrainsMono_500Medium', fontSize: 8, letterSpacing: 2 },

    // Deck slots
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: PAD,
        gap: SLOT_GAP,
    },
    slot: {
        width: SLOT_W,
        height: SLOT_H,
        borderWidth: 1,
        backgroundColor: C.surface,
        padding: 5,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    slotType: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 7,  fontWeight: '700', letterSpacing: 1 },
    slotBar:  { flex: 1, marginVertical: 3 },
    slotCat:  { fontFamily: 'JetBrainsMono_500Medium', fontSize: 6,  letterSpacing: 0.5 },

    // Proporcje
    proportionsRow: {
        paddingHorizontal: PAD,
        paddingTop: 10,
        gap: 5,
    },
    propChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        backgroundColor: C.surface,
    },
    propType:  { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, fontWeight: '700', letterSpacing: 1, width: 64 },
    propBarBg: { flex: 1, height: 4, backgroundColor: C.outlineVariant },
    propBarFill: { height: 4 },
    propCount: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, fontWeight: '700', width: 20, textAlign: 'right' },

    divider: {
        height: 1,
        backgroundColor: C.outlineVariant,
        marginHorizontal: PAD,
        marginTop: 12,
        marginBottom: 4,
    },

    // Siatka 6 typów kart
    typesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: PAD,
        gap: TYPE_GAP,
        paddingTop: 4,
    },
    typeCard: {
        width: TYPE_W,
        height: TYPE_H,
        borderWidth: 1,
        backgroundColor: C.surface,
        padding: 10,
        justifyContent: 'space-between',
    },
    typeCardDisabled: { opacity: 0.45 },
    typeCardType: {
        fontFamily: 'JetBrainsMono_500Medium',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
    },
    typeCardCats: {
        color: C.outline,
        fontFamily: 'JetBrainsMono_500Medium',
        fontSize: 7,
        letterSpacing: 0.5,
        lineHeight: 11,
    },

    // Badge z liczbą
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    badgeText: { color: '#000', fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, fontWeight: '700' },
});

