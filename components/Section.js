import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";

export default function Section({ title, children }) {
  return (
    <View style={styles.container}>
      <AppText
  variant="h4"
  style={styles.title}
>
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
  marginBottom: 10,
  paddingHorizontal: 14,
},
});