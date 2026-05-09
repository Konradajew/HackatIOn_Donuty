import { View, Text, StyleSheet } from 'react-native';
import { arc } from '@/lib/arcade-theme';

type CardType = 'DMG' | 'HEAL' | 'DOT';

const TYPE_COLORS: Record<CardType, string> = {
  DMG: arc.primaryContainer,
  HEAL: arc.secondaryContainer,
  DOT: arc.tertiary,
};

interface BattleCardProps {
  type: CardType;
  cat: string;
  val: number;
  w?: number;
  dim?: boolean;
  sel?: boolean;
}

export function BattleCard({ type, cat, val, w = 84, dim = false, sel = false }: BattleCardProps) {
  const c = TYPE_COLORS[type];
  const h = Math.round(w * 1.4);

  return (
    <View
      style={[
        s.card,
        { width: w, height: h, borderColor: sel ? c : arc.surfaceHigh, borderWidth: sel ? 1.5 : 1 },
        sel && { shadowColor: c, shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
        dim && s.dim,
      ]}
    >
      <View style={s.topRow}>
        <View style={[s.typePill, { backgroundColor: c + '22' }]}>
          <Text style={[s.typePillText, { color: c }]}>{type}</Text>
        </View>
        <Text style={[s.valText, { color: arc.ink }]}>{val}</Text>
      </View>
      <View style={s.center}>
        <Text
          style={[
            s.catGlyph,
            {
              color: c,
              textShadowColor: c,
              textShadowRadius: sel ? 10 : 0,
              textShadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          {cat[0]}
        </Text>
      </View>
      <Text style={[s.catLabel, { color: arc.outline }]}>{cat}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: arc.surface,
    padding: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  dim: { opacity: 0.4 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typePill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  typePillText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    letterSpacing: 1,
  },
  valText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    lineHeight: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catGlyph: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
  },
  catLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 8,
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
