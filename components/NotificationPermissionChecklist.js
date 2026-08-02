// components/NotificationPermissionChecklist.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hasPermission } from "../constants/permissions";

const TYPES = [
  { key: "broadcast", label: "Church Broadcast", audience: "All members", check: (v) => v.isSuperAdmin || hasPermission(v, "manage_members") },
  { key: "individual", label: "Individual — General", audience: "One member", check: (v) => v.isSuperAdmin || hasPermission(v, "manage_members") },
  { key: "disciplinary", label: "Individual — Disciplinary", audience: "One member", check: (v) => v.isSuperAdmin || hasPermission(v, "elder_approval") },
  { key: "group", label: "Group", audience: "One ministry/group", check: (v) => v.isSuperAdmin || hasPermission(v, "manage_members") },
];

// viewer: { isSuperAdmin, permissions }
export default function NotificationPermissionChecklist({ viewer, selected, onSelect }) {
  return (
    <View>
      {TYPES.map(t => {
        const allowed = t.check(viewer);
        return (
          <View key={t.key} style={[styles.row, !allowed && styles.rowDisabled]}>
            <Ionicons name={allowed ? "checkmark-circle" : "close-circle-outline"} size={16} color={allowed ? "#27ae60" : "#ccc"} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.label, !allowed && styles.labelDisabled]}>{t.label}</Text>
              <Text style={styles.sub}>{t.audience}</Text>
            </View>
            {allowed && (
              <Text onPress={() => onSelect(t.key)} style={[styles.pick, selected === t.key && styles.pickActive]}>
                {selected === t.key ? "Selected" : "Select"}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginVertical: 3 },
  rowDisabled: { opacity: 0.5 },
  label: { fontSize: 13, fontWeight: "700", color: "#222" },
  labelDisabled: { color: "#999" },
  sub: { fontSize: 11, color: "#888", marginTop: 1 },
  pick: { fontSize: 11, color: "#4B3F72", fontWeight: "700" },
  pickActive: { color: "#27ae60" },
});