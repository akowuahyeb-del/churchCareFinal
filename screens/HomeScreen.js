import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView
} from "react-native";

import { Feather, MaterialIcons } from "@expo/vector-icons";

export default function HomeScreen() {

  return (
    <SafeAreaView style={styles.safeArea}>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ✅ HEADER */}
        <View style={styles.header}>

          <View>
            <Text style={styles.greeting}>Good Morning 👋</Text>
            <Text style={styles.name}>Pastor John</Text>
          </View>

          {/* ✅ Notification bell with red dot */}
          <View style={{ position: "relative" }}>
            <Feather name="bell" size={22} color="#fff" />
            <View style={styles.notificationDot} />
          </View>

        </View>

        {/* ✅ CONTENT */}
        <View style={styles.content}>

          {/* ✅ OVERVIEW */}
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <Text style={styles.subDate}>Sunday, 12 May 2024</Text>

          <View style={styles.statsRow}>
            <StatCard value="186" label="Today's Attendance" />
            <StatCard value="12" label="New Members" />
            <StatCard value="05" label="Upcoming Events" />
          </View>

          {/* ✅ QUICK ACTIONS */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionRow}>
            <ActionCard icon="phone" label="Check Attendance" />
            <ActionCard icon="users" label="Members" />
            <ActionCard icon="file-text" label="Reports" />
            <ActionCard icon="bell" label="Send Notification" />
          </View>

          {/* ✅ EVENT HEADER */}
          <View style={styles.eventHeader}>
            <Text style={styles.sectionTitle}>Upcoming Event</Text>
            <Text style={styles.viewAll}>View All</Text>
          </View>

          {/* ✅ EVENT CARD */}
          <View style={styles.eventCard}>

            <MaterialIcons name="event" size={22} color="#4B3F72" />

            <View style={{ marginLeft: 12 }}>
              <Text style={styles.eventTitle}>Youth Service</Text>
              <Text style={styles.eventDetails}>
                Sat, 11 May 2024 • 4:00 PM
              </Text>
              <Text style={styles.eventDetails}>
                Main Auditorium
              </Text>
            </View>

          </View>

          {/* ✅ SMALL BOTTOM SPACE (NOT EMPTY GAP) */}
          <View style={{ height: 20 }} />

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ✅ COMPONENTS */

const StatCard = ({ value, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionCard = ({ icon, label }) => (
  <View style={styles.actionCard}>

    {/* ✅ ICON FIXED */}
    <View style={styles.iconBox}>
      <Feather name={icon} size={18} color="#4B3F72" />
    </View>

    <Text style={styles.actionText}>{label}</Text>

  </View>
);

/* ✅ STYLES */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: "#4B3F72"
  },

  scrollContent: {
    flexGrow: 1
  },

  /* ✅ HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20
  },

  greeting: {
    color: "#fff",
    fontSize: 14
  },

  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600"
  },

  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red"
  },

  /* ✅ CONTENT */
  content: {
    flex: 1,
    backgroundColor: "#f7f8fb",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18
  },

  sectionTitle: {
    fontWeight: "600",
    marginTop: 14
  },

  subDate: {
    fontSize: 11,
    color: "#888",
    marginBottom: 12
  },

  /* ✅ STATS */
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },

  statCard: {
    backgroundColor: "#fff",
    width: "30%",
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: "center",
    elevation: 1
  },

  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4B3F72"
  },

  statLabel: {
    fontSize: 11,
    textAlign: "center",
    color: "#555"
  },

  /* ✅ ACTIONS */
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18
  },

  actionCard: {
    backgroundColor: "#fff",
    width: "23%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 1
  },

  /* ✅ ICON BOX FIXED VISIBILITY */
  iconBox: {
    backgroundColor: "#E6DFFD",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8
  },

  actionText: {
    fontSize: 11,
    textAlign: "center",
    color: "#222"
  },

  /* ✅ EVENT */
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  viewAll: {
    color: "#4B3F72",
    fontSize: 11,
    fontWeight: "500"
  },

  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginTop: 6,
    elevation: 1
  },

  eventTitle: {
    fontWeight: "600"
  },

  eventDetails: {
    fontSize: 11,
    color: "#666"
  }

});