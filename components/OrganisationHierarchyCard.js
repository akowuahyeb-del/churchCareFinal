import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function OrganisationHierarchyCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="git-network-outline"
          size={22}
          color="#16A085"
        />

        <Text style={styles.title}>
          Organisation Hierarchy
        </Text>
      </View>

      <Text style={styles.subtitle}>
        Current church governance structure
      </Text>
       <View style={styles.badge}>
  <Text style={styles.badgeText}>
    Read Only
  </Text>
</View>

      <View style={styles.treeContainer}>
  <Text style={styles.rootNode}>
    🏛 National Assembly
  </Text>

  <Text style={styles.levelOne}>
    └─ Presbytery (Future)
  </Text>

  <Text style={styles.levelTwo}>
    └─ District (Future)
  </Text>

  <Text style={styles.levelThree}>
    └─ Congregation (Current)
  </Text>
</View>

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color="#16A085"
        />

        <Text style={styles.infoText}>
          ChurchCare is designed to support a structured
          church hierarchy. Future releases will enable
          management of Presbyteries, Districts, and
          Congregations through a dynamic organisational
          hierarchy tree.
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
    marginBottom: 16,
  },

  treeContainer: {
    marginBottom: 16,
  },

  rootNode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  levelOne: {
    fontSize: 14,
    color: "#444",
    marginLeft: 20,
    marginBottom: 6,
  },

  levelTwo: {
    fontSize: 14,
    color: "#444",
    marginLeft: 40,
    marginBottom: 6,
  },

  levelThree: {
    fontSize: 14,
    color: "#444",
    marginLeft: 60,
    marginBottom: 6,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FAF8",
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
  badge: {
  alignSelf: "flex-start",
  backgroundColor: "#E8F8F5",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  marginBottom: 12,
},

badgeText: {
  color: "#16A085",
  fontSize: 12,
  fontWeight: "700",
},
});