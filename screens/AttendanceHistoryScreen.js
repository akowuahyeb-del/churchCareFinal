import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";

export default function AttendanceHistoryScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance History"
        subtitle="Session attendance records"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <Text style={styles.title}>
          Attendance History
        </Text>

        <Text style={styles.subtitle}>
          Session records will be displayed here.
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

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4B3F72",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#888",
  },
});