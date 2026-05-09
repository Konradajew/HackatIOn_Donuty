import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PINK = '#FF1F8F';
const CYAN = '#19F0DC';
const LIME = '#C8FF1A';
const BG = '#13121c';
const SURFACE = '#1f1f28';
const SURFACE_LOW = '#1b1b24';
const SURFACE_HIGH = '#292933';
const BORDER = '#5b3f47';
const TEXT_DIM = '#aa8891';

const TOTAL_DECKS = 5;
const CARDS_PER_DECK = 10;
const CARD_COLS = 5;
const GRID_PADDING = 12;
const CARD_GAP = 6;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP * (CARD_COLS - 1)) / CARD_COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.45;

export default function DeckScreen() {
    const [activeDeck, setActiveDeck] = useState(0);

    const handleDeckSelect = (index: number) => {
        setActiveDeck(index);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleCardTap = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Text style={styles.backText}>◀ BACK</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>DECK BUILDER</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.deckCount}>5 DECKS</Text>
                </View>
            </View>

            {/* Deck Selector */}
            <View style={styles.deckSelectorWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.deckSelectorContent}
                >
                    {Array.from({ length: TOTAL_DECKS }, (_, i) => {
                        const isActive = activeDeck === i;
                        return (
                            <TouchableOpacity
                                key={i}
                                onPress={() => handleDeckSelect(i)}
                                style={[styles.deckTab, isActive && styles.deckTabActive]}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.deckTabLabel, isActive && styles.deckTabLabelActive]}>
                                    DECK {i + 1}
                                </Text>
                                <View style={styles.deckMiniGrid}>
                                    {Array.from({ length: CARDS_PER_DECK }, (_, j) => (
                                        <View
                                            key={j}
                                            style={[styles.deckMiniCard, isActive && styles.deckMiniCardActive]}
                                        />
                                    ))}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Section divider */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionLabel}>DECK {activeDeck + 1} — 10 KART</Text>
                <View style={styles.sectionLine} />
            </View>

            {/* Card Grid + actions */}
            <ScrollView
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                style={styles.gridScroll}
            >
                <View style={styles.grid}>
                    {Array.from({ length: CARDS_PER_DECK }, (_, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.cardSlot}
                            onPress={handleCardTap}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardBody}>
                                <Text style={styles.cardPlus}>+</Text>
                            </View>
                            <View style={styles.cardFooter}>
                                <Text style={styles.cardIndex}>{String(i + 1).padStart(2, '0')}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stats bar */}
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>KARTY</Text>
                        <Text style={[styles.statValue, { color: CYAN }]}>0 / 10</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>ŚR. KOSZT</Text>
                        <Text style={[styles.statValue, { color: LIME }]}>—</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>STATUS</Text>
                        <Text style={[styles.statValue, { color: TEXT_DIM }]}>PUSTY</Text>
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8}>
                        <Text style={styles.btnPrimaryText}>EDYTUJ DECK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.8}>
                        <Text style={styles.btnSecondaryText}>KOPIUJ</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        backgroundColor: SURFACE_LOW,
    },
    backBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: CYAN,
    },
    backText: {
        color: CYAN,
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.5,
    },
    headerTitle: {
        color: PINK,
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 3,
        textShadowColor: PINK,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    headerRight: {
        width: 70,
        alignItems: 'flex-end',
    },
    deckCount: {
        color: TEXT_DIM,
        fontFamily: 'monospace',
        fontSize: 10,
        letterSpacing: 1,
    },

    // Deck Selector
    deckSelectorWrapper: {
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        backgroundColor: SURFACE_LOW,
    },
    deckSelectorContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
        flexDirection: 'row',
    },
    deckTab: {
        width: 100,
        padding: 8,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: SURFACE,
        gap: 6,
    },
    deckTabActive: {
        borderColor: PINK,
        borderWidth: 2,
        backgroundColor: '#1f0a14',
        shadowColor: PINK,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 12,
    },
    deckTabLabel: {
        color: TEXT_DIM,
        fontFamily: 'monospace',
        fontSize: 8,
        fontWeight: '600',
        letterSpacing: 2,
    },
    deckTabLabelActive: {
        color: PINK,
    },
    deckMiniGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
    },
    deckMiniCard: {
        width: 14,
        height: 20,
        backgroundColor: SURFACE_HIGH,
        borderWidth: 1,
        borderColor: BORDER,
    },
    deckMiniCardActive: {
        borderColor: '#5b1f3a',
        backgroundColor: '#2a0f1c',
    },

    // Section label
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: BORDER,
    },
    sectionLabel: {
        color: TEXT_DIM,
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 2,
    },

    // Grid
    gridScroll: {
        flex: 1,
    },
    gridContainer: {
        paddingHorizontal: GRID_PADDING,
        paddingBottom: 32,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
    },
    cardSlot: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT + 22,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: SURFACE,
        overflow: 'hidden',
    },
    cardBody: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    cardPlus: {
        color: BORDER,
        fontSize: 24,
        fontWeight: '200',
    },
    cardFooter: {
        height: 22,
        backgroundColor: SURFACE_HIGH,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardIndex: {
        color: CYAN,
        fontFamily: 'monospace',
        fontSize: 9,
        letterSpacing: 2,
    },

    // Stats bar
    statsBar: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: SURFACE_LOW,
        marginTop: 16,
    },
    statItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: BORDER,
        alignSelf: 'stretch',
    },
    statLabel: {
        color: TEXT_DIM,
        fontFamily: 'monospace',
        fontSize: 8,
        letterSpacing: 2,
    },
    statValue: {
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    btnPrimary: {
        flex: 1,
        backgroundColor: PINK,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: PINK,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.65,
        shadowRadius: 14,
        elevation: 12,
    },
    btnPrimaryText: {
        color: '#000',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 3,
    },
    btnSecondary: {
        paddingHorizontal: 20,
        borderWidth: 2,
        borderColor: CYAN,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnSecondaryText: {
        color: CYAN,
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 3,
    },
});