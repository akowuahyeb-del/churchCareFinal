

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── Each action maps to the EXACT screen name in App.js ──────────
const ACTIONS = [
  { id: "Attendance",      label: "Attendance", icon: "checkmark-circle-outline" },
  { id: "Members",         label: "Members",    icon: "people-outline"            },
  { id: "AdminDashboard",  label: "Reports",    icon: "bar-chart-outline"         },
  { id: "Donate",          label: "Donate",     icon: "heart-outline"             },
  { id: "Help",            label: "Help",       icon: "help-circle-outline"       },
];

export default function QuickActions({ navigation, churchName, onSwitchChurch }) {
  return (
    <View style={styles.section}>

      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Quick Actions</Text>

        {/* Church switcher inline */}
        <TouchableOpacity style={styles.switchBtn} onPress={onSwitchChurch}>
          <Ionicons name="swap-horizontal-outline" size={13} color="#4B3F72" />
          <Text style={styles.switchText} numberOfLines={1}>{churchName || "Select Branch"}</Text>
          <Ionicons name="chevron-down" size={12} color="#4B3F72" />
        </TouchableOpacity>
      </View>

      {/* Action circles */}
      <View style={styles.row}>
        {ACTIONS.map(action => (
          <TouchableOpacity
            key={action.id}
            style={styles.item}
            activeOpacity={0.75}
            onPress={() => {
  if (action.id === "Members") {
    navigation.navigate("Members");
  } else if (action.id === "Attendance") {
    navigation.navigate("Attendance");
  } else if (action.id === "AdminDashboard") {
    navigation.navigate("AdminDashboard");
  } else if (action.id === "Donate") {
    navigation.navigate("DonateScreen");
  } else if (action.id === "Help") {
    navigation.navigate("Help");
  }
}}
          >
            <View style={styles.circle}>
              <Ionicons name={action.icon} size={24} color="#fff" />
            </View>
            <Text style={styles.label} numberOfLines={1}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 14,
    marginTop: 16,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF0FA",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
    maxWidth: 170,
    borderWidth: 1,
    borderColor: "#dde1f5",
  },
  switchText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B3F72",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    flex: 1,
    alignItems: "center",
  },
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#3C3A4E",   // dark grey — matches reference image
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    marginTop: 6,
    textAlign: "center",
  },
});
