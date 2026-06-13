import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function StatCard({ label, value, color = "#4B3F72" }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
  },

  value: {
    fontSize: 20,
    fontWeight: "900",
  },

  label: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
});
