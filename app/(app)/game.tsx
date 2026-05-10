import { DefeatOverlay } from "@/components/arcade/DefeatOverlay";
import { QuestionSheet } from "@/components/arcade/QuestionSheet";
import { VictoryOverlay } from "@/components/arcade/VictoryOverlay";
import { CARD_META, TypedCard } from "@/components/cards/typed-card";
import { arc, arcSpace } from "@/lib/arcade-theme";
import { useAuth } from "@/lib/auth-context";
import type { CardType } from "@/lib/match-api";
import { concedeMatch } from "@/lib/match-api";
import {
  MatchProvider,
  QUESTION_TIMEOUT_SENTINEL,
  useMatch,
} from "@/lib/match-store";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function GameInner() {
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';

  const { snapshot, cardTypes, loading, error, play, answer, questionDeadline, lastResult, busy } = useMatch();

  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  const [pickTimeLeft, setPickTimeLeft] = useState(15);
  const pickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pickAutoFiredRef = useRef(false);

  // Damage animation
  const damageGlowOpacity = useRef(new Animated.Value(0)).current;
  const healGlowOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevHpRef = useRef<number | null>(null);

  const handlePlayCard = useCallback(async () => {
    if (!snapshot) return;
    const isMyTurn = snapshot.whose_turn === uid;
    const isQuestionActive = snapshot.current_question.q_id != null;
    const currentHand = snapshot.you.hand;
    if (currentHand.length === 0 || !isMyTurn || isQuestionActive || busy) return;
    const idx = selectedSlotIdx != null && selectedSlotIdx < currentHand.length ? selectedSlotIdx : 0;
    try {
      await play(idx);
      setSelectedSlotIdx(0);
    } catch {}
  }, [snapshot, uid, selectedSlotIdx, play, busy]);

  const handlePlayCardRef = useRef(handlePlayCard);
  useEffect(() => { handlePlayCardRef.current = handlePlayCard; }, [handlePlayCard]);

  const busyRef = useRef(busy);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  const handleAnswer = useCallback(async (idx: number) => {
    try { await answer(idx); } catch {}
  }, [answer]);

  const handleConcede = () => {
    if (!snapshot) {
      router.replace("/");
      return;
    }
    Alert.alert("Concede match?", "Your opponent wins.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Concede",
        style: "destructive",
        onPress: async () => {
          try {
            await concedeMatch(snapshot.match_id);
          } catch {}
          router.replace("/");
        },
      },
    ]);
  };

  // Question countdown timer
  useEffect(() => {
    if (questionDeadline == null) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(15);
      autoSubmittedRef.current = false;
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((questionDeadline - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    };
    tick();
    timerRef.current = setInterval(tick, 200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questionDeadline]);

  // Auto-submit on question timeout
  useEffect(() => {
    if (
      timeLeft <= 0 &&
      questionDeadline != null &&
      snapshot?.current_question.q_id != null &&
      !autoSubmittedRef.current
    ) {
      autoSubmittedRef.current = true;
      answer(QUESTION_TIMEOUT_SENTINEL).catch(() => {});
    }
  }, [timeLeft, questionDeadline, answer, snapshot?.current_question.q_id]);

  // Damage/Heal animation trigger
  useEffect(() => {
    if (!snapshot) return;
    const currentHp = snapshot.you.hp;
    if (prevHpRef.current === null) {
      prevHpRef.current = currentHp;
      return;
    }

    if (currentHp < prevHpRef.current) {
      // HP decreased - trigger damage animation
      damageGlowOpacity.setValue(0);
      shakeAnim.setValue(0);

      // Red glow pulse
      Animated.sequence([
        Animated.timing(damageGlowOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(damageGlowOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();

      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (currentHp > prevHpRef.current) {
      // HP increased - trigger heal animation
      healGlowOpacity.setValue(0);

      // Green glow pulse
      Animated.sequence([
        Animated.timing(healGlowOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(healGlowOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    }

    prevHpRef.current = currentHp;
  }, [snapshot?.you.hp, snapshot]);

  // Card-pick timer — only active on player's turn, no active question
  const myTurnForTimer = snapshot?.whose_turn === uid;
  const questionActiveForTimer = snapshot?.current_question.q_id != null;
  const handLengthForTimer = snapshot?.you.hand.length ?? 0;

  useEffect(() => {
    if (!myTurnForTimer || questionActiveForTimer || handLengthForTimer === 0) {
      if (pickTimerRef.current) clearInterval(pickTimerRef.current);
      setPickTimeLeft(15);
      pickAutoFiredRef.current = false;
      return;
    }
    const start = Date.now();
    const tick = () => {
      const remaining = Math.max(
        0,
        15 - Math.floor((Date.now() - start) / 1000),
      );
      setPickTimeLeft(remaining);
      if (remaining <= 0 && !pickAutoFiredRef.current && !busyRef.current) {
        pickAutoFiredRef.current = true;
        handlePlayCardRef.current();
      }
    };
    tick();
    pickTimerRef.current = setInterval(tick, 200);
    return () => {
      if (pickTimerRef.current) clearInterval(pickTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurnForTimer, questionActiveForTimer, handLengthForTimer]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: arc.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={arc.secondaryContainer} />
      </View>
    );
  }

  if (!snapshot) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: arc.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: arc.outline }}>Match not found</Text>
        {error ? (
          <Text style={{ color: arc.primaryContainer, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  const myHp = snapshot.you.hp;
  const oppHp = snapshot.opponent.hp;
  const myTurn = snapshot.whose_turn === uid;
  const hand = snapshot.you.hand;
  const questionActive = snapshot.current_question.q_id != null;
  const myAnswerCount = snapshot.answer_log.filter(
    (a) => a.player_id === uid,
  ).length;

  const isFinished =
    !snapshot.is_currently_played || snapshot.finished_at != null;
  const isWin = isFinished && snapshot.winner_id === uid;
  const isLoss =
    isFinished && snapshot.winner_id != null && snapshot.winner_id !== uid;
  const isDraw =
    isFinished && snapshot.winner_id == null && snapshot.finished_at != null;

  const navigateSummary = (result: "win" | "loss" | "draw") => {
    router.replace({
      pathname: "/game-summary",
      params: { matchId: String(snapshot.match_id), result },
    } as never);
  };

  const validSelectedIdx =
    selectedSlotIdx != null && selectedSlotIdx < hand.length
      ? selectedSlotIdx
      : hand.length > 0
        ? 0
        : null;
  const selectedEntry =
    validSelectedIdx != null ? hand[validSelectedIdx] : undefined;
  const selectedType: CardType = selectedEntry
    ? (cardTypes[selectedEntry.id] ?? "DMG")
    : "DMG";
  const selectedMeta = CARD_META[selectedType];

  // Played card for QuestionSheet display
  const playedCardId = snapshot.pending_card_id;
  const playedType: CardType =
    playedCardId != null ? (cardTypes[playedCardId] ?? "DMG") : selectedType;
  const playedCat: string = snapshot.current_question.category ?? "";

  const oppNick = (snapshot.opponent.nickname ?? "OPPONENT").toUpperCase();

  // Timer display
  const showPickTimer = myTurn && !questionActive && hand.length > 0;
  const displayedTimer = questionActive
    ? timeLeft
    : showPickTimer
      ? pickTimeLeft
      : null;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["rgba(255,72,152,0.08)", "transparent"]}
        style={s.glowTop}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(0,235,215,0.06)", "transparent"]}
        style={s.glowBottom}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        pointerEvents="none"
      />

      {/* Damage glow overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: damageGlowOpacity, zIndex: 100 },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["rgba(255, 59, 48, 0.6)", "transparent"]}
          style={s.edgeTop}
        />
        <LinearGradient
          colors={["transparent", "rgba(255, 59, 48, 0.6)"]}
          style={s.edgeBottom}
        />
        <LinearGradient
          colors={["rgba(255, 59, 48, 0.6)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.edgeLeft}
        />
        <LinearGradient
          colors={["transparent", "rgba(255, 59, 48, 0.6)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.edgeRight}
        />
      </Animated.View>

      {/* Heal glow overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: healGlowOpacity, zIndex: 100 },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["rgba(76, 175, 80, 0.5)", "transparent"]}
          style={s.edgeTop}
        />
        <LinearGradient
          colors={["transparent", "rgba(76, 175, 80, 0.5)"]}
          style={s.edgeBottom}
        />
        <LinearGradient
          colors={["rgba(76, 175, 80, 0.5)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.edgeLeft}
        />
        <LinearGradient
          colors={["transparent", "rgba(76, 175, 80, 0.5)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.edgeRight}
        />
      </Animated.View>

      <SafeAreaView style={s.safe}>
        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Top bar */}
        <View style={s.topBar}>
          <Pressable style={s.iconBtn} onPress={handleConcede}>
            <Text style={s.iconBtnText}>×</Text>
          </Pressable>
          <View style={s.roundCenter}>
            <Text style={s.roundLabel}>
              DISCARD {snapshot.you.discard_pile.length} · DECK{" "}
              {snapshot.you.remaining_cards.length}
            </Text>
            <Text style={s.turnText}>
              {myTurn ? "Your Turn" : "Opponent's Turn"}
            </Text>
          </View>
          <View
            style={[
              s.timerBox,
              questionActive && { borderColor: arc.primaryContainer + "88" },
            ]}
          >
            {displayedTimer != null ? (
              <>
                <Text
                  style={[
                    s.timerText,
                    displayedTimer <= 5 && { color: arc.primaryContainer },
                  ]}
                >
                  {displayedTimer}s
                </Text>
                {showPickTimer && <Text style={s.timerSubLabel}>PICK</Text>}
              </>
            ) : (
              <Text style={s.timerText}>—</Text>
            )}
          </View>
        </View>

        {/* Opponent panel */}
        <View style={s.opponentPanel}>
          <View style={s.opponentInner}>
            <View style={s.opponentAvatar}>
              <Text style={s.opponentAvatarText}>{oppNick[0]}</Text>
            </View>
            <View style={s.opponentInfo}>
              <View style={s.opponentNameRow}>
                <Text style={s.opponentName}>{oppNick}</Text>
                <Text style={s.opponentHpLabel}>{oppHp}/100</Text>
              </View>
              <View style={s.hpTrack}>
                <LinearGradient
                  colors={[
                    arc.primaryContainer,
                    arc.error ?? arc.primaryContainer,
                  ]}
                  style={[s.hpFill, { width: `${oppHp}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <View style={s.statusChips}>
                {(snapshot.opponent.status_public.ps ?? 0) > 0 && (
                  <View
                    style={[s.statusChip, { backgroundColor: "#C1FF0022" }]}
                  >
                    <Text style={[s.statusChipText, { color: "#C1FF00" }]}>
                      POISON ×{snapshot.opponent.status_public.ps}
                    </Text>
                  </View>
                )}
                {(snapshot.opponent.status_public.ba ?? 0) > 0 && (
                  <View
                    style={[s.statusChip, { backgroundColor: "#FFD40022" }]}
                  >
                    <Text style={[s.statusChipText, { color: "#FFD400" }]}>
                      BLIND ×{snapshot.opponent.status_public.ba}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Battlefield */}
        <View style={s.battlefield}>
          <Text style={s.noPlayText}>
            {questionActive
              ? "— ANSWER THE QUESTION —"
              : myTurn
                ? "— PLAY A CARD —"
                : "— WAITING —"}
          </Text>
        </View>

        {/* Player HP */}
        <View style={s.playerHpSection}>
          <View style={s.playerHpHeader}>
            <Text style={s.playerLabel}>You</Text>
            <Text
              style={[s.opponentHpLabel, { color: arc.secondaryContainer }]}
            >
              {myHp}/100
            </Text>
          </View>
          <View style={s.hpTrackPlayer}>
            <LinearGradient
              colors={[arc.secondaryContainer, arc.tertiary]}
              style={[s.hpFill, { width: `${myHp}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <View style={s.statusChips}>
            {(snapshot.you.status.ps ?? 0) > 0 && (
              <View style={[s.statusChip, { backgroundColor: "#C1FF0022" }]}>
                <Text style={[s.statusChipText, { color: "#C1FF00" }]}>
                  POISON ×{snapshot.you.status.ps}
                </Text>
              </View>
            )}
            {(snapshot.you.status.ba ?? 0) > 0 && (
              <View style={[s.statusChip, { backgroundColor: "#FFD40022" }]}>
                <Text style={[s.statusChipText, { color: "#FFD400" }]}>
                  BLIND ×{snapshot.you.status.ba}
                </Text>
              </View>
            )}
            {(snapshot.you.status.rw ?? 0) > 0 && (
              <View style={[s.statusChip, { backgroundColor: "#7e44c422" }]}>
                <Text style={[s.statusChipText, { color: "#7e44c4" }]}>
                  50/50 ×{snapshot.you.status.rw}
                </Text>
              </View>
            )}
            {(snapshot.you.status.et ?? 0) > 0 && (
              <View style={[s.statusChip, { backgroundColor: "#ff9d0022" }]}>
                <Text style={[s.statusChipText, { color: "#ff9d00" }]}>
                  +{snapshot.you.status.et}s NEXT
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Hand meta */}
        <View style={s.handMeta}>
          <Text style={s.handMetaLeft}>HAND · {hand.length}</Text>
          <Text style={s.handMetaRight}>
            DECK {snapshot.you.remaining_cards.length} · DISCARD{" "}
            {snapshot.you.discard_pile.length}
          </Text>
        </View>

        {/* Card hand */}
        <Animated.View
          style={[
            {
              transform: [
                {
                  translateX: shakeAnim.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-8, 0, 8],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.handScroll}
            style={s.handScrollView}
          >
            {hand.map((c, i) => {
              const ct = cardTypes[c.id] ?? "DMG";
              const handKey = `${c.id}-${i}`;
              return (
                <Pressable key={handKey} onPress={() => setSelectedSlotIdx(i)}>
                  <TypedCard
                    type={ct}
                    cat={c.cat}
                    width={62}
                    selected={i === validSelectedIdx}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Selected card detail */}
        <View
          style={[s.cardDetail, { borderColor: selectedMeta.color + "88" }]}
        >
          <View style={s.cardDetailMeta}>
            <View
              style={[
                s.cardTypeChip,
                { backgroundColor: selectedMeta.color + "22" },
              ]}
            >
              <Text style={[s.cardTypeChipText, { color: selectedMeta.color }]}>
                {selectedEntry ? selectedMeta.label : "—"}
              </Text>
            </View>
            <View style={s.spacer} />
          </View>
          <Pressable
            style={[
              s.playBtn,
              {
                backgroundColor:
                  myTurn && !questionActive && validSelectedIdx != null
                    ? arc.secondaryContainer
                    : arc.surfaceHigh,
                shadowColor: arc.secondaryContainer,
              },
            ]}
            onPress={handlePlayCard}
            disabled={!myTurn || questionActive || validSelectedIdx == null || busy}
          >
            <Text
              style={[
                s.playBtnText,
                { color: myTurn && !questionActive ? arc.bg : arc.outline },
              ]}
            >
              {myTurn && !questionActive
                ? "Play card ↗"
                : questionActive
                  ? "Answering..."
                  : "Wait for your turn"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <QuestionSheet
        visible={(questionActive && myTurn) || lastResult != null}
        onClose={() => {}}
        onSubmit={handleAnswer}
        card={{ type: playedType, cat: playedCat }}
        question={snapshot.current_question.title ?? ""}
        answers={snapshot.current_question.options ?? []}
        timerSec={timeLeft}
        durationSec={15}
        difficulty={snapshot.current_question.difficulty ?? 1}
        result={lastResult}
        blackoutIdx={snapshot.current_question.blackout_idx}
        disabledIdxs={snapshot.current_question.disabled_idxs}
      />

      <VictoryOverlay
        visible={isWin}
        onClose={() => navigateSummary("win")}
        onContinue={() => navigateSummary("win")}
        stats={{ cards: String(myAnswerCount) }}
      />
      <DefeatOverlay
        visible={isLoss}
        onClose={() => navigateSummary("loss")}
        onContinue={() => navigateSummary("loss")}
        stats={{ cards: String(myAnswerCount) }}
      />
      <VictoryOverlay
        visible={isDraw}
        onClose={() => navigateSummary("draw")}
        onContinue={() => navigateSummary("draw")}
        stats={{ cards: "—" }}
      />
    </View>
  );
}

export default function GameScreen() {
  const { matchId: rawMatchId } = useLocalSearchParams<{ matchId?: string }>();
  const id = Number(rawMatchId);
  if (!id) return <Redirect href="/" />;
  return (
    <MatchProvider matchId={id}>
      <GameInner />
    </MatchProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: arc.bg },
  glowTop: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  glowBottom: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 260,
    height: 260,
  },

  // Nowe style dla krawędzi (winiety)
  edgeTop: { position: "absolute", top: 0, left: 0, right: 0, height: 40 },
  edgeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  edgeLeft: { position: "absolute", top: 0, bottom: 0, left: 0, width: 40 },
  edgeRight: { position: "absolute", top: 0, bottom: 0, right: 0, width: 40 },

  safe: { flex: 1, paddingHorizontal: arcSpace.md },

  errorBanner: {
    backgroundColor: arc.primaryContainer + "22",
    borderWidth: 1,
    borderColor: arc.primaryContainer + "55",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  errorBannerText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    color: arc.primaryContainer,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  topBar: { height: 64, flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: {
    width: 44,
    height: 44,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 22,
    color: arc.ink,
    lineHeight: 26,
  },
  roundCenter: { flex: 1, alignItems: "center" },
  roundLabel: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 2,
  },
  turnText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    color: arc.ink,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  timerBox: {
    width: 56,
    height: 44,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.secondaryContainer + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 16,
    color: arc.secondaryContainer,
  },
  timerSubLabel: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 8,
    color: arc.outline,
    letterSpacing: 1,
  },

  opponentPanel: {
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    backgroundColor: arc.surface,
    padding: 14,
    marginBottom: arcSpace.sm,
  },
  opponentInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  opponentAvatar: {
    width: 48,
    height: 48,
    backgroundColor: arc.primaryContainer + "22",
    borderWidth: 1,
    borderColor: arc.primaryContainer + "66",
    alignItems: "center",
    justifyContent: "center",
  },
  opponentAvatarText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: arc.primaryContainer,
  },
  opponentInfo: { flex: 1 },
  opponentNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  opponentName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: arc.ink,
  },
  opponentHpLabel: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 14,
    color: arc.primaryContainer,
  },
  hpTrack: {
    height: 8,
    backgroundColor: arc.surfaceHigh,
    marginBottom: 4,
    overflow: "hidden",
  },
  hpTrackPlayer: {
    height: 10,
    backgroundColor: arc.surfaceHigh,
    overflow: "hidden",
  },
  hpFill: { height: "100%" },
  statusChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  statusChip: { paddingHorizontal: 6, paddingVertical: 2 },
  statusChipText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 9,
    letterSpacing: 0.5,
  },

  battlefield: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: arcSpace.sm,
  },
  noPlayText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 11,
    color: arc.outline,
    letterSpacing: 3,
  },

  playerHpSection: { marginBottom: arcSpace.sm },
  playerHpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  playerLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: arc.ink,
  },

  handMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: arcSpace.sm,
  },
  handMetaLeft: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 2,
  },
  handMetaRight: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 2,
  },
  handScrollView: { flexGrow: 0, marginBottom: arcSpace.sm },
  handScroll: { gap: 10 },

  cardDetail: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: arcSpace.sm,
  },
  cardDetailMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTypeChip: { paddingHorizontal: 8, paddingVertical: 4 },
  cardTypeChipText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 9,
    letterSpacing: 1,
  },
  spacer: { flex: 1 },
  playBtn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  playBtnText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
