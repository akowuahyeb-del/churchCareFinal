import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated
} from "react-native";

import { Feather, AntDesign } from "@expo/vector-icons";

export default function LoginScreen({ navigation }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* ✅ SIMPLE FADE-IN ANIMATION */
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

      {/* ✅ TITLE */}
      <Text style={styles.title}>Login</Text>

      {/* ✅ INPUTS */}
      <TextInput
        placeholder="Email or Phone"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      {/* ✅ PASSWORD WITH TOGGLE */}
      <View style={styles.passwordBox}>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
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
      <TouchableOpacity style={styles.socialBtn} onPress={() => {
        console.log("Google login clicked");
        // ✅ Placeholder for Firebase Google login
      }}>
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
        <Text>Don't have an account? </Text>
        <Text style={styles.register}>Register</Text>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f4f6f8"
  },

  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center"
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd"
  },

  /* ✅ PASSWORD FIELD */
  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 10,
    marginBottom: 10
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12
  },

  /* ✅ LOGIN BUTTON */
  loginBtn: {
    backgroundColor: "#5B3CC4",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10
  },

  loginText: {
    color: "#fff",
    fontWeight: "600"
  },

  /* ✅ DIVIDER */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd"
  },

  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: "#777"
  },

  /* ✅ SOCIAL BUTTON */
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd"
  },

  socialText: {
    marginLeft: 10,
    fontWeight: "500",
    color: "#333"
  },

  /* ✅ FOOTER */
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10
  },

  register: {
    color: "#5B3CC4",
    fontWeight: "600"
  }

});
``