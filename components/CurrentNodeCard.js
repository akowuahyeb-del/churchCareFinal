import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CurrentNodeCard({
  nodeName = "Prince of Peace Congregation",
  nodeLevel = "Congregation",
  reportsTo = "Not Configured",
  status = "Active",
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="location-outline"
          size={22}
          color="#0984E3"
        />

        <Text style={styles.title}>
          Current Position
        </Text>
      </View>

      <Text style={styles.nodeName}>
        {nodeName}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Level</Text>
        <Text style={styles.value}>{nodeLevel}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Reports To</Text>
        <Text style={styles.value}>{reportsTo}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {status}
          </Text>
        </View>
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

  nodeName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingVertical: 8,
  },

  label: {
    fontSize: 13,
    color: "#777",
  },

  value: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },

  statusPill: {
    backgroundColor: "#E8F8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  statusText: {
    color: "#27AE60",
    fontSize: 11,
    fontWeight: "800",
  },
});