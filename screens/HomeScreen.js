import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity
} from "react-native";

import { Feather, MaterialIcons } from "@expo/vector-icons";

export default function HomeScreen({ navigation }) {

  return (
    <SafeAreaView style={styles.safeArea}>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning 👋</Text>
            <Text style={styles.name}>Pastor John</Text>
          </View>

          {/* Notification */}
          <View style={styles.bellContainer}>
            <Feather name="bell" size={22} color="#fff" />
            <View style={styles.notificationDot} />
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>

          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <Text style={styles.subDate}>Sunday, 12 May 2024</Text>

          <View style={styles.statsRow}>
            <StatCard value="186" label="Attendance" />
            <StatCard value="12" label="Members" />
            <StatCard value="05" label="Events" />
          </View>

          {/* ACTIONS */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionRow}>

            <ActionCard
              icon="check-circle"
              label="Check Attendance"
              onPress={() => navigation.navigate("Attendance")}
            />

            <ActionCard icon="users" label="Members" />
            <ActionCard icon="file-text" label="Reports" />
            <ActionCard icon="bell" label="Notify" />

          </View>

          {/* EVENT */}
          <View style={styles.eventHeader}>
            <Text style={styles.sectionTitle}>Upcoming Event</Text>
            <Text style={styles.viewAll}>View All</Text>
          </View>

          <View style={styles.eventCard}>
            <MaterialIcons name="event" size={22} color="#4B3F72" />

            <View style={{ marginLeft: 12 }}>
              <Text style={styles.eventTitle}>Youth Service</Text>
              <Text style={styles.eventDetails}>
                Sat, 11 May • 4:00 PM
              </Text>
              <Text style={styles.eventDetails}>
                Main Auditorium
              </Text>
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* COMPONENTS */

const StatCard = ({ value, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionCard = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={styles.iconBox}>
      <Feather name={icon} size={18} color="#4B3F72" />
    </View>
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

/* STYLES */

const styles = StyleSheet.create({

  safeArea: { flex: 1, backgroundColor: "#4B3F72" },
  scrollContent: { flexGrow: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 55,
    paddingHorizontal: 20
  },

  greeting: { color: "#fff", fontSize: 14 },
  name: { color: "#fff", fontSize: 20, fontWeight: "600" },

  bellContainer: { position: "relative" },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: "red",
    borderRadius: 4
  },

  content: {
    flex: 1,
    backgroundColor: "#f7f8fb",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18
  },

  sectionTitle: { fontWeight: "600", marginTop: 14 },
  subDate: { fontSize: 11, color: "#888" },

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
    alignItems: "center"
  },

  statValue: { fontWeight: "700", color: "#4B3F72" },
  statLabel: { fontSize: 11 },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },

  actionCard: {
    backgroundColor: "#fff",
    width: "23%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center"
  },

  iconBox: {
    backgroundColor: "#E6DFFD",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8
  },

  actionText: { fontSize: 11 },

  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  viewAll: { fontSize: 11, color: "#4B3F72" },

  eventCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginTop: 6
  },

  eventTitle: { fontWeight: "600" },
  eventDetails: { fontSize: 11 }

});