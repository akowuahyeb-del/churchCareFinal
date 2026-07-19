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
  statusBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 20,
  backgroundColor: "#e8f8f0",
  flexShrink: 0,           
},
statusText: {
  fontSize: 11,
  fontWeight: "700",
  color: "#27ae60",
  flexShrink: 1,           
},
});