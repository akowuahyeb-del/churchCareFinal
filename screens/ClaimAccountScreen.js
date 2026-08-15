// screens/ClaimAccountScreen.js
//
// Reached from a "I have a Member ID" link on the Login/Welcome screen.
// Two steps: (1) verify the Member ID + phone against an existing member
// record, (2) create a Firebase Auth account and link it to that record.
//
// No admin session needed — this is the self-service counterpart to
// InviteMemberScreen, for someone who got their code via WhatsApp, a
// printed QR code, or verbally from an admin.
//
// IMPORTANT: completeMemberClaim requires an authenticated request.auth
// server-side (it links the signed-in Firebase Auth uid to the member
// record). That means step "account" — creating Firebase Auth credentials
// — must ALWAYS run before completeMemberClaim is called, for both the
// self-service member flow and the existingUser/admin flow. existingUser
// only changes copy/messaging; it must never skip straight to claiming.

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { verifyMemberCode, completeMemberClaim } from "../utils/memberIntake";

export default function ClaimAccountScreen({navigation,route,}) {
  const existingUser =
  route?.params?.existingUser === true;

  console.log(
  "CLAIM ACCOUNT PARAMS",
  route?.params
);
  const [step, setStep] = useState("code"); 
  const [memberCode, setMemberCode] =
  useState(
    route?.params?.memberCode || ""
  );
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(null); // { claimToken, memberName, organizationId, entityId }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // ── QR scanning ──
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLock, setScanLock] = useState(false); // prevents double-fires while closing

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Camera permission needed", "Allow camera access to scan the QR code, or type the Member ID in manually.");
        return;
      }
    }
    setScanLock(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanLock) return;
    setScanLock(true);
    setScannerVisible(false);

    try {
      const parsed = JSON.parse(data);
      if (!parsed.memberCode) throw new Error("no memberCode in QR data");
      setMemberCode(parsed.memberCode);
    } catch (e) {
      // Not JSON, or missing memberCode — fall back to using the raw scanned
      // text directly, in case it's just a plain code printed on a card.
      setMemberCode(data);
    }
  };

  const handleVerify = async () => {
    if (!memberCode.trim() || !phone.trim()) {
      Alert.alert("Required", "Enter your Member ID and phone number");
      return;
    }
    setBusy(true);
    try {
      const result = await verifyMemberCode({ memberCode: memberCode.trim(), phone: phone.trim() });
      console.log(
  "VERIFY RESULT:",
  JSON.stringify(result, null, 2)
);

      if (!result.verified) {
        const messages = {
          not_found: "We couldn't find that Member ID. Double-check it and try again.",
          already_registered: "This Member ID is already linked to an account — try logging in instead.",
          phone_mismatch: "That phone number doesn't match our records for this Member ID.",
        };
        Alert.alert("Couldn't verify", messages[result.reason] || "Something didn't match. Please try again.");
        return;
      }

      setVerified(result);

if (existingUser) {

  const claimResult =
    await completeMemberClaim({
      claimToken: result.claimToken,
    });

 

console.log(
  "CLAIM RESULT",
  JSON.stringify(result, null, 2)
);

await AsyncStorage.setItem(
  "activeEntity",
  JSON.stringify({
    organizationId: result.organizationId,
    entityId: result.entityId,
    name: result.entityName || "Church",
  })
);

  Alert.alert(
    "Success",
    "Administrator identity claimed.",
    [
      {
        text: "Continue",
        onPress: () =>
          navigation.replace(
            "Onboarding"
          ),
      },
    ]
  );

  return;
}

setStep("account");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Required", "Enter a valid email and a password of at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // auth.currentUser is now set — completeMemberClaim reads request.auth server-side.
      const result = await completeMemberClaim({ claimToken: verified.claimToken });

      await AsyncStorage.setItem("isLoggedIn", "true");
      await AsyncStorage.setItem("activeEntity", JSON.stringify({
        organizationId: result.organizationId,
        entityId: result.entityId,
        name: result.entityName || "Church",
      }));

      Alert.alert(
        "Welcome!",
        existingUser
          ? "Administrator identity claimed. Your account is set up."
          : "Your account is set up.",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.replace(
                existingUser ? "Onboarding" : "MainTabs"
              ),
          },
        ]
      );
    } catch (e) {
      console.log("CLAIM ACCOUNT ERROR:", e);
      Alert.alert("Couldn't create account", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
        <View style={styles.header}>
          <Ionicons name="id-card-outline" size={36} color="#fff" />
          <Text style={styles.headerTitle}>
            {step === "code" ? "Enter your Member ID" : "Create your account"}
          </Text>
          <Text style={styles.headerSub}>
            {step === "code"
              ? "Your church admin sent this to you, or you can scan the QR they shared."
              : `Almost done, ${verified?.memberName?.split(" ")[0] || "there"}!`}
          </Text>
        </View>

        <View style={styles.body}>
          {step === "code" ? (
            <>
              <Text style={styles.label}>Member ID</Text>
              <View style={styles.codeRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={memberCode}
                  onChangeText={setMemberCode}
                  placeholder="e.g. CH-LOC-123-45"
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
                  <Ionicons name="qr-code-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="The number your church has on file"
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={handleVerify} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
              />
              <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={handleCreateAccount} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep("code")} style={{ alignItems: "center", padding: 10 }}>
                <Text style={{ color: "#888" }}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* ══ QR SCANNER MODAL ══ */}
      <Modal visible={scannerVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setScannerVisible(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Member QR Code</Text>
            <View style={{ width: 26 }} />
          </View>
          {scannerVisible && (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          )}
          <View style={styles.scannerFrame} pointerEvents="none">
            <View style={styles.scannerBox} />
          </View>
          <Text style={styles.scannerHint}>Point your camera at the QR code your admin shared</Text>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  header: { alignItems: "center", paddingTop: 30, paddingBottom: 24, paddingHorizontal: 24 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff", marginTop: 10, textAlign: "center" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 6, textAlign: "center" },
  body: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 24 },
  label: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12, fontSize: 14, color: "#222", borderWidth: 1.5, borderColor: "#eee" },
  btn: { backgroundColor: "#4B3F72", borderRadius: 12, padding: 15, alignItems: "center", marginTop: 20 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  codeRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  scanBtn: { backgroundColor: "#4B3F72", borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  scannerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  scannerTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scannerFrame: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  scannerBox: { width: 240, height: 240, borderRadius: 16, borderWidth: 3, borderColor: "rgba(255,255,255,0.8)" },
  scannerHint: { color: "#fff", textAlign: "center", fontSize: 12, padding: 16, opacity: 0.8 },
});