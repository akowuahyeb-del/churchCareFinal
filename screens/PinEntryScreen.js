// screens/PinEntryScreen.js
//
// PIN login — reads hash from LOCAL AsyncStorage (no Firestore call).
// No Firebase auth session needed at entry time.
// Restores stored user snapshot to AsyncStorage on match.

import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hashPin } from "../utils/pinHash";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "back"],
];

export default function PinEntryScreen({ navigation }) {
  const [pin, setPin] = useState("");
  const [pinUser, setPinUser] = useState(null);
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("pinUser");
      if (!raw) {
        Alert.alert("No PIN Set", "Please sign in with your email first, then set up a PIN.");
        navigation.replace("Login");
        return;
      }
      setPinUser(JSON.parse(raw));
    })();
  }, []);

  const handleKey = (key) => {
    if (checking) return;
    if (key === "back") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length < 6) {
      const next = pin + key;
      setPin(next);
      if (next.length === 6) setTimeout(() => verifyPin(next), 150);
    }
  };

  const verifyPin = async (entered) => {
    if (!pinUser?.uid) return;
    setChecking(true);
    try {
      // ✅ Read hash from LOCAL storage — no Firestore needed
      const storedHash = await AsyncStorage.getItem("pinHash");
      if (!storedHash) {
        Alert.alert("No PIN Set", "Please sign in with email and set up a PIN.");
        navigation.replace("Login");
        return;
      }

      const enteredHash = await hashPin(entered);

      if (enteredHash === storedHash) {
        // ✅ Match — restore session from local snapshot
        const snapshotRaw = await AsyncStorage.getItem("pinUserSnapshot");
        if (snapshotRaw) {
          const userData = JSON.parse(snapshotRaw);
          await AsyncStorage.setItem("currentUser", JSON.stringify(userData));

          if (userData.organizationId && userData.entityId) {
            await AsyncStorage.setItem("activeEntity", JSON.stringify({
              organizationId: userData.organizationId,
              entityId: userData.entityId,
              name: userData.entityName || "Church",
            }));
          }
        }
        await AsyncStorage.setItem("isLoggedIn", "true");
        navigation.replace("MainTabs");
        return;
      }

      // ❌ Mismatch
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPin("");

      if (nextAttempts >= 3) {
        Alert.alert(
          "Too Many Attempts",
          "For your security, please sign in with your email.",
          [{ text: "OK", onPress: () => navigation.replace("Login") }]
        );
      } else {
        Alert.alert("Incorrect PIN", (3 - nextAttempts) + " attempt(s) remaining.");
      }
    } catch (e) {
      console.log("PIN VERIFY ERROR:", e);
      Alert.alert("Error", "Could not verify PIN. Please try email login.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
      <View style={styles.header}>
        <Ionicons name="key-outline" size={40} color="#fff" />
        <Text style={styles.headerTitle}>Enter your 6-digit PIN</Text>
        {pinUser?.email && (<Text style={styles.headerSub}>{pinUser.email}</Text>)}
      </View>
      <View style={styles.dotsRow}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      {checking && (
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
                    onPress={() => handleKey("back")} disabled={checking}>
                    <Ionicons name="backspace-outline" size={26} color="#4B3F72" />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={ki} style={styles.key}
                  onPress={() => handleKey(key)} disabled={checking}>
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <TouchableOpacity onPress={() => navigation.replace("Login")} style={styles.emailBtn}>
          <Text style={styles.emailText}>Use Email Instead</Text>
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
  emailBtn: { alignItems: "center", paddingVertical: 18, marginTop: 10 },
  emailText: { color: "#4B3F72", fontSize: 14, fontWeight: "700" },
});