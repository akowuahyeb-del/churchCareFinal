import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function ActionButton({
  title,
  onPress,
  variant = "primary" // primary | outline | ghost
}) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === "outline" && styles.outline,
        variant === "ghost" && styles.ghost
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          variant === "outline" && styles.outlineText,
          variant === "ghost" && styles.ghostText
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#4B3F72",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
  },

  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#4B3F72",
  },

  outlineText: {
    color: "#4B3F72",
  },

  ghost: {
    backgroundColor: "transparent",
  },

  ghostText: {
    color: "#4B3F72",
  },
});