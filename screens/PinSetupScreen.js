// screens/PinSetupScreen.js
//
// Lets a just-logged-in user create a 6-digit PIN for quick unlock on this
// device. Two steps: choose PIN, then confirm it. On success:
//   - Saves the hash + a small user pointer + full snapshot to AsyncStorage
//     (this is what PinEntryScreen reads on future launches)
//   - Sets "pinEnabled" so LoginScreen shows the "Sign in with PIN" button
//   - Mirrors pinHash onto the user's Firestore doc so LoginScreen's
//     "does this account already have a PIN" check stays correct even if
//     the app is reinstalled (note: this makes the hash technically
//     readable by anyone with Firestore access to that doc — fine for a
//     lock-screen-style PIN, but don't reuse this pattern for real auth).

import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { hashPin } from "../utils/pinHash";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "back"],
];

export default function PinSetupScreen({
  navigation,
  route,
}) {
  const [stage, setStage] = useState("create"); // "create" | "confirm"
  const [firstPin, setFirstPin] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const mode =
  route?.params?.mode || "app";

  const handleKey = (key) => {
    if (saving) return;
    if (key === "back") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length < 6) {
      const next = pin + key;
      setPin(next);
      if (next.length === 6) setTimeout(() => handleComplete(next), 150);
    }
  };

  const handleComplete = async (entered) => {
    if (stage === "create") {
      setFirstPin(entered);
      setPin("");
      setStage("confirm");
      return;
    }
    // stage === "confirm"
    if (entered !== firstPin) {
      Alert.alert("PINs didn't match", "Let's try again.");
      setFirstPin("");
      setPin("");
      setStage("create");
      return;
    }
    await savePin(entered);
  };

  const savePin = async (finalPin) => {
    setSaving(true);
    try {
      const storedUser = await AsyncStorage.getItem("currentUser");
      if (!storedUser) {
        Alert.alert("Error", "Couldn't find your account. Please log in again.");
        navigation.replace("Login");
        return;
      }
      const userData = JSON.parse(storedUser);
      const pinHash = await hashPin(finalPin);

      await AsyncStorage.setItem("pinHash", pinHash);
      await AsyncStorage.setItem("pinUser", JSON.stringify({
        uid: userData.uid,
        email: userData.email,
      }));
      await AsyncStorage.setItem("pinUserSnapshot", JSON.stringify(userData));
      await AsyncStorage.setItem("pinEnabled", "true");

     if (userData.uid) {

  const updates =
    mode === "attendance"
      ? {
          attendancePinHash:
            pinHash,
          attendancePinEnabled:
            true,
        }
      : {
          pinHash,
        };

  await setDoc(
    doc(db, "users", userData.uid),
    updates,
    { merge: true }
  );
}

      navigation.replace("MainTabs");
    } catch (e) {
      console.log("PIN SETUP ERROR:", e);
      Alert.alert("Error", "Could not save your PIN. Please try again.");
      setFirstPin("");
      setPin("");
      setStage("create");
    } finally {
      setSaving(false);
    }
  };

  const skip = () => navigation.replace("MainTabs");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
      <View style={styles.header}>
        <Ionicons name="key-outline" size={40} color="#fff" />
       <Text style={styles.headerTitle}>
  {stage === "create"
    ? (
        mode === "attendance"
          ? "Create Attendance PIN"
          : "Choose a 6-digit PIN"
      )
    : "Confirm your PIN"}
</Text>
        <Text style={styles.headerSub}>
  {stage === "create"
    ? (
        mode === "attendance"
          ? "Required before joining or ending attendance sessions."
          : "You'll use this to sign in quickly next time."
      )
    : "Enter it once more to confirm."}
</Text>

      </View>
      <View style={styles.dotsRow}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      {saving && (
        <View style={{ alignItems: "center", marginBottom: 10 }}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
      <View style={styles.keypad}>
        {KEYPAD.map((row, ri) => (
          <View key={ri} style={styles.keypadRow}>
            {row.map((key, ki) => {
              if (key === "") return <View key={ki} style={styles.key} />;
              if (key === "back") {
                return (
                  <TouchableOpacity key={ki} style={styles.key}
                    onPress={() => handleKey("back")} disabled={saving}>
                    <Ionicons name="backspace-outline" size={26} color="#4B3F72" />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={ki} style={styles.key}
                  onPress={() => handleKey(key)} disabled={saving}>
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <TouchableOpacity onPress={skip} style={styles.skipBtn} disabled={saving}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  header: { alignItems: "center", paddingTop: 40, paddingBottom: 30, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", marginTop: 12, textAlign: "center" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6, textAlign: "center" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginVertical: 30 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#fff" },
  dotFilled: { backgroundColor: "#fff" },
  keypad: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, flex: 1 },
  keypadRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 6 },
  key: { width: 76, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f6fb" },
  keyText: { fontSize: 26, fontWeight: "700", color: "#222" },
  skipBtn: { alignItems: "center", paddingVertical: 18, marginTop: 10 },
  skipText: { color: "#4B3F72", fontSize: 14, fontWeight: "700" },
});