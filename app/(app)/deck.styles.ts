// app/pick-nickname.styles.ts
import {Dimensions, StyleSheet} from 'react-native';
import { ArcadeColors as C, ArcadeSpacing as S } from '@/constants/theme';

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

export const styles = StyleSheet.create({
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
            backgroundColor: "#FF0000",
            paddingHorizontal: 18,
            paddingVertical: 8,
            shadowColor: "#FF0000",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 10,
            elevation: 8,
        },
        backBtnText: {color: '#000', fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, fontWeight: '700', letterSpacing: 2},

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
