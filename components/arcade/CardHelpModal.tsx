import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { arc } from '@/lib/arcade-theme';
import { CARD_META, ICON_MAP } from '@/components/cards/typed-card';
import type { CardType } from '@/lib/match-api';

const CARD_TYPES: CardType[] = ['DMG', 'HEAL', 'POISON', 'DMG_BLOCK', 'HEAL_REMOVE', 'TIME_BUFF'];

const DESCRIPTIONS: Record<CardType, string> = {
  DMG:         'Deal direct damage to your opponent\'s HP.',
  HEAL:        'Restore your own HP.',
  POISON:      'Apply poison stacks. Each stack deals 3 HP at the start of each of your turns.',
  DMG_BLOCK:   'Blind one of your opponent\'s answers for furture turns AND deal a small HP hit.',
  HEAL_REMOVE: 'Give yourself a 50/50 hint next turns (hides 2 wrong options) and restore a little HP.',
  TIME_BUFF:   'Get extra seconds on your next question timer, deal a small hit, and heal yourself.',
};

const SCALE_TIERS: Record<CardType, [string, string, string]> = {
  DMG:         ['-12 HP', '-15 HP', '-20 HP'],
  HEAL:        ['+10 HP', '+12 HP', '+15 HP'],
  POISON:      ['+1 stack', '+1 stack', '+2 stacks'],
  DMG_BLOCK:   ['2 turns', '3 turns', '4 turns'],
  HEAL_REMOVE: ['1 turn', '2 turns', '3 turns'],
  TIME_BUFF:   ['+3 sec', '+5 sec', '+7 sec'],
};

const TIER_LABELS = ['1–2★', '3–4★', '5★'];

interface CardHelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CardHelpModal({ visible, onClose }: CardHelpModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>CARD GUIDE</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            {CARD_TYPES.map(type => {
              const meta  = CARD_META[type];
              const Icon  = ICON_MAP[type];
              const tiers = SCALE_TIERS[type];
              return (
                <View key={type} style={[s.card, { borderColor: meta.color + '44' }]}>
                  <View style={s.cardHeader}>
                    <View style={[s.iconBox, { backgroundColor: meta.color + '18' }]}>
                      {Icon && <Icon width={36} height={36} />}
                    </View>
                    <View style={s.cardMeta}>
                      <Text style={[s.typeName, { color: meta.color }]}>{meta.label}</Text>
                      <Text style={s.description}>{DESCRIPTIONS[type]}</Text>
                    </View>
                  </View>
                  <View style={s.tierRow}>
                    {tiers.map((val, i) => (
                      <View key={i} style={[s.tierChip, { borderColor: meta.color + '66' }]}>
                        <Text style={s.tierLabel}>{TIER_LABELS[i]}</Text>
                        <Text style={[s.tierValue, { color: meta.color }]}>{val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            <Text style={s.footer}>
              {'Correct answer → effect applies\nWrong / timeout → −5 HP\nStar rating = community average from forum voters'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,12,28,0.82)',
  },
  sheet: {
    backgroundColor: arc.surface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: arc.surfaceHigh,
    maxHeight: '88%',
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: arc.outline,
    letterSpacing: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    backgroundColor: arc.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 16,
    color: arc.ink,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: arc.surfaceHigh,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  typeName: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  description: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: arc.ink,
    lineHeight: 18,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierChip: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  tierLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 8,
    color: arc.outline,
    letterSpacing: 0.5,
  },
  tierValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    letterSpacing: -0.3,
  },
  footer: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: arc.outline,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 14,
    marginTop: 4,
  },
});
