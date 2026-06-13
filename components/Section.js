import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Section({ title, children }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },

  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "#555",
    marginBottom: 8,
    paddingHorizontal: 14,
  },
});