import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function StatusBadge({ label, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "20" }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  text: {
    fontSize: 10,
    fontWeight: "700",
  },
});