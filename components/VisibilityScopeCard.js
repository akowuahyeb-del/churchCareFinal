import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function VisibilityScopeCard({
  level = "Congregation",
  permissions = [
    "Members",
    "Attendance",
    "Finance",
    "Events",
  ],
  scopeDescription = "Only within this congregation",
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="eye-outline"
          size={22}
          color="#00B894"
        />

        <Text style={styles.title}>
          Visibility Scope
        </Text>
      </View>

      <Text style={styles.levelText}>
        Current Scope: {level}
      </Text>

      <View style={styles.permissionsContainer}>
        {permissions.map((item) => (
          <View
            key={item}
            style={styles.permissionRow}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#00B894"
            />

            <Text style={styles.permissionText}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.scopeBox}>
        <Text style={styles.scopeLabel}>
          Access Boundary
        </Text>

        <Text style={styles.scopeDescription}>
          {scopeDescription}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,

    marginHorizontal: 16,
    marginTop: 14,

    borderWidth: 1,
    borderColor: "#EFEFEF",

    elevation: 2,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },

  levelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },

  permissionsContainer: {
    marginBottom: 14,
  },

  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  permissionText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#444",
  },

  scopeBox: {
    backgroundColor: "#F5FFFB",
    borderRadius: 12,
    padding: 12,
  },

  scopeLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  scopeDescription: {
    fontSize: 13,
    color: "#222",
    lineHeight: 18,
  },
});