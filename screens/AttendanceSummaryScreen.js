import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

export default function AttendanceSummaryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Attendance Summary
      </Text>

      <Text style={styles.subtitle}>
        Coming Soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6fb",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4B3F72",
  },

  subtitle: {
    marginTop: 10,
    color: "#888",
  },
});
