import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";

export default function Section({ title, children }) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },

  title: {
  fontSize: 17,
  fontWeight: "800",
  color: "#222",
  marginBottom: 10,
  paddingHorizontal: 14,
},
});