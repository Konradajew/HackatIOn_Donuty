import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { arc } from '@/lib/arcade-theme';

interface VictoryOverlayProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  xp: number;
  coins: number;
  stats: { cards: string; acc: string; time: string };
}

export function VictoryOverlay({ visible, onClose, onContinue, xp, coins, stats }: VictoryOverlayProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.trophy}>
              <Text style={s.trophyGlyph}>★</Text>
            </View>
            <View>
              <Text style={s.title}>VICTORY</Text>
              <Text style={s.sub}>+{xp} XP · +{coins} COINS</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { l: 'CARDS', v: stats.cards },
              { l: 'ACC', v: stats.acc },
              { l: 'TIME', v: stats.time },
            ].map((stat) => (
              <View key={stat.l} style={s.statTile}>
                <Text style={s.statValue}>{stat.v}</Text>
                <Text style={s.statLabel}>{stat.l}</Text>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View style={s.btnRow}>
            <Pressable style={s.ghostBtn} onPress={onClose}>
              <Text style={s.ghostBtnText}>SUMMARY</Text>
            </Pressable>
            <Pressable
              style={[
                s.primaryBtn,
                {
                  backgroundColor: arc.tertiary,
                  shadowColor: arc.tertiary,
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                },
              ]}
              onPress={onContinue}
            >
              <Text style={[s.primaryBtnText, { color: arc.bg }]}>NEXT</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,12,28,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: arc.surface,
    borderWidth: 1.5,
    borderColor: arc.tertiary,
    padding: 18,
    shadowColor: arc.tertiary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  trophy: {
    width: 36,
    height: 36,
    backgroundColor: arc.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGlyph: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: arc.bg,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: arc.tertiary,
    letterSpacing: 3,
    lineHeight: 30,
  },
  sub: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 1,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statTile: {
    flex: 1,
    backgroundColor: arc.surfaceHigh,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: arc.secondaryContainer,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 8,
    color: arc.outline,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ghostBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: arc.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.ink,
    letterSpacing: 2,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 2,
  },
});
