// screens/PendingScreen.js
//
// Shown to a church admin after submitting registration.
// Real-time listens to organizations/{id}.status — the moment the developer
// approves (status → "active"), navigates the user to OnboardingScreen.
// No refresh, no logout/login required.

import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { CommonActions } from "@react-navigation/native";

export default function PendingScreen({ route, navigation }) {
  const org = route?.params?.org || {};
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [status, setStatus] = useState("pending");

  // ✅ Pulse animation on the hourglass
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ✅ Real-time watcher — reacts the moment the developer flips the status
  useEffect(() => {
    if (!org.id) return;

    const unsub = onSnapshot(
      doc(db, "organizations", org.id),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setStatus(data.status);

        if (data.status === "active") {
          // Navigate to Onboarding, passing the org info
          navigation.replace("Onboarding", {
            org: { id: org.id, name: data.name || org.name },
          });
        } else if (data.status === "rejected") {
          Alert.alert(
            "Registration Not Approved",
            data.rejectionReason
              ? `Reason: ${data.rejectionReason}`
              : "Your church registration was not approved. Please contact support for more information.",
            [{ text: "OK", onPress: () => handleSignOut() }]
          );
        }
      },
      (error) => {
        console.log("Pending watcher error:", error);
      }
    );

    return () => unsub();
  }, [org.id]);

  const handleSignOut = async () => {
    try {
      await AsyncStorage.multiRemove([
        "isLoggedIn", "currentUser", "activeEntity", "role"
      ]);
      await signOut(auth);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (e) {
      console.log("Sign out error:", e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="hourglass-outline" size={48} color="#4B3F72" />
        </Animated.View>

        <Text style={styles.title}>Awaiting Approval</Text>
        {org.name && <Text style={styles.churchName}>{org.name}</Text>}
        <Text style={styles.body}>
          Your church registration has been submitted and is being reviewed by the ChurchCare team.
          This usually takes 24–48 hours.
        </Text>

        <View style={styles.stepsList}>
          <Step done label="Account created" />
          <Step done label="Church registered" />
          <Step active label="Developer review in progress" />
          <Step label="Approval notification" />
          <Step label="Complete onboarding" />
          <Step label="Access dashboard" />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#4B3F72" />
          <Text style={styles.infoText}>
            This page updates automatically — no need to refresh or log out.
            You'll be taken to onboarding the moment your church is approved.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step({ label, done, active }) {
  return (
    <View style={styles.stepRow}>
      <View style={[
        styles.stepDot,
        done && styles.stepDotDone,
        active && styles.stepDotActive
      ]}>
        {done
          ? <Ionicons name="checkmark" size={11} color="#fff" />
          : active
            ? <View style={styles.stepDotInner} />
            : null}
      </View>
      <Text style={[styles.stepLabel, done && { color: "#27ae60" }, active && { color: "#4B3F72", fontWeight: "700" }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb", justifyContent: "space-between", padding: 24 },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "900", color: "#222", marginBottom: 6 },
  churchName: { fontSize: 14, fontWeight: "700", color: "#4B3F72", marginBottom: 14 },
  body: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20, marginBottom: 24, maxWidth: 300 },
  stepsList: { alignSelf: "stretch", backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 12, marginBottom: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#eee", alignItems: "center", justifyContent: "center" },
  stepDotDone: { backgroundColor: "#27ae60" },
  stepDotActive: { backgroundColor: "#4B3F72" },
  stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  stepLabel: { fontSize: 13, color: "#aaa", fontWeight: "600" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 12, padding: 12, maxWidth: 340 },
  infoText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },
  signOutBtn: { alignItems: "center", padding: 14 },
  signOutText: { color: "#aaa", fontSize: 13, fontWeight: "600" },
});