import TimeIcon from "@/assets/icons/time.svg";
import type { CardType } from "@/lib/match-api";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  cardType: CardType | null;
  trigger: number;
};

export function CardFireOverlay({ cardType, trigger }: Props) {
  if (!trigger || !cardType) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
      {cardType === "DMG" && <DamageShockwave key={trigger} />}
      {cardType === "HEAL" && <HealPlusRain key={trigger} />}
      {cardType === "POISON" && <PoisonBubbles key={trigger} />}
      {cardType === "DMG_BLOCK" && <HideFog key={trigger} />}
      {cardType === "HEAL_REMOVE" && <FiftyFiftySplit key={trigger} />}
      {cardType === "TIME_BUFF" && <TimeHourglass key={trigger} />}
    </View>
  );
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ---------- TIME ----------

function TimeHourglass() {
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.delay(620),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.delay(440),
        Animated.timing(scale, {
          toValue: 0.6,
          duration: 240,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.center} pointerEvents="none">
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }, { rotate: spin }],
          shadowColor: "#ff9d00",
          shadowOpacity: 0.9,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
          elevation: 12,
        }}
      >
        <TimeIcon width={140} height={140} />
      </Animated.View>
    </View>
  );
}

// ---------- HEAL ----------

const HEAL_COUNT = 10;

function HealPlusRain() {
  const items = useMemo(
    () =>
      Array.from({ length: HEAL_COUNT }, (_, i) => ({
        i,
        x: 24 + Math.random() * (SCREEN_W - 48),
        startY: SCREEN_H * 0.6 + Math.random() * (SCREEN_H * 0.3),
        size: 22 + Math.random() * 18,
        delay: i * 60,
        sway: (Math.random() * 2 - 1) * 26,
      })),
    []
  );

  return (
    <>
      {items.map((it) => (
        <RisingGlyph
          key={it.i}
          glyph="+"
          x={it.x}
          startY={it.startY}
          size={it.size}
          delay={it.delay}
          sway={it.sway}
          color="#42EADD"
          riseDistance={220}
          duration={780}
        />
      ))}
    </>
  );
}

function RisingGlyph({
  glyph,
  x,
  startY,
  size,
  delay,
  sway,
  color,
  riseDistance,
  duration,
}: {
  glyph: string;
  x: number;
  startY: number;
  size: number;
  delay: number;
  sway: number;
  color: string;
  riseDistance: number;
  duration: number;
}) {
  const ty = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(ty, {
          toValue: -riseDistance,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tx, {
          toValue: sway,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.delay(duration - 360),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [delay, duration, opacity, riseDistance, sway, tx, ty]);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: x,
        top: startY,
        fontSize: size,
        fontWeight: "900",
        color,
        opacity,
        textShadowColor: color,
        textShadowRadius: 12,
        textShadowOffset: { width: 0, height: 0 },
        transform: [{ translateY: ty }, { translateX: tx }],
      }}
    >
      {glyph}
    </Animated.Text>
  );
}

// ---------- POISON ----------

const POISON_COUNT = 7;

function PoisonBubbles() {
  const items = useMemo(
    () =>
      Array.from({ length: POISON_COUNT }, (_, i) => ({
        i,
        x: 24 + Math.random() * (SCREEN_W - 48),
        startY: SCREEN_H * 0.55 + Math.random() * (SCREEN_H * 0.35),
        size: 28 + Math.random() * 24,
        delay: i * 80,
        sway: (Math.random() * 2 - 1) * 30,
        useSkull: i % 2 === 0,
      })),
    []
  );

  return (
    <>
      {items.map((it) => (
        <PoisonBubble key={it.i} {...it} />
      ))}
    </>
  );
}

function PoisonBubble({
  x,
  startY,
  size,
  delay,
  sway,
  useSkull,
}: {
  x: number;
  startY: number;
  size: number;
  delay: number;
  sway: number;
  useSkull: boolean;
}) {
  const ty = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(ty, {
          toValue: -240,
          duration: 880,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tx, {
          toValue: sway,
          duration: 880,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.delay(440),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0.8,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
      ]),
    ]).start();
  }, [delay, opacity, pulse, sway, tx, ty]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: "#C1FF00",
        backgroundColor: "rgba(193,255,0,0.18)",
        opacity,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#C1FF00",
        shadowOpacity: 0.9,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
        transform: [{ translateY: ty }, { translateX: tx }, { scale: pulse }],
      }}
    >
      <Text
        style={{
          color: "#C1FF00",
          fontSize: size * 0.55,
          fontWeight: "900",
          textShadowColor: "#C1FF00",
          textShadowRadius: 8,
        }}
      >
        {useSkull ? "☠" : "●"}
      </Text>
    </Animated.View>
  );
}

// ---------- HIDE ----------

const HIDE_QUESTIONS = 5;

function HideFog() {
  const fogOpacity = useRef(new Animated.Value(0)).current;
  const items = useMemo(
    () =>
      Array.from({ length: HIDE_QUESTIONS }, (_, i) => ({
        i,
        x: 28 + Math.random() * (SCREEN_W - 56),
        y: SCREEN_H * 0.3 + Math.random() * (SCREEN_H * 0.4),
        size: 36 + Math.random() * 24,
        delay: 160 + i * 90,
        jitter: (Math.random() * 2 - 1) * 18,
      })),
    []
  );

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fogOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.delay(520),
      Animated.timing(fogOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fogOpacity]);

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: fogOpacity }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(66,234,221,0.18)",
            "rgba(255,212,0,0.22)",
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
      {items.map((it) => (
        <HideQuestion key={it.i} {...it} />
      ))}
    </>
  );
}

function HideQuestion({
  x,
  y,
  size,
  delay,
  jitter,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  jitter: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(380),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(tx, {
          toValue: jitter,
          duration: 720,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: -jitter * 0.6,
          duration: 720,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [delay, jitter, opacity, tx, ty]);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontSize: size,
        fontWeight: "900",
        color: "#42EADD",
        opacity,
        textShadowColor: "#42EADD",
        textShadowRadius: 14,
        textShadowOffset: { width: 0, height: 0 },
        transform: [{ translateX: tx }, { translateY: ty }],
      }}
    >
      ?
    </Animated.Text>
  );
}

// ---------- DAMAGE ----------

function DamageShockwave() {
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shardOpacity = useRef(new Animated.Value(0)).current;
  const shardScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(flashOpacity, {
          toValue: 0.5,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(shardOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(shardScale, {
            toValue: 1,
            duration: 480,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shardOpacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [flashOpacity, ringOpacity, ringScale, shardOpacity, shardScale]);

  const ringMax = Math.max(SCREEN_W, SCREEN_H) * 1.1;
  const shards = [0, 45, 90, 135];

  return (
    <View style={styles.center} pointerEvents="none">
      {/* Shockwave ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: ringMax,
          height: ringMax,
          borderRadius: ringMax / 2,
          borderWidth: 4,
          borderColor: "#FF2A7A",
          opacity: ringOpacity,
          shadowColor: "#FF2A7A",
          shadowOpacity: 1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
          transform: [{ scale: ringScale }],
        }}
      />
      {/* Inner ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: ringMax * 0.55,
          height: ringMax * 0.55,
          borderRadius: ringMax * 0.275,
          borderWidth: 2,
          borderColor: "#FF2A7A",
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      {/* Shards */}
      {shards.map((deg) => (
        <Animated.View
          key={deg}
          style={{
            position: "absolute",
            width: 4,
            height: SCREEN_W * 0.7,
            backgroundColor: "#FF2A7A",
            opacity: shardOpacity,
            shadowColor: "#FF2A7A",
            shadowOpacity: 1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
            transform: [{ rotate: `${deg}deg` }, { scaleY: shardScale }],
          }}
        />
      ))}
      {/* White flash */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#fff", opacity: flashOpacity },
        ]}
      />
    </View>
  );
}

// ---------- 50/50 ----------

function FiftyFiftySplit() {
  const diagOpacity = useRef(new Animated.Value(0)).current;
  const diagScale = useRef(new Animated.Value(0)).current;
  const splitOpacity = useRef(new Animated.Value(0)).current;
  const splitScale = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(diagOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(diagScale, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(diagOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(splitOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(splitScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(flashOpacity, {
            toValue: 0.45,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(flashOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.delay(160),
      Animated.timing(splitOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [diagOpacity, diagScale, flashOpacity, splitOpacity, splitScale]);

  const diagonalLength = Math.sqrt(SCREEN_W * SCREEN_W + SCREEN_H * SCREEN_H);
  const PURPLE = "#7e44c4";

  return (
    <View style={styles.center} pointerEvents="none">
      {/* Diagonal 1 (top-left → bottom-right) */}
      <Animated.View
        style={{
          position: "absolute",
          width: diagonalLength,
          height: 6,
          backgroundColor: PURPLE,
          opacity: diagOpacity,
          shadowColor: PURPLE,
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          transform: [
            { rotate: `${(Math.atan2(SCREEN_H, SCREEN_W) * 180) / Math.PI}deg` },
            { scaleX: diagScale },
          ],
        }}
      />
      {/* Diagonal 2 (top-right → bottom-left) */}
      <Animated.View
        style={{
          position: "absolute",
          width: diagonalLength,
          height: 6,
          backgroundColor: PURPLE,
          opacity: diagOpacity,
          shadowColor: PURPLE,
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          transform: [
            { rotate: `${(-Math.atan2(SCREEN_H, SCREEN_W) * 180) / Math.PI}deg` },
            { scaleX: diagScale },
          ],
        }}
      />
      {/* Vertical split line */}
      <Animated.View
        style={{
          position: "absolute",
          width: 8,
          height: SCREEN_H,
          backgroundColor: PURPLE,
          opacity: splitOpacity,
          shadowColor: PURPLE,
          shadowOpacity: 1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
          transform: [{ scaleY: splitScale }],
        }}
      />
      {/* Flash */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: PURPLE, opacity: flashOpacity },
        ]}
      />
    </View>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  overlay: {
    zIndex: 200,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
