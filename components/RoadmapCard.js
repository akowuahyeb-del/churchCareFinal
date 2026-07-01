import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RoadmapCard() {
  const upcomingFeatures = [
    "Organisation Hierarchy Tree",
    "District Management",
    "Presbytery Management",
    "Congregation Assignment",
    "Organisation Search",
    "Branch / Entity Limits",
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="rocket-outline"
          size={22}
          color="#F39C12"
        />

        <Text style={styles.title}>
          Organisation Roadmap
        </Text>
      </View>

      <Text style={styles.subtitle}>
        Upcoming hierarchy and governance features
      </Text>

      {upcomingFeatures.map((feature) => (
        <View
          key={feature}
          style={styles.featureRow}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color="#F39C12"
          />

          <Text style={styles.featureText}>
            {feature}
          </Text>
        </View>
      ))}

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color="#F39C12"
        />

        <Text style={styles.infoText}>
          The governance foundation is now in place.
          Future updates will introduce hierarchy
          management, organisational reporting,
          search, and entity controls.
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
    marginBottom: 10,
  },

  title: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },

  subtitle: {
    fontSize: 12,
    color: "#777",
    marginBottom: 14,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  featureText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#444",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",

    marginTop: 8,

    backgroundColor: "#FFF8E8",
    borderRadius: 12,
    padding: 12,
  },

  infoText: {
    flex: 1,
    marginLeft: 8,

    fontSize: 12,
    lineHeight: 18,
    color: "#555",
  },
});