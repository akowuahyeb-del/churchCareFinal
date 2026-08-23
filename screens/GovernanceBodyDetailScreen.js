import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import AppHeader from "../components/AppHeader";

export default function GovernanceBodyDetailScreen({
  navigation,
  route,
}) {

  const governanceBody =
    route?.params?.governanceBody || {
      name: "Session",
      leadershipRole: "Senior Presbyter",
      memberLabel: "Session Members",
      exOfficioLabel: "Agents",
    };

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title={governanceBody.name}
        subtitle="Governance Body"
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >

        {/* Leadership Role */}

        <View style={styles.card}>

          <Text style={styles.sectionLabel}>
            LEADERSHIP ROLE
          </Text>

          <Text style={styles.mainName}>
            Not Assigned
          </Text>

          <Text style={styles.roleText}>
            {governanceBody.leadershipRole}
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
          >
            <Text
              style={styles.actionText}
            >
              Assign {governanceBody.leadershipRole}
            </Text>
          </TouchableOpacity>

        </View>

        {/* Members */}

        <View style={styles.card}>

          <Text style={styles.sectionLabel}>
            {(
  governanceBody.memberLabel ||
  "Members"
).toUpperCase()}
          </Text>

          <Text style={styles.countText}>
            0 Members
          </Text>

          <TouchableOpacity
  style={styles.actionBtn}
  onPress={() =>
    navigation.navigate(
      "GovernanceBodyMembers",
      {
        governanceBody,
      }
    )
  }
>
  <Text
    style={styles.actionText}
  >
    Manage {governanceBody.memberLabel}
  </Text>
</TouchableOpacity>

        </View>

        {/* Ex-Officio Members */}

        <View style={styles.card}>

          <Text style={styles.sectionLabel}>
            {(
  governanceBody.exOfficioLabel ||
  "Ex-Officio Members"
).toUpperCase()}
          </Text>

          <Text style={styles.infoText}>
            Members of the body by virtue
            of office.
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
          >
            <Text
              style={styles.actionText}
            >
              Manage {governanceBody.exOfficioLabel}
            </Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },

  sectionLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "700",
    marginBottom: 8,
  },

  mainName: {
    fontSize: 20,
    fontWeight: "700",
  },

  roleText: {
    color: "#4B3F72",
    marginTop: 4,
  },

  countText: {
    fontSize: 16,
    fontWeight: "600",
  },

  infoText: {
    color: "#666",
  },

  actionBtn: {
    marginTop: 12,
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  actionText: {
    color: "#FFF",
    fontWeight: "700",
  },

});