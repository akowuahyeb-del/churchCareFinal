// screens/LoginScreen.js
//
// Routing based on org state — no CompleteProfile in the flow:
//   - No org yet         → CreateChurch
//   - Org pending        → PendingScreen
//   - Org rejected       → alert
//   - Org active, no onboarding → OnboardingScreen
//   - Org active, done   → MainTabs

import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AppButton from "../components/AppButton";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  const routeUser = async (uid, userData) => {
    // ✅ Super admins bypass all org/onboarding gates
    if (userData?.role === "super_admin") {
      // If they have an org linked, cache it so other screens can read it
      if (userData?.organizationId && userData?.entityId) {
        await AsyncStorage.setItem("activeEntity", JSON.stringify({
          organizationId: userData.organizationId,
          entityId: userData.entityId,
          name: userData.entityName || "Church",
        }));
      }
      navigation.replace("MainTabs");
      return;
    }

    // No church submitted yet
    if (!userData?.organizationId || !userData?.entityId) {
      navigation.replace("CreateChurch");
      return;
    }

    // Fetch org
    const orgSnap = await getDoc(doc(db, "organizations", userData.organizationId));
    const orgData = orgSnap.exists() ? orgSnap.data() : null;
    const orgStatus = orgData?.status || "pending";

    // Save active entity
    await AsyncStorage.setItem("activeEntity", JSON.stringify({
      organizationId: userData.organizationId,
      entityId: userData.entityId,
      name: userData.entityName || orgData?.name || "Church",
    }));

    // Pending
    if (orgStatus === "pending") {
      navigation.replace("Pending", {
        org: { id: userData.organizationId, name: userData.entityName || orgData?.name },
      });
      return;
    }

    // Rejected
    if (orgStatus === "rejected") {
      Alert.alert(
        "Registration Not Approved",
        orgData?.rejectionReason
          ? `Reason: ${orgData.rejectionReason}`
          : "Your church registration was not approved. Please contact support."
      );
      return;
    }

    // Active — check onboarding completion
    const onboardingSnap = await getDoc(
      doc(db, "organizations", userData.organizationId, "onboarding", uid)
    );
    const onboardingDone = onboardingSnap.exists() && onboardingSnap.data().completed === true;

    if (!onboardingDone) {
      navigation.replace("Onboarding", {
        org: { id: userData.organizationId, name: userData.entityName || orgData?.name },
      });
      return;
    }

    // Fully active — offer PIN setup if not done, then Home
    const localPinEnabled = await AsyncStorage.getItem("pinEnabled");
    if (localPinEnabled !== "true") {
      Alert.alert(
        "Set up a PIN?",
        "Sign in faster next time with a 6-digit PIN.",
        [
          { text: "Not now", style: "cancel", onPress: () => navigation.replace("MainTabs") },
          { text: "Set PIN", onPress: () => navigation.replace("PinSetup") },
        ]
      );
      return;
    }
    navigation.replace("MainTabs");
  };

  // ─── Auto-redirect on app open if session already valid ───
  useEffect(() => {
    const checkLogin = async () => {
      const pinFlag = await AsyncStorage.getItem("pinEnabled");
      const isLoggedInFlag = await AsyncStorage.getItem("isLoggedIn");
      setPinEnabled(pinFlag === "true" && isLoggedInFlag === "true");

      const storedUser = await AsyncStorage.getItem("currentUser");
      if (!storedUser || isLoggedInFlag !== "true") {
        console.log("No stored session - staying on Login");
        return;
      }
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.log("No Firebase user - staying on Login");
        return;
      }

      // Re-fetch fresh user data (approval may have happened between sessions)
      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const fresh = snap.exists() ? { ...snap.data(), uid: firebaseUser.uid } : JSON.parse(storedUser);
        await AsyncStorage.setItem("currentUser", JSON.stringify(fresh));
        await routeUser(firebaseUser.uid, fresh);
      } catch (e) {
        console.log("useEffect route error:", e);
      }
    };
    checkLogin();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email and password");
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const uid = firebaseUser.uid;
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      let userData;

      if (!userSnap.exists()) {
        userData = {
          uid,
          email: firebaseUser.email,
          role: "admin",
          organizationId: "",
          entityId: "",
          entityName: "",
          name: "",
          phone: "",
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, userData);
      } else {
        userData = { ...userSnap.data(), uid };
      }

      await AsyncStorage.setItem("isLoggedIn", "true");
      await AsyncStorage.setItem("currentUser", JSON.stringify(userData));

      await routeUser(uid, userData);
    } catch (error) {
      console.log("LOGIN ERROR:", error);
      Alert.alert("Login Failed", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f7f8fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#555" />
          </TouchableOpacity>
        </View>

        <AppButton label="Login" onPress={handleLogin} fullWidth />

        {pinEnabled && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.line} />
            </View>
            <TouchableOpacity style={styles.pinBtn} onPress={() => navigation.navigate("PinEntry")}>
              <Ionicons name="keypad-outline" size={18} color="#fff" />
              <Text style={styles.pinBtnText}>Sign in with 6-digit PIN</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.register}>New Church? Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, padding: 20, paddingTop: 60, paddingBottom: 40,
    justifyContent: "center", backgroundColor: "#f7f8fb",
  },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 5, color: "#222" },
  subtitle: { fontSize: 13, color: "#777", marginBottom: 20 },
  input: {
    backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 12,
    borderWidth: 1, borderColor: "#e0e0e0", color: "#222",
  },
  passwordBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 10, borderWidth: 1, borderColor: "#e0e0e0",
    paddingHorizontal: 10, marginBottom: 12,
  },
  passwordInput: { flex: 1, paddingVertical: 12, color: "#222" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: "#ddd" },
  dividerText: { marginHorizontal: 8, fontSize: 12, color: "#888" },
  pinBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#4B3F72", padding: 14, borderRadius: 12, marginBottom: 10,
  },
  pinBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  label: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 4, marginTop: 10 },
  footer: { marginTop: 30, alignItems: "center" },
  register: { color: "#4B3F72", fontWeight: "700", fontSize: 14 },
});