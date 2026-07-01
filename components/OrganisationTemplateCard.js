import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function OrganisationTemplateCard({
  templateName = "Presbyterian Structure",
  description = "Assembly → Presbytery → District → Congregation",
  status = "Active",
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="layers-outline"
          size={22}
          color="#6C5CE7"
        />

        <Text style={styles.title}>
          Organisation Template
        </Text>
      </View>

      <Text style={styles.templateName}>
        {templateName}
      </Text>

      <Text style={styles.description}>
        {description}
      </Text>

      <View style={styles.statusRow}>
        <Text style={styles.label}>
          Status
        </Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color="#6C5CE7"
        />

        <Text style={styles.infoText}>
          This template defines how churches,
          districts, presbyteries and assemblies
          are organised within your denomination.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",

    marginHorizontal: 16,
    marginTop: 14,

    borderRadius: 16,
    padding: 18,

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

  templateName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6C5CE7",
    marginBottom: 6,
  },

  description: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    marginBottom: 14,
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    color: "#777",
  },

  statusPill: {
    backgroundColor: "#EEF0FA",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  statusText: {
    color: "#6C5CE7",
    fontSize: 11,
    fontWeight: "800",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",

    backgroundColor: "#F7F4FF",

    borderRadius: 12,
    padding: 12,
  },

  infoText: {
    flex: 1,
    marginLeft: 8,

    fontSize: 12,
    color: "#444",
    lineHeight: 18,
  },
});