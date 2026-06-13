import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AppHeader({
  title,
  subtitle,
  onBack,
  actions = []
}) {
  return (
    <View style={styles.container}>

      {/* ✅ SAFE TOP SPACE */}
      <View style={styles.topSafeSpace} />

      {/* ✅ HEADER ROW */}
      <View style={styles.header}>

        {/* ✅ BACK BUTTON */}
        {onBack && (
          <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* ✅ TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {/* ✅ RIGHT ACTIONS */}
        <View style={styles.actions}>
          {Array.isArray(actions) &&
            actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.iconBtn,
                  action.type === "primary" && styles.primaryBtn
                ]}
                onPress={action.onPress}
              >
                {action.icon && (
                  <Ionicons name={action.icon} size={16} color="#fff" />
                )}

                {action.label && (
                  <Text style={styles.actionText}>{action.label}</Text>
                )}
              </TouchableOpacity>
            ))}
        </View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#4B3F72",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },

  topSafeSpace: {
    height: Platform.OS === "android" ? 25 : 0,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },

  titleContainer: {
    flex: 1,
    marginLeft: 8,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },

  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconBtn: {
    height: 40,
    minWidth: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },

  primaryBtn: {
    backgroundColor: "#1BA97F",
  },

  actionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
