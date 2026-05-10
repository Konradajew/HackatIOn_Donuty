import { TypedCard } from "@/components/cards/typed-card";
import { arc } from "@/lib/arcade-theme";
import type { CardType } from "@/lib/match-api";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const HINT: Record<CardType, string> = {
  DMG: "Answer to damage your opponent",
  HEAL: "Answer to heal yourself",
  POISON: "Answer to poison your opponent",
  DMG_BLOCK: "Answer to blackout one opponent answer",
  HEAL_REMOVE: "Answer for a 50/50 buff next turn",
  TIME_BUFF: "Answer for extra time next turn",
};

const LABELS = ["A", "B", "C", "D"];

interface QuestionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (answerIndex: number) => void;
  card: { type: CardType; cat: string };
  question: string;
  answers: string[];
  timerSec: number;
  durationSec: number;
  difficulty?: number;
  result?: { correct_idx: number; picked_idx: number } | null;
  blackoutIdx?: number | null;
  disabledIdxs?: number[] | null;
}

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
  blackoutIdx,
  disabledIdxs,
}: QuestionSheetProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Responsive scaling based on screen size
  const scale = Math.min(screenW, screenH) / 375; // 375 is base iPhone size
  const isSmallScreen = screenH < 700;

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
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={[s.sheet, { maxHeight: screenH * 0.9 }]}>
          <View style={s.handle} />

          <ScrollView
            style={s.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContentContainer}
          >
            {/* Card meta + timer */}
            <View style={[s.metaRow, { gap: 8 * scale }]}>
              <TypedCard
                type={card.type}
                cat={card.cat}
                width={Math.max(60, 75 * scale)}
                selected
              />
              <View style={s.metaText}>
                <View style={s.chipRow}>
                  <View
                    style={[
                      s.chip,
                      { backgroundColor: arc.primaryContainer + "22" },
                    ]}
                  >
                    <Text
                      style={[
                        s.chipText,
                        {
                          color: arc.primaryContainer,
                          fontSize: Math.max(9, 12 * scale),
                        },
                      ]}
                    >
                      {card.cat}
                    </Text>
                  </View>
                  <Text
                    style={[s.stars, { fontSize: Math.max(10, 12 * scale) }]}
                  >
                    {"★".repeat(difficulty)}
                    {"☆".repeat(5 - difficulty)}
                  </Text>
                </View>
                <Text
                  style={[s.hintText, { fontSize: Math.max(11, 12 * scale) }]}
                  numberOfLines={2}
                >
                  {HINT[card.type]}
                </Text>
              </View>
              <View
                style={[s.timerBox, { width: 50 * scale, height: 50 * scale }]}
              >
                <Text
                  style={[s.timerNum, { fontSize: Math.max(14, 18 * scale) }]}
                >
                  {String(timerSec).padStart(2, "0")}
                </Text>
                <Text
                  style={[s.timerLabel, { fontSize: Math.max(7, 8 * scale) }]}
                >
                  SEC
                </Text>
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
            <Text
              style={[
                s.questionText,
                {
                  fontSize: Math.max(18, 24 * scale),
                  marginBottom: 12 * scale,
                },
              ]}
            >
              {question}
            </Text>

            {/* Answers */}
            <View style={[s.answers, { gap: 6 * scale }]}>
              {answers.map((ans, i) => {
                const isSel = selected === i;
                const isCorrectResult =
                  result != null && i === result.correct_idx;
                const isWrongPick =
                  result != null &&
                  i === result.picked_idx &&
                  i !== result.correct_idx;
                const isBlackedOut = result == null && blackoutIdx === i;
                const isDisabled =
                  result == null && !!disabledIdxs?.includes(i);

                return (
                  <Pressable
                    key={i}
                    style={[
                      s.answerRow,
                      {
                        minHeight: Math.max(56, 64 * scale),
                        paddingHorizontal: 10 * scale,
                        gap: 10 * scale,
                      },
                      isDisabled && s.answerRowDisabled,
                      isSel &&
                        !result &&
                        !isDisabled && {
                          backgroundColor: arc.secondaryContainer + "18",
                          borderColor: arc.secondaryContainer,
                          borderWidth: 1.5,
                          shadowColor: arc.secondaryContainer,
                          shadowOpacity: 0.35,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 0 },
                          elevation: 4,
                        },
                      isCorrectResult && {
                        backgroundColor: arc.tertiary + "22",
                        borderColor: arc.tertiary,
                        borderWidth: 1.5,
                      },
                      isWrongPick && {
                        backgroundColor: arc.primaryContainer + "22",
                        borderColor: arc.primaryContainer,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() =>
                      result == null && !isDisabled && setSelected(i)
                    }
                    disabled={result != null || isDisabled}
                  >
                    <View
                      style={[
                        s.answerLabel,
                        { width: 32 * scale, height: 32 * scale },
                        isCorrectResult
                          ? { backgroundColor: arc.tertiary }
                          : isWrongPick
                            ? { backgroundColor: arc.primaryContainer }
                            : isSel && !isDisabled
                              ? { backgroundColor: arc.secondaryContainer }
                              : {
                                  backgroundColor: arc.surfaceHigh,
                                  borderWidth: 1,
                                  borderColor: arc.surfaceHigh,
                                },
                      ]}
                    >
                      <Text
                        style={[
                          s.answerLabelText,
                          {
                            fontSize: Math.max(11, 14 * scale),
                            color:
                              isCorrectResult ||
                              isWrongPick ||
                              (isSel && !isDisabled)
                                ? arc.bg
                                : arc.outline,
                          },
                        ]}
                      >
                        {LABELS[i]}
                      </Text>
                    </View>

                    {isBlackedOut ? (
                      <View style={s.blackoutBar} />
                    ) : (
                      <Text
                        style={[
                          s.answerText,
                          { fontSize: Math.max(14, 18 * scale) },
                          isDisabled && { color: arc.outline },
                        ]}
                        numberOfLines={2}
                      >
                        {ans}
                      </Text>
                    )}

                    {isCorrectResult && (
                      <Text
                        style={[
                          s.checkMark,
                          {
                            fontSize: Math.max(14, 18 * scale),
                            color: arc.tertiary,
                          },
                        ]}
                      >
                        ✓
                      </Text>
                    )}
                    {isWrongPick && (
                      <Text
                        style={[
                          s.checkMark,
                          {
                            fontSize: Math.max(14, 18 * scale),
                            color: arc.primaryContainer,
                          },
                        ]}
                      >
                        ✗
                      </Text>
                    )}
                    {!result && isSel && !isDisabled && (
                      <Text
                        style={[
                          s.checkMark,
                          {
                            fontSize: Math.max(14, 18 * scale),
                            color: arc.secondaryContainer,
                          },
                        ]}
                      >
                        ✓
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Submit */}
          <View style={[s.submitArea, { paddingHorizontal: 16 * scale }]}>
            <Pressable
              style={[
                s.submitBtn,
                { height: 50 * scale },
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
              <Text
                style={[
                  s.submitText,
                  {
                    fontSize: Math.max(14, 18 * scale),
                    color:
                      selected !== null && result == null
                        ? arc.bg
                        : arc.outline,
                  },
                ]}
              >
                Lock in answer →
              </Text>
            </Pressable>
            <Text style={[s.submitHint, { fontSize: Math.max(9, 11 * scale) }]}>
              ANSWER LOCKS IN {durationSec}s · WRONG = LOSE 5 HP
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,12,28,0.72)",
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
    flexDirection: "column",
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: arc.surfaceHigh,
    alignSelf: "center",
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  metaText: {
    flex: 1,
    gap: 4,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 9,
    letterSpacing: 1,
  },
  stars: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    color: arc.outline,
  },
  hintText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: arc.ink,
    lineHeight: 17,
  },
  timerBox: {
    backgroundColor: arc.surfaceHigh,
    borderWidth: 2,
    borderColor: arc.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: arc.secondaryContainer,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  timerNum: {
    fontFamily: "JetBrainsMono_500Medium",
    color: arc.secondaryContainer,
    lineHeight: 20,
  },
  timerLabel: {
    fontFamily: "JetBrainsMono_500Medium",
    color: arc.outline,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: arc.surfaceHigh,
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    backgroundColor: arc.secondaryContainer,
  },
  questionText: {
    fontFamily: "SpaceGrotesk_700Bold",
    color: arc.ink,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  answers: {
    marginBottom: 4,
  },
  answerRow: {
    backgroundColor: arc.surfaceHigh,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    flexDirection: "row",
    alignItems: "center",
  },
  answerRowDisabled: {
    opacity: 0.35,
  },
  answerLabel: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  answerLabelText: {
    fontFamily: "JetBrainsMono_500Medium",
  },
  answerText: {
    fontFamily: "SpaceGrotesk_400Regular",
    color: arc.ink,
    flex: 1,
  },
  blackoutBar: {
    flex: 1,
    height: 22,
    backgroundColor: "#000000",
    borderRadius: 2,
  },
  checkMark: {
    fontFamily: "SpaceGrotesk_400Regular",
  },
  submitArea: {
    paddingVertical: 16,
    paddingBottom: 28,
    gap: 10,
  },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.5,
  },
  submitHint: {
    fontFamily: "JetBrainsMono_500Medium",
    color: arc.outline,
    textAlign: "center",
    letterSpacing: 1,
  },
});
