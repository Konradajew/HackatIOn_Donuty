import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { arc } from '@/lib/arcade-theme';
import { BattleCard } from './BattleCard';

type CardType = 'DMG' | 'HEAL' | 'DOT';

interface QuestionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (answerIndex: number) => void;
  card: { type: CardType; cat: string; val: number };
  question: string;
  answers: string[];
  timerSec: number;
  durationSec: number;
  difficulty?: number;
  result?: { correct_idx: number; picked_idx: number } | null;
}

const LABELS = ['A', 'B', 'C', 'D'];

export function QuestionSheet({
  visible,
  onClose,
  onSubmit,
  card,
  question,
  answers,
  timerSec,
  durationSec,
  difficulty = 3,
  result,
}: QuestionSheetProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const progress = Math.max(0, Math.min(1, timerSec / durationSec));

  const handleSubmit = () => {
    if (selected === null) return;
    const idx = selected;
    setSelected(null);
    onSubmit(idx);
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Card meta + timer */}
          <View style={s.metaRow}>
            <BattleCard type={card.type} cat={card.cat} val={card.val} w={56} sel />
            <View style={s.metaText}>
              <View style={s.chipRow}>
                <View style={[s.chip, { backgroundColor: arc.primaryContainer + '22' }]}>
                  <Text style={[s.chipText, { color: arc.primaryContainer }]}>{card.cat}</Text>
                </View>
                <Text style={s.stars}>
                  {'★'.repeat(difficulty)}
                  {'☆'.repeat(5 - difficulty)}
                </Text>
              </View>
              <Text style={s.hintText} numberOfLines={2}>
                Answer to deal {card.val} damage
              </Text>
            </View>
            <View style={s.timerBox}>
              <Text style={s.timerNum}>{String(timerSec).padStart(2, '0')}</Text>
              <Text style={s.timerLabel}>SEC</Text>
            </View>
          </View>

          {/* Progress strip */}
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${progress * 100}%`,
                  shadowColor: arc.secondaryContainer,
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            />
          </View>

          {/* Question */}
          <Text style={s.questionText}>{question}</Text>

          {/* Answers */}
          <View style={s.answers}>
            {answers.map((ans, i) => {
              const isSel = selected === i;
              const isCorrectResult = result != null && i === result.correct_idx;
              const isWrongPick = result != null && i === result.picked_idx && i !== result.correct_idx;
              return (
                <Pressable
                  key={i}
                  style={[
                    s.answerRow,
                    isSel && !result && {
                      backgroundColor: arc.secondaryContainer + '18',
                      borderColor: arc.secondaryContainer,
                      borderWidth: 1.5,
                      shadowColor: arc.secondaryContainer,
                      shadowOpacity: 0.35,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 4,
                    },
                    isCorrectResult && {
                      backgroundColor: arc.tertiary + '22',
                      borderColor: arc.tertiary,
                      borderWidth: 1.5,
                    },
                    isWrongPick && {
                      backgroundColor: arc.primaryContainer + '22',
                      borderColor: arc.primaryContainer,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => result == null && setSelected(i)}
                  disabled={result != null}
                >
                  <View
                    style={[
                      s.answerLabel,
                      isCorrectResult
                        ? { backgroundColor: arc.tertiary }
                        : isWrongPick
                          ? { backgroundColor: arc.primaryContainer }
                          : isSel
                            ? { backgroundColor: arc.secondaryContainer }
                            : { backgroundColor: arc.surfaceHigh, borderWidth: 1, borderColor: arc.surfaceHigh },
                    ]}
                  >
                    <Text style={[s.answerLabelText, { color: (isCorrectResult || isWrongPick || isSel) ? arc.bg : arc.outline }]}>
                      {LABELS[i]}
                    </Text>
                  </View>
                  <Text style={s.answerText} numberOfLines={2}>
                    {ans}
                  </Text>
                  {isCorrectResult && (
                    <Text style={[s.checkMark, { color: arc.tertiary }]}>✓</Text>
                  )}
                  {isWrongPick && (
                    <Text style={[s.checkMark, { color: arc.primaryContainer }]}>✗</Text>
                  )}
                  {!result && isSel && (
                    <Text style={[s.checkMark, { color: arc.secondaryContainer }]}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Submit */}
          <View style={s.submitArea}>
            <Pressable
              style={[
                s.submitBtn,
                selected !== null && result == null
                  ? {
                      backgroundColor: arc.secondaryContainer,
                      shadowColor: arc.secondaryContainer,
                      shadowOpacity: 0.5,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 6,
                    }
                  : { backgroundColor: arc.surfaceHigh },
              ]}
              onPress={handleSubmit}
              disabled={selected === null || result != null}
            >
              <Text style={[s.submitText, { color: selected !== null && result == null ? arc.bg : arc.outline }]}>
                Lock in answer →
              </Text>
            </Pressable>
            <Text style={s.submitHint}>ANSWER LOCKS IN {durationSec}s · WRONG = LOSE CARD</Text>
          </View>
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
    backgroundColor: 'rgba(13,12,28,0.72)',
  },
  sheet: {
    backgroundColor: arc.surface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: arc.surfaceHigh,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: arc.surfaceHigh,
    alignSelf: 'center',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  metaText: {
    flex: 1,
    gap: 4,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    letterSpacing: 1,
  },
  stars: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: arc.outline,
  },
  hintText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: arc.ink,
    lineHeight: 17,
  },
  timerBox: {
    width: 54,
    height: 54,
    backgroundColor: arc.surfaceHigh,
    borderWidth: 2,
    borderColor: arc.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: arc.secondaryContainer,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  timerNum: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    color: arc.secondaryContainer,
    lineHeight: 20,
  },
  timerLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 8,
    color: arc.outline,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: arc.surfaceHigh,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: arc.secondaryContainer,
  },
  questionText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: arc.ink,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 20,
  },
  answers: {
    gap: 10,
    marginBottom: 4,
  },
  answerRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    backgroundColor: arc.surfaceHigh,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  answerLabel: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  answerLabelText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
  },
  answerText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 18,
    color: arc.ink,
    flex: 1,
  },
  checkMark: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 18,
  },
  submitArea: {
    paddingVertical: 16,
    paddingBottom: 28,
    gap: 10,
  },
  submitBtn: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  submitHint: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.outline,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
