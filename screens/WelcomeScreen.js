import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>Welcome to ChurchCare</Text>

      <Text style={styles.subtitle}>
        Manage your church, members, and events all in one place.
      </Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.replace("CompleteProfile")}
      >
        <Text style={styles.btnText}>Get Started</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#f4f6fb"
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
    textAlign: "center"
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30
  },

  btn: {
    backgroundColor: "#4B3F72",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10
  },

  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15
  }
});