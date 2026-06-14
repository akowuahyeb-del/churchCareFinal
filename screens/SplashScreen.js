import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: W, height: H } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {

  // Animation values
  const logoScale    = useRef(new Animated.Value(0)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const ringScale1   = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2   = useRef(new Animated.Value(0)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(20)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const barWidth     = useRef(new Animated.Value(0)).current;
  const glowOpacity  = useRef(new Animated.Value(0)).current;
  const dotAnim      = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Pulse rings expand outward
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.spring(ringScale1, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(ringOpacity1, { toValue: 0.15, duration: 500, useNativeDriver: true }),
      ]),
      // 2. Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(ringScale2, { toValue: 1.35, tension: 40, friction: 10, useNativeDriver: true }),
        Animated.timing(ringOpacity2, { toValue: 0.08, duration: 700, useNativeDriver: true }),
      ]),
      // 3. Title slides up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      // 4. Tagline fades in
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // 5. Progress bar fills
      Animated.timing(barWidth, { toValue: W * 0.5, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]).start();

    // Dot pulse loop
    const pulseDots = () => {
      Animated.stagger(150,
        dotAnim.map(dot =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        )
      ).start(() => pulseDots());
    };
    const dotTimer = setTimeout(pulseDots, 1400);

    // Navigate after splash
    const navTimer = setTimeout(() => {
      navigation.replace("Login");
    }, 3400);

    return () => { clearTimeout(navTimer); clearTimeout(dotTimer); };
  }, []);

  return (
    <View style={styles.container}>

      {/* Background gradient circles (decorative) */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Outer pulse ring 2 */}
      <Animated.View style={[styles.ring, styles.ring2, {
        transform: [{ scale: ringScale2 }],
        opacity: ringOpacity2,
      }]} />

      {/* Outer pulse ring 1 */}
      <Animated.View style={[styles.ring, styles.ring1, {
        transform: [{ scale: ringScale1 }],
        opacity: ringOpacity1,
      }]} />

      {/* Glow behind logo */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      {/* Logo circle */}
      <Animated.View style={[styles.logoCircle, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        {/* Inner accent ring */}
        <View style={styles.logoInnerRing} />
        <Ionicons name="church-outline" size={52} color="#fff" />
      </Animated.View>

      {/* App name */}
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }], alignItems: "center", marginTop: 28 }}>
        <Text style={styles.appName}>ChurchCare</Text>

        {/* Name underline accent */}
        <View style={styles.nameUnderline} />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        Connecting the Body of Christ
      </Animated.Text>

      {/* Loading bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      {/* Animated dots */}
      <View style={styles.dotsRow}>
        {dotAnim.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, {
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
            transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }]} />
        ))}
      </View>

      {/* Version tag at bottom */}
      <Text style={styles.version}>Version 1.0.0</Text>

    </View>
  );
}

const LOGO_SIZE  = 110;
const RING1_SIZE = 170;
const RING2_SIZE = 230;
const GLOW_SIZE  = 140;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2E2657",       // deep purple base
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Decorative background bubbles ──
  bgCircle1: {
    position: "absolute",
    width: W * 1.1,
    height: W * 1.1,
    borderRadius: W * 0.55,
    backgroundColor: "#4B3F72",
    top: -W * 0.4,
    left: -W * 0.05,
    opacity: 0.5,
  },
  bgCircle2: {
    position: "absolute",
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
    backgroundColor: "#6C5CE7",
    bottom: -W * 0.25,
    right: -W * 0.2,
    opacity: 0.18,
  },
  bgCircle3: {
    position: "absolute",
    width: W * 0.5,
    height: W * 0.5,
    borderRadius: W * 0.25,
    backgroundColor: "#1BA97F",
    bottom: H * 0.08,
    left: -W * 0.12,
    opacity: 0.12,
  },

  // ── Rings ──
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  ring1: {
    width: RING1_SIZE,
    height: RING1_SIZE,
  },
  ring2: {
    width: RING2_SIZE,
    height: RING2_SIZE,
  },

  // ── Glow ──
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "#6C5CE7",
  },

  // ── Logo ──
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInnerRing: {
    position: "absolute",
    width: LOGO_SIZE - 16,
    height: LOGO_SIZE - 16,
    borderRadius: (LOGO_SIZE - 16) / 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  // ── Text ──
  appName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  nameUnderline: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#1BA97F",
    marginTop: 8,
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.60)",
    letterSpacing: 0.8,
    marginTop: 10,
    fontWeight: "500",
  },

  // ── Loading bar ──
  barTrack: {
    width: W * 0.5,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    marginTop: 44,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    backgroundColor: "#1BA97F",
    borderRadius: 2,
  },

  // ── Dots ──
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1BA97F",
  },

  // ── Version ──
  version: {
    position: "absolute",
    bottom: 36,
    fontSize: 11,
    color: "rgba(255,255,255,0.30)",
    letterSpacing: 0.5,
  },
})