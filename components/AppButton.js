import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function AppButton({
  title,
  onPress,
  type = "primary"
}) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        type === "primary" && styles.primary,
        type === "secondary" && styles.secondary,
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.text,
        type === "secondary" && styles.secondaryText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  primary: {
    backgroundColor: "#4B3F72",
  },

  secondary: {
    backgroundColor: "#eee",
  },

  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  secondaryText: {
    color: "#333",
  },
});