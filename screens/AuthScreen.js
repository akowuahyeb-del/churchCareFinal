// screens/AuthScreen.js
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | register | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearError = () => setError("");

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setLoading(true); clearError();
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // ✅ AppNavigator takes over from here — no manual navigation needed
    } catch (e) {
      setError(friendlyAuthError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true); clearError();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // ✅ Store the user profile — AppNavigator reads this to know the
      // user exists but hasn't submitted a church yet (NO_ORG state)
      await setDoc(doc(db, "users", cred.user.uid), {
        fullName: fullName.trim(),
        email: email.trim(),
        uid: cred.user.uid,
        createdAt: new Date().toISOString(),
      });

      // AppNavigator's onAuthStateChanged fires here → routes to RegisterChurch
    } catch (e) {
      setError(friendlyAuthError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) { setError("Enter your email address."); return; }
    setLoading(true); clearError();
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Email Sent", "Check your inbox for a password reset link.");
      setMode("login");
    } catch (e) {
      setError(friendlyAuthError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="heart" size={32} color="#fff" />
        </View>
        <Text style={styles.appName}>ChurchCare</Text>
        <Text style={styles.appTagline}>Serving your congregation, intelligently.</Text>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Reset Password"}
        </Text>

        {/* REGISTER ONLY */}
        {mode === "register" && (
          <>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
              placeholder="Your full name" autoCapitalize="words" />
          </>
        )}

        {/* EMAIL */}
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail}
          placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" />

        {/* PASSWORD */}
        {mode !== "reset" && (
          <>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password} onChangeText={setPassword}
                placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#aaa" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* CONFIRM PASSWORD */}
        {mode === "register" && (
          <>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword}
              placeholder="Repeat password" secureTextEntry={!showPassword} />
          </>
        )}

        {/* ERROR */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={14} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* PRIMARY ACTION */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          onPress={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleReset}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>
                {mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Email"}
              </Text>}
        </TouchableOpacity>

        {/* MODE SWITCHERS */}
        {mode === "login" && (
          <>
            <TouchableOpacity onPress={() => { setMode("register"); clearError(); }}>
              <Text style={styles.switchText}>New to ChurchCare? <Text style={styles.switchLink}>Create an account</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMode("reset"); clearError(); }}>
              <Text style={[styles.switchText, { marginTop: 6 }]}>
                <Text style={styles.switchLink}>Forgot password?</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {mode !== "login" && (
          <TouchableOpacity onPress={() => { setMode("login"); clearError(); }}>
            <Text style={styles.switchText}>
              <Text style={styles.switchLink}>← Back to sign in</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const friendlyAuthError = (code) => {
  switch (code) {
    case "auth/email-already-in-use":   return "An account with this email already exists.";
    case "auth/invalid-email":          return "Please enter a valid email address.";
    case "auth/wrong-password":
    case "auth/invalid-credential":     return "Incorrect email or password.";
    case "auth/user-not-found":         return "No account found with this email.";
    case "auth/weak-password":          return "Password must be at least 6 characters.";
    case "auth/too-many-requests":      return "Too many attempts. Try again later.";
    case "auth/network-request-failed": return "Network error. Check your connection.";
    default:                            return "Something went wrong. Please try again.";
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4B3F72" },
  header: { alignItems: "center", paddingTop: 80, paddingBottom: 30 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: "900", color: "#fff" },
  appTagline: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  card: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: "800", color: "#222", marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "700", color: "#777", marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: "#f4f6fb", borderRadius: 10, padding: 13, fontSize: 14, marginBottom: 4, borderWidth: 1, borderColor: "#eee" },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 10 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fce8e8", borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 6 },
  errorText: { flex: 1, fontSize: 12, color: "#e74c3c", fontWeight: "600" },
  primaryBtn: { backgroundColor: "#4B3F72", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 16, marginBottom: 12 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  switchText: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 4 },
  switchLink: { color: "#4B3F72", fontWeight: "700" },
});