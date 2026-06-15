import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function OnboardingScreen({ navigation, route }) {

  const { churchId, churchName, adminName } = route?.params || {};

  return (
    <View style={styles.container}>

      <Text style={styles.title}>🎉 Welcome {adminName}</Text>

      <Text style={styles.subtitle}>
        {churchName} has been created successfully!
      </Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          navigation.replace("ChurchDashboard", {
            churchId
          });
        }}
      >
        <Text style={styles.btnText}>Continue to Dashboard</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f4f6fb"
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center"
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#555"
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 10,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "700"
  }
});
