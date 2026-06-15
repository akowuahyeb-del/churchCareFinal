import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ChurchDashboardScreen({ navigation, route }) {

  const churchId = route?.params?.churchId;

  return (
    <View style={styles.container}>

      <Text style={styles.title}>🏛️ Church Dashboard</Text>

      {/* ✅ MEMBERS */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Members", { churchId })}
      >
        <Ionicons name="people-outline" size={20} color="#4B3F72" />
        <Text style={styles.text}>Members</Text>
      </TouchableOpacity>

      {/* ✅ EVENTS */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Events")}
      >
        <Ionicons name="calendar-outline" size={20} color="#4B3F72" />
        <Text style={styles.text}>Events</Text>
      </TouchableOpacity>

      {/* ✅ ATTENDANCE */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Attendance")}
      >
        <Ionicons name="checkmark-done-outline" size={20} color="#4B3F72" />
        <Text style={styles.text}>Attendance</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f6fb",
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    color: "#222",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  text: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },
});