import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import AppHeader from "../components/AppHeader";

export default function SessionLeadershipScreen({
  navigation,
}) {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Session"
        subtitle="Manage Session Composition"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.container}
      >
        {/* Senior Presbyter */}

        <View style={styles.card}>

          <Text style={styles.sectionLabel}>
            SENIOR PRESBYTER
          </Text>

          <Text style={styles.mainName}>
            Not Assigned
          </Text>

          <Text style={styles.termText}>
            No active appointment
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>
              Assign Senior Presbyter
            </Text>
          </TouchableOpacity>

        </View>

        {/* Session Members */}

        <View style={styles.card}>

          <Text style={styles.sectionLabel}>
            SESSION MEMBERS
          </Text>

          <Text style={styles.countText}>
            0 Members
          </Text>

          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No Session Members added
            </Text>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
          >
            <Text style={styles.actionText}>
              Add Session Member
            </Text>
          </TouchableOpacity>

        </View>

        {/* Agents */}

        <View style={styles.card}>

          <Text style={styles.sectionLabel}>
            AGENTS
          </Text>

          <Text style={styles.infoText}>
            Ministers and Catechists form part
            of Session but are not elected.
          </Text>

          <View style={styles.agentRow}>
            <Text style={styles.agentRole}>
              Minister
            </Text>

            <Text style={styles.agentName}>
              Not Assigned
            </Text>
          </View>

          <View style={styles.agentRow}>
            <Text style={styles.agentRole}>
              Catechist
            </Text>

            <Text style={styles.agentName}>
              Not Assigned
            </Text>
          </View>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 16,
  },

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
    color: "#222",
  },

  termText: {
    marginTop: 6,
    color: "#4B3F72",
  },

  countText: {
    fontSize: 16,
    fontWeight: "600",
  },

  emptyState: {
    marginTop: 12,
    marginBottom: 12,
  },

  emptyText: {
    color: "#666",
  },

  actionBtn: {
    backgroundColor: "#4B3F72",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    alignItems: "center",
  },

  actionText: {
    color: "#FFF",
    fontWeight: "700",
  },

  infoText: {
    color: "#666",
    marginBottom: 12,
  },

  agentRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  agentRole: {
    fontWeight: "700",
    color: "#222",
  },

  agentName: {
    marginTop: 2,
    color: "#666",
  },

});