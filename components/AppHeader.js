import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppHeader({
  title,
  subtitle,
  onBack,
  actions = [],
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      
      {/* ✅ SAFE AREA TOP (ONLY SOURCE OF TRUTH) */}
      <View style={{ height: insets.top, backgroundColor: "#4B3F72" }} />


      {/* ✅ HEADER CONTENT */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {actions.length > 0 && (
          <View style={styles.actionsRow}>
            {actions.map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionBtn} onPress={a.onPress}>
                <Ionicons name={a.icon} size={18} color="#fff" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#4B3F72",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  backBtnSpacer: {
    width: 38,
    height: 38,
    marginRight: 12,
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },

  actionsRow: {
    flexDirection: "row",
  },

  actionBtn: {
    marginLeft: 8,
  },
});