import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MoreScreen({ navigation }) {
  const options = [
  { title: "Settings", icon: "settings", screen: "Settings" },
  { title: "Departments", icon: "people", screen: "Departments" },
  { title: "Events", icon: "calendar", screen: "Events" },
  { title: "Finance", icon: "card", screen: "Finance" },
  { title: "Transfers", icon: "git-branch", screen: "AdminTransfers" },
  { title: "Help & Support", icon: "help-circle", screen: "HelpSupport" },
];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>More</Text>

      {options.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.row}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Ionicons name={item.icon} size={20} color="#4B3F72" />
          <Text style={styles.text}>{item.title}</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4B3F72",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
});