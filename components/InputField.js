import React from "react";
import { View, TextInput, StyleSheet } from "react-native";

export default function InputField(props) {
  return (
    <View style={styles.inputBox}>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#aaa"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  input: {
    fontSize: 14,
    paddingVertical: 12,
    color: "#222",
  },
});