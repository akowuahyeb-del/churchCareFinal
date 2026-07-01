import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function OrganisationHierarchyCard() {
const hierarchyCounts = {
  assembly: 1,
  presbyteries: 3,
  districts: 8,
  congregations: 24,
};

const hierarchyTree = [
  {
    label: "National Assembly",
    level: 0,
  },
  {
    label: "Greater Accra Presbytery",
    level: 1,
  },
  {
    label: "Airport District",
    level: 2,
  },
  {
    label: "Prince of Peace Congregation",
    level: 3,
  },
];

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
  {hierarchyTree.map((item, index) => (
    <Text
      key={index}
      style={[
        styles.treeItem,
        {
          marginLeft: item.level * 20,
        },
      ]}
    >
      {item.level === 0 ? "🏛 " : "└─ "}
      {item.label}
    </Text>
  ))}
</View>

<View style={styles.statsRow}>
  <View style={styles.stat}>
  <Text style={styles.statLabel}>HQ</Text>
  <Text style={styles.statNumber}>
  {hierarchyCounts.assembly}
</Text>
</View>

  <View style={styles.legendContainer}>
  <View style={styles.legendItem}>
    <View style={styles.currentDot} />
    <Text style={styles.legendText}>
      Curr
    </Text>
  </View>

  <View style={styles.legendItem}>
    <View style={styles.futureDot} />
    <Text style={styles.legendText}>
      Plan
    </Text>
  </View>
</View>

  <View style={styles.stat}>
  <Text style={styles.statLabel}>Presb</Text>
  <Text style={styles.statNumber}>
  {hierarchyCounts.presbyteries}
</Text>
</View>

  <View style={styles.stat}>
  <Text style={styles.statLabel}>Dist</Text>
  <Text style={styles.statNumber}>
  {hierarchyCounts.districts}
</Text>

</View>

  <View style={styles.stat}>
  <Text style={styles.statLabel}>Congr</Text>
  <Text style={styles.statNumber}>
  {hierarchyCounts.districts}
</Text>

</View>
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
statsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
},

stat: {
  flex: 1,
  alignItems: "center",
},

statNumber: {
  fontSize: 18,
  fontWeight: "700",
  color: "#16A085",
},
statLabel: {
  fontSize: 10,
  color: "#777",
  textAlign: "center",
},

legendContainer: {
  flexDirection: "row",
  justifyContent: "center",
  marginBottom: 16,
},

legendItem: {
  flexDirection: "row",
  alignItems: "center",
  marginHorizontal: 12,
},

currentDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#27AE60",
  marginRight: 6,
},

futureDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#F39C12",
  marginRight: 6,
},

legendText: {
  fontSize: 12,
  color: "#555",
},
treeItem: {
  fontSize: 14,
  color: "#444",
  marginBottom: 8,
},
});