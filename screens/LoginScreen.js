import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native";

import { Feather, AntDesign } from "@expo/vector-icons";

export default function LoginScreen({ navigation }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>

      {/* ✅ HEADER TEXT */}
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>
        Sign in to continue
      </Text>

      {/* ✅ EMAIL FIELD */}
      <TextInput
        placeholder="Email / Phone"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#999"
      />

      {/* ✅ PASSWORD FIELD WITH TOGGLE */}
      <View style={styles.passwordBox}>

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
        >
          <Feather
            name={showPassword ? "eye" : "eye-off"}
            size={18}
            color="#555"
          />
        </TouchableOpacity>

      </View>

      {/* ✅ LOGIN BUTTON */}
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => navigation.replace("Home")}
      >
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* ✅ DIVIDER */}
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.line} />
      </View>

      {/* ✅ GOOGLE BUTTON */}
      <TouchableOpacity style={styles.socialBtn}>
        <AntDesign name="google" size={18} color="#DB4437" />
        <Text style={styles.socialText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* ✅ PHONE BUTTON */}
      <TouchableOpacity style={styles.socialBtn}>
        <Feather name="phone" size={18} color="#4B3F72" />
        <Text style={styles.socialText}>Continue with Phone</Text>
      </TouchableOpacity>

      {/* ✅ FOOTER */}
      <View style={styles.footer}>
        <Text style={{ color: "#555" }}>Don't have an account? </Text>
        <Text style={styles.register}>Register</Text>
      </View>

    </View>
  );
}

/* ✅ STYLES */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f7f8fb"
  },

  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 5,
    color: "#222"
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginBottom: 20
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },

  /* ✅ PASSWORD FIELD */
  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 10,
    marginBottom: 12
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12
  },

  /* ✅ LOGIN BUTTON (MATCH DASHBOARD PURPLE) */
  loginBtn: {
    backgroundColor: "#4B3F72",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5
  },

  loginText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },

  /* ✅ DIVIDER */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd"
  },

  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: "#888"
  },

  /* ✅ SOCIAL BUTTONS */
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },

  socialText: {
    marginLeft: 12,
    fontSize: 13,
    color: "#333"
  },

  /* ✅ FOOTER */
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10
  },

  register: {
    color: "#4B3F72",
    fontWeight: "600"
  }

});