import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: W, height: H } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {

  // ✅ Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(20)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const dotAnim = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {

    // ✅ ANIMATION SEQUENCE
    Animated.sequence([
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.spring(ringScale1, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(ringOpacity1, { toValue: 0.15, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(ringScale2, { toValue: 1.35, tension: 40, friction: 10, useNativeDriver: true }),
        Animated.timing(ringOpacity2, { toValue: 0.08, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(barWidth, { toValue: W * 0.5, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]).start();

    // ✅ DOT ANIMATION LOOP
    const pulseDots = () => {
      Animated.stagger(
        150,
        dotAnim.map(dot =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        )
      ).start(() => pulseDots());
    };

    const dotTimer = setTimeout(pulseDots, 1400);

    // ✅ ✅ AUTO LOGIN CHECK AFTER SPLASH
    const navTimer = setTimeout(async () => {
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");

      if (isLoggedIn === "true") {
        navigation.replace("MainTabs");   // ✅ go straight to app
      } else {
        navigation.replace("Login");      // ✅ go to login
      }

    }, 3400); // sync with animation duration

    return () => {
      clearTimeout(navTimer);
      clearTimeout(dotTimer);
    };

  }, []);

  return (
    <View style={styles.container}>

      {/* Background shapes */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Rings */}
      <Animated.View style={[styles.ring, styles.ring2, {
        transform: [{ scale: ringScale2 }],
        opacity: ringOpacity2,
      }]} />

      <Animated.View style={[styles.ring, styles.ring1, {
        transform: [{ scale: ringScale1 }],
        opacity: ringOpacity1,
      }]} />

      {/* Glow */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoCircle, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <View style={styles.logoInnerRing} />
        <Ionicons name="church-outline" size={52} color="#fff" />
      </Animated.View>

      {/* Title */}
      <Animated.View style={{
        opacity: textOpacity,
        transform: [{ translateY: textY }],
        alignItems: "center",
        marginTop: 28
      }}>
        <Text style={styles.appName}>ChurchCare</Text>
        <View style={styles.nameUnderline} />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        Connecting the Body of Christ
      </Animated.Text>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {dotAnim.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, {
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
            transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }]} />
        ))}
      </View>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>

    </View>
  );
}

const LOGO_SIZE = 110;
const RING1_SIZE = 170;
const RING2_SIZE = 230;
const GLOW_SIZE = 140;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2E2657",
    alignItems: "center",
    justifyContent: "center",
  },

  bgCircle1: {
    position: "absolute",
    width: W * 1.1,
    height: W * 1.1,
    borderRadius: W,
    backgroundColor: "#4B3F72",
    top: -W * 0.4,
    opacity: 0.5,
  },

  bgCircle2: {
    position: "absolute",
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W,
    backgroundColor: "#6C5CE7",
    bottom: -W * 0.25,
    right: -W * 0.2,
    opacity: 0.18,
  },

  bgCircle3: {
    position: "absolute",
    width: W * 0.5,
    height: W * 0.5,
    borderRadius: W,
    backgroundColor: "#1BA97F",
    bottom: H * 0.08,
    left: -W * 0.12,
    opacity: 0.12,
  },

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

  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "#6C5CE7",
  },

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

  appName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.5,
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
    marginTop: 10,
  },

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

  version: {
    position: "absolute",
    bottom: 36,
    fontSize: 11,
    color: "rgba(255,255,255,0.30)",
  },
});
