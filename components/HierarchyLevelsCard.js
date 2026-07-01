import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HierarchyLevelsCard({
  templateName = "Presbyterian Structure",
  levels = [],
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="git-network-outline"
          size={22}
          color="#4B3F72"
        />

        <Text style={styles.title}>
          Organisation Structure
        </Text>
      </View>

      <Text style={styles.templateName}>
        {templateName}
      </Text>

      <Text style={styles.subtitle}>
        Governance hierarchy used by your organisation
      </Text>

      <View style={styles.levelsContainer}>
        {levels.map((level, index) => (
          <View key={`${level}-${index}`}>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>
                  {index + 1}
                </Text>
              </View>

              <Text style={styles.levelText}>
                {level}
              </Text>
            </View>

            {index < levels.length - 1 && (
              <View style={styles.connector}>
                <Ionicons
                  name="arrow-down"
                  size={14}
                  color="#999"
                />
              </View>
            )}
          </View>
        ))}
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
    marginBottom: 10,
  },

  title: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },

  templateName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B3F72",
  },

  subtitle: {
    marginTop: 4,
    marginBottom: 16,

    fontSize: 12,
    color: "#777",
  },

  levelsContainer: {
    marginTop: 4,
  },

  levelRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  levelBadge: {
    width: 26,
    height: 26,

    borderRadius: 13,

    backgroundColor: "#EEF0FA",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  levelNumber: {
    color: "#4B3F72",
    fontWeight: "800",
    fontSize: 12,
  },

  levelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  connector: {
    marginLeft: 6,
    marginVertical: 4,
  },
});