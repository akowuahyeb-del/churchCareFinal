// screens/SignupScreen.js
//
// Signup flow for new church admins.
// After creating the Firebase user + profile doc, navigates to CreateChurch
// so the user immediately continues with church registration.

import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

// Password rule: min 8 chars, at least one letter and one number
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const validate = () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Info", "Please enter your full name.");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Missing Info", "Please enter your email.");
      return false;
    }
    if (!PASSWORD_RULE.test(password)) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters and include at least one letter and one number."
      );
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "The passwords you entered do not match.");
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = cred.user;
      const uid = firebaseUser.uid;

      // Create profile doc
      const userData = {
        uid,
        email: firebaseUser.email,
        name: fullName.trim(),
        role: "admin",           // registering a church → admin by default
        phone: "",
        organizationId: "",
        entityId: "",
        entityName: "",
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", uid), userData);

      // Save local session so subsequent screens work
      await AsyncStorage.setItem("isLoggedIn", "true");
      await AsyncStorage.setItem("currentUser", JSON.stringify(userData));

      // Continue to church registration
      navigation.replace("CreateChurch");
    } catch (e) {
      console.log("SIGNUP ERROR:", e);
      if (e.code === "auth/email-already-in-use") {
        Alert.alert(
          "Email Already Registered",
          "An account with this email already exists. Please sign in instead.",
          [{ text: "Go to Login", onPress: () => navigation.replace("Login") }]
        );
      } else if (e.code === "auth/invalid-email") {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
      } else {
        Alert.alert("Signup Failed", e.message || "Please try again.");
      }
    } finally {
      setSaving(false);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#4B3F72" />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Register your church and start managing members, ministries and events in minutes.
        </Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          placeholder="e.g. Bright Yeboah-Akowuah"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="you@church.org"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#555" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
          />
        </View>

        <Text style={styles.hint}>
          Password must be at least 8 characters and include a letter and a number.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={handleSignup}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Create Account & Continue</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.replace("Login")}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: "#f7f8fb",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
    color: "#222",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    marginBottom: 24,
    lineHeight: 19,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#222",
  },
  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: "#222",
  },
  hint: {
    fontSize: 11,
    color: "#888",
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 15,
  },
  primaryBtn: {
    backgroundColor: "#4B3F72",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#777",
  },
  footerLink: {
    color: "#4B3F72",
    fontWeight: "700",
  },
});