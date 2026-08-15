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

  console.log("ROUTE 0 - routeUser start");
  console.log("ROUTE 0A - USER:", userData);

  // ✅ Super admins bypass all org/onboarding gates
  if (userData?.role === "super_admin") {

    console.log("ROUTE SA - Super Admin");

    if (userData?.organizationId && userData?.entityId) {
      console.log("ROUTE SA - Saving activeEntity");

      await AsyncStorage.setItem(
        "activeEntity",
        JSON.stringify({
          organizationId: userData.organizationId,
          entityId: userData.entityId,
          name: userData.entityName || "Church",
        })
      );
    }

    console.log("ROUTE SA - Navigating MainTabs");

    navigation.replace("MainTabs");
    return;
  }

  console.log("ROUTE 1 - Admin path");
  console.log("ROUTE 1A - ROLE:", userData?.role);
  console.log("ROUTE 1B - ORG:", userData?.organizationId);
  console.log("ROUTE 1C - ENTITY:", userData?.entityId);

  // No church submitted yet
  if (!userData?.organizationId || !userData?.entityId) {
    console.log("ROUTE 2 - No church, CreateChurch");

    navigation.replace("CreateChurch");
    return;
  }

  console.log("ROUTE 3 - Before org getDoc");

  const orgSnap = await getDoc(
    doc(
      db,
      "organizations",
      userData.organizationId
    )
  );

  console.log("ROUTE 4 - Org getDoc success");

  const orgData = orgSnap.exists()
    ? orgSnap.data()
    : null;

    const onboardingStatus =
  orgData?.onboardingStatus || null;

  console.log("ROUTE 4A - ORG DATA:", orgData);

  const orgStatus =
    orgData?.status || "pending";

  console.log("ROUTE 5 - ORG STATUS:", orgStatus);
  
console.log(
  "ROUTE 5A - ONBOARDING STATUS:",
  onboardingStatus
);


  await AsyncStorage.setItem(
    "activeEntity",
    JSON.stringify({
      organizationId: userData.organizationId,
      entityId: userData.entityId,
      name:
        userData.entityName ||
        orgData?.name ||
        "Church",
    })
  );

  console.log("ROUTE 6 - activeEntity saved");

  if (orgStatus === "pending") {

    console.log("ROUTE 7 - Pending screen");

    navigation.replace("Pending", {
      org: {
        id: userData.organizationId,
        name:
          userData.entityName ||
          orgData?.name,
      },
    });

    return;
  }

  if (orgStatus === "rejected") {

    console.log("ROUTE 8 - Rejected");

    Alert.alert(
      "Registration Not Approved",
      orgData?.rejectionReason
        ? `Reason: ${orgData.rejectionReason}`
        : "Your church registration was not approved."
    );

    return;
  }

// --------------------------------------------------
// Awaiting Administrator Claim
// --------------------------------------------------

if (
  onboardingStatus ===
  "awaiting_admin_claim"
) {

  console.log(
    "ROUTE 8A - Navigating ClaimAccount"
  );

console.log(
  "ADMIN CLAIM ROUTE",
  {
    adminMemberId:
      orgData.adminMemberId,

    adminMemberCode:
      orgData.adminMemberCode,
  }
);

  navigation.replace(
  "ClaimAccount",

  {
    existingUser: true,
    memberCode:
      orgData.adminMemberCode,
  }
);

  return;
}


  const onboardingSnap = await getDoc(
    doc(
      db,
      "organizations",
      userData.organizationId,
      "onboarding",
      uid
    )
  );

  console.log("ROUTE 10 - Onboarding getDoc success");

  const onboardingDone =
    onboardingSnap.exists() &&
    onboardingSnap.data().completed === true;

  console.log(
    "ROUTE 11 - Onboarding Done:",
    onboardingDone
  );

  if (!onboardingDone) {

    console.log("ROUTE 12 - Navigating Onboarding");

    navigation.replace("Onboarding", {
      org: {
        id: userData.organizationId,
        name:
          userData.entityName ||
          orgData?.name,
      },
    });

    return;
  }

  console.log("ROUTE 13 - Checking PIN");

  const localPinEnabled =
    await AsyncStorage.getItem("pinEnabled");

  console.log(
    "ROUTE 14 - PIN Enabled:",
    localPinEnabled
  );

 if (localPinEnabled !== "true") {

  // Web does not support the PIN workflow properly
  if (Platform.OS === "web") {
    navigation.replace("MainTabs");
    return;
  }

  Alert.alert(
    "Set up a PIN?",
    "Sign in faster next time with a 6-digit PIN.",
    [
      {
        text: "Not now",
        style: "cancel",
        onPress: () => navigation.replace("MainTabs"),
      },
      {
        text: "Set PIN",
        onPress: () => navigation.replace("PinSetup"),
      },
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

    console.log("STEP 1 - Before Firebase Login");

    const cred = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    console.log("STEP 2 - Firebase Auth Success");

    const firebaseUser = cred.user;
    const uid = firebaseUser.uid;

    console.log("STEP 3 - UID:", uid);

    const userRef = doc(db, "users", uid);

    console.log("STEP 4 - Before getDoc");

    const userSnap = await getDoc(userRef);

    console.log("STEP 5 - getDoc Success");

    let userData;

    if (!userSnap.exists()) {

      console.log("STEP 6 - User document missing, creating");

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

      console.log("STEP 7 - User document created");

    } else {

      console.log("STEP 6 - User document found");

      userData = {
        ...userSnap.data(),
        uid,
      };
    }

    console.log("STEP 8 - Saving session");

    await AsyncStorage.setItem(
      "isLoggedIn",
      "true"
    );

    await AsyncStorage.setItem(
      "currentUser",
      JSON.stringify(userData)
    );

    console.log("STEP 9 - Calling routeUser");

    await routeUser(uid, userData);

    console.log("STEP 10 - routeUser completed");

  } catch (error) {

    console.log("❌ LOGIN ERROR FULL:", error);
    console.log("❌ LOGIN ERROR CODE:", error.code);
    console.log("❌ LOGIN ERROR MESSAGE:", error.message);

    Alert.alert(
      "Login Failed",
      error.message
    );
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