import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

export type CharacterType = "waiter" | "cook" | "customer";

interface Props {
  type: CharacterType;
  moving?: boolean;
  working?: boolean;
  carrying?: boolean;
  waving?: boolean;
  outfitColor?: string;
  skinColor?: string;
  hairColor?: string;
  size?: number;
}

const BASE = 1;
const HEAD_R = 5 * BASE;
const BODY_W = 14 * BASE;
const BODY_H = 10 * BASE;
const ARM_W = 5 * BASE;
const ARM_H = 8 * BASE;
const LEG_W = 5 * BASE;
const LEG_H = 8 * BASE;
const HAT_W = 10 * BASE;
const HAT_H = 6 * BASE;

const OUTFIT_COLORS: Record<CharacterType, string> = {
  waiter: "#1a1a2e",
  cook: "#e8e8e8",
  customer: "#3a6ea5",
};

const HAIR_COLORS = ["#2c1810", "#8b4513", "#f4c542", "#1a1a1a", "#c0392b"];

export default function CharacterSprite({
  type,
  moving = false,
  working = false,
  carrying = false,
  waving = false,
  outfitColor,
  skinColor = "#f4c090",
  hairColor,
  size = 1,
}: Props) {
  const outfit = outfitColor ?? OUTFIT_COLORS[type];
  const hair = hairColor ?? HAIR_COLORS[0];

  const leftLeg = useRef(new Animated.Value(0)).current;
  const rightLeg = useRef(new Animated.Value(0)).current;
  const leftArm = useRef(new Animated.Value(0)).current;
  const rightArm = useRef(new Animated.Value(0)).current;
  const bodyBob = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const carryTilt = useRef(new Animated.Value(0)).current;

  const walkRef = useRef<Animated.CompositeAnimation | null>(null);
  const workRef = useRef<Animated.CompositeAnimation | null>(null);
  const idleRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (walkRef.current) { walkRef.current.stop(); walkRef.current = null; }
    if (workRef.current) { workRef.current.stop(); workRef.current = null; }
    if (idleRef.current) { idleRef.current.stop(); idleRef.current = null; }

    if (moving) {
      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(leftLeg, { toValue: 4, duration: 170, useNativeDriver: true }),
            Animated.timing(leftLeg, { toValue: -4, duration: 170, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(rightLeg, { toValue: -4, duration: 170, useNativeDriver: true }),
            Animated.timing(rightLeg, { toValue: 4, duration: 170, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(leftArm, { toValue: -5, duration: 170, useNativeDriver: true }),
            Animated.timing(leftArm, { toValue: 5, duration: 170, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(rightArm, { toValue: 5, duration: 170, useNativeDriver: true }),
            Animated.timing(rightArm, { toValue: -5, duration: 170, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(bodyBob, { toValue: -1.5, duration: 170, useNativeDriver: true }),
            Animated.timing(bodyBob, { toValue: 1.5, duration: 170, useNativeDriver: true }),
          ]),
        ])
      );
      walkRef.current = loop;
      loop.start();
    } else if (waving) {
      leftArm.setValue(0);
      rightLeg.setValue(0);
      leftLeg.setValue(0);
      bodyBob.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(rightArm, { toValue: -12, duration: 300, useNativeDriver: true }),
          Animated.timing(rightArm, { toValue: -4, duration: 300, useNativeDriver: true }),
        ])
      );
      workRef.current = loop;
      loop.start();
    } else if (carrying) {
      leftArm.setValue(-8);
      rightArm.setValue(-8);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bodyBob, { toValue: -1, duration: 400, useNativeDriver: true }),
          Animated.timing(bodyBob, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      idleRef.current = loop;
      loop.start();
    } else if (working) {
      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(leftArm, { toValue: -9, duration: 220, useNativeDriver: true }),
            Animated.timing(leftArm, { toValue: 6, duration: 220, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(rightArm, { toValue: 6, duration: 220, useNativeDriver: true }),
            Animated.timing(rightArm, { toValue: -9, duration: 220, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(bodyBob, { toValue: -2, duration: 220, useNativeDriver: true }),
            Animated.timing(bodyBob, { toValue: 2, duration: 220, useNativeDriver: true }),
          ]),
        ])
      );
      workRef.current = loop;
      loop.start();
    } else {
      leftLeg.setValue(0);
      rightLeg.setValue(0);
      leftArm.setValue(0);
      rightArm.setValue(0);
      bodyBob.setValue(0);
      carryTilt.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      idleRef.current = loop;
      loop.start();
    }

    return () => {
      if (walkRef.current) walkRef.current.stop();
      if (workRef.current) workRef.current.stop();
      if (idleRef.current) idleRef.current.stop();
    };
  }, [moving, working, carrying, waving]);

  const s = size;

  return (
    <Animated.View
      style={[
        styles.root,
        {
          width: 28 * s,
          height: 38 * s,
          transform: [{ scale: breathe }, { translateY: bodyBob }],
        },
      ]}
    >
      {/* Shadow */}
      <View
        style={[
          styles.shadow,
          { width: 22 * s, height: 5 * s, bottom: -2 * s, borderRadius: 10 * s },
        ]}
      />

      {/* Hat / Hair */}
      {type === "cook" ? (
        <View
          style={[
            styles.chefHat,
            {
              width: HAT_W * s,
              height: HAT_H * s,
              borderRadius: 3 * s,
              top: 0,
              left: (28 * s - HAT_W * s) / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.hair,
            {
              width: (HEAD_R * 2 + 2) * s,
              height: (HEAD_R + 2) * s,
              borderRadius: HEAD_R * s,
              backgroundColor: hair,
              top: (6 - HEAD_R) * s,
              left: (14 * s - (HEAD_R + 1) * s),
            },
          ]}
        />
      )}

      {/* Head */}
      <View
        style={[
          styles.head,
          {
            width: HEAD_R * 2 * s,
            height: HEAD_R * 2 * s,
            borderRadius: HEAD_R * s,
            backgroundColor: skinColor,
            top: (type === "cook" ? HAT_H : HEAD_R) * s - 2,
            left: (14 * s - HEAD_R * s),
          },
        ]}
      >
        {/* Eyes */}
        <View style={[styles.eyeRow, { marginTop: 3 * s }]}>
          <View style={[styles.eye, { width: 2 * s, height: 2 * s, borderRadius: s, marginHorizontal: 1.5 * s }]} />
          <View style={[styles.eye, { width: 2 * s, height: 2 * s, borderRadius: s, marginHorizontal: 1.5 * s }]} />
        </View>
      </View>

      {/* Left Arm */}
      <Animated.View
        style={[
          styles.arm,
          {
            width: ARM_W * s,
            height: ARM_H * s,
            borderRadius: 3 * s,
            backgroundColor: type === "cook" ? "#cccccc" : outfit,
            top: (type === "cook" ? HAT_H + HEAD_R * 2 : HEAD_R * 2 + HEAD_R + 1) * s,
            left: (14 * s - BODY_W * s / 2 - ARM_W * s),
            transform: [{ translateY: leftArm }],
          },
        ]}
      />

      {/* Right Arm */}
      <Animated.View
        style={[
          styles.arm,
          {
            width: ARM_W * s,
            height: ARM_H * s,
            borderRadius: 3 * s,
            backgroundColor: type === "cook" ? "#cccccc" : outfit,
            top: (type === "cook" ? HAT_H + HEAD_R * 2 : HEAD_R * 2 + HEAD_R + 1) * s,
            left: (14 * s + BODY_W * s / 2),
            transform: [{ translateY: rightArm }],
          },
        ]}
      />

      {/* Body */}
      <View
        style={[
          styles.body,
          {
            width: BODY_W * s,
            height: BODY_H * s,
            borderRadius: 5 * s,
            backgroundColor: outfit,
            top: (type === "cook" ? HAT_H + HEAD_R * 2 : HEAD_R * 2 + HEAD_R + 1) * s,
            left: (14 * s - BODY_W * s / 2),
          },
        ]}
      >
        {/* Outfit detail */}
        {type === "waiter" && (
          <View
            style={[
              styles.bowTie,
              { width: 5 * s, height: 3 * s, borderRadius: 1 * s, top: 2 * s },
            ]}
          />
        )}
        {type === "cook" && (
          <>
            <View style={[styles.button, { width: 2 * s, height: 2 * s, borderRadius: s, top: 2 * s }]} />
            <View style={[styles.button, { width: 2 * s, height: 2 * s, borderRadius: s, top: 5 * s }]} />
          </>
        )}
      </View>

      {/* Carry tray */}
      {carrying && (
        <View
          style={[
            styles.tray,
            {
              width: 10 * s,
              height: 3 * s,
              borderRadius: 2 * s,
              top: (type === "cook" ? HAT_H + HEAD_R * 2 : HEAD_R * 2 + HEAD_R + 1) * s - 3 * s,
              left: (14 * s - 5 * s),
            },
          ]}
        />
      )}

      {/* Left Leg */}
      <Animated.View
        style={[
          styles.leg,
          {
            width: LEG_W * s,
            height: LEG_H * s,
            borderRadius: 3 * s,
            backgroundColor: type === "cook" ? "#444" : outfit,
            top: (type === "cook" ? HAT_H + HEAD_R * 2 + BODY_H : HEAD_R * 2 + HEAD_R + 1 + BODY_H) * s,
            left: (14 * s - 7 * s),
            transform: [{ translateX: leftLeg }],
          },
        ]}
      >
        {/* Shoe */}
        <View
          style={[
            styles.shoe,
            {
              width: LEG_W * s + 1,
              height: 3 * s,
              borderRadius: 2 * s,
              bottom: 0,
            },
          ]}
        />
      </Animated.View>

      {/* Right Leg */}
      <Animated.View
        style={[
          styles.leg,
          {
            width: LEG_W * s,
            height: LEG_H * s,
            borderRadius: 3 * s,
            backgroundColor: type === "cook" ? "#444" : outfit,
            top: (type === "cook" ? HAT_H + HEAD_R * 2 + BODY_H : HEAD_R * 2 + HEAD_R + 1 + BODY_H) * s,
            left: (14 * s + 2 * s),
            transform: [{ translateX: rightLeg }],
          },
        ]}
      >
        <View
          style={[
            styles.shoe,
            {
              width: LEG_W * s + 1,
              height: 3 * s,
              borderRadius: 2 * s,
              bottom: 0,
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
  },
  shadow: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  chefHat: {
    position: "absolute",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  hair: {
    position: "absolute",
  },
  head: {
    position: "absolute",
    alignItems: "center",
  },
  eyeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eye: {
    backgroundColor: "#1a1a1a",
  },
  arm: {
    position: "absolute",
  },
  body: {
    position: "absolute",
    alignItems: "center",
  },
  bowTie: {
    position: "absolute",
    backgroundColor: "#c0392b",
    alignSelf: "center",
  },
  button: {
    position: "absolute",
    backgroundColor: "#aaa",
    alignSelf: "center",
  },
  tray: {
    position: "absolute",
    backgroundColor: "#c8a84b",
    borderWidth: 1,
    borderColor: "#a07828",
  },
  leg: {
    position: "absolute",
    overflow: "hidden",
  },
  shoe: {
    position: "absolute",
    backgroundColor: "#1a1a1a",
  },
});
