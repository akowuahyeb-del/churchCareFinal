import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native";

export default function LoginScreen({ navigation }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>

      {/* ✅ TITLE */}
      <Text style={styles.title}>Welcome Back</Text>

      <Text style={styles.subtitle}>
        Sign in to continue
      </Text>

      {/* ✅ INPUTS */}
      <TextInput
        placeholder="Email or Phone"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#888"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        placeholderTextColor="#888"
      />

      {/* ✅ LOGIN BUTTON */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.replace("Home")}
      >
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>

    </View>
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
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 5
  },

  subtitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd"
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10
  },

  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  }

});
