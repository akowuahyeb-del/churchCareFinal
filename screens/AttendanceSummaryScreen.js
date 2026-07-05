// screens/AttendanceSummaryScreen.js

import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";

export default function AttendanceSummaryScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance Summary"
        subtitle="Attendance intelligence & trends"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.body}>
        <Text style={styles.title}>
          Attendance Summary
        </Text>

        <Text style={styles.subtitle}>
          Coming Soon
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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