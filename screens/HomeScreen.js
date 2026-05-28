import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView
} from "react-native";

export default function HomeScreen() {

  return (
    <ScrollView style={styles.container}>

      {/* ✅ HEADER */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning 👋</Text>
        <Text style={styles.name}>Pastor John</Text>
      </View>

      {/* ✅ OVERVIEW */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>

        <View style={styles.row}>

          <StatCard number="186" label="Attendance" />
          <StatCard number="12" label="New Members" />
          <StatCard number="05" label="Events" />

        </View>
      </View>

      {/* ✅ QUICK ACTIONS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.row}>
          <ActionCard label="Attendance" />
          <ActionCard label="Members" />
          <ActionCard label="Reports" />
          <ActionCard label="Notify" />
        </View>

      </View>

      {/* ✅ UPCOMING EVENT */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Event</Text>

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>Youth Service</Text>
          <Text>Sat, 11 May • 4:00 PM</Text>
          <Text>Main Auditorium</Text>
        </View>
      </View>

    </ScrollView>
  );
}

/* ✅ SMALL COMPONENTS */

const StatCard = ({ number, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statNumber}>{number}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionCard = ({ label }) => (
  <View style={styles.actionCard}>
    <Text>{label}</Text>
  </View>
);

/* ✅ STYLES */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f4f6f8"
  },

  header: {
    backgroundColor: "#4B3F72",
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },

  greeting: {
    color: "#fff",
    fontSize: 16
  },

  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600"
  },

  section: {
    padding: 15
  },

  sectionTitle: {
    fontWeight: "600",
    marginBottom: 10
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  statCard: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    width: "30%",
    alignItems: "center"
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "600"
  },

  statLabel: {
    fontSize: 12,
    color: "#555"
  },

  actionCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    width: "22%",
    alignItems: "center"
  },

  eventCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10
  },

  eventTitle: {
    fontWeight: "600",
    marginBottom: 5
  }

});