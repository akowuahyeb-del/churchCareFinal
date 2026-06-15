import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SectionHeader({ title }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },

  text: {
    fontSize: 15,
    fontWeight: "800",   
    color: "#222",
  },
});