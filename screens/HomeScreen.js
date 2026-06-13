import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

/* ✅ COMPONENTS */
import AppHeader from "../components/AppHeader";
import QuickActionCard from "../components/QuickActionCard";
import StatCard from "../components/StatCard";
import Section from "../components/Section";
import EventCard from "../components/EventCard";

export default function HomeScreen() {
  const navigation = useNavigation();

  /* ✅ MOCK DATA (replace later with Firestore) */
  const upcomingEvents = [
    {
      id: "1",
      title: "Sunday Worship",
      startDate: "2026-06-15T09:00:00",
      location: "Main Auditorium",
    },
    {
      id: "2",
      title: "Youth Conference",
      startDate: "2026-06-18T17:00:00",
      location: "Youth Hall",
    },
  ];

  return (
    <View style={styles.safe}>

      {/* ✅ HEADER */}
      <AppHeader
        title="Dashboard"
        subtitle="Welcome back 👋"
      />

      <ScrollView contentContainerStyle={styles.body}>

        {/* ✅ STATS */}
        <Section title="Overview">
          <View style={styles.row}>
            <StatCard label="Members" value="245" />
            <StatCard label="Attendance" value="180" color="#1BA97F" />
          </View>

          <View style={styles.row}>
            <StatCard label="Events" value="12" color="#0984E3" />
            <StatCard label="Departments" value="6" color="#E17055" />
          </View>
        </Section>

        {/* ✅ QUICK ACTIONS */}
        <Section title="Quick Actions">
          <View style={styles.quickGrid}>

            <QuickActionCard
              title="Events"
              icon="calendar-outline"
              onPress={() => navigation.navigate("Events")}
            />

            <QuickActionCard
              title="Attendance"
              icon="checkmark-circle-outline"
              onPress={() => navigation.navigate("Attendance")}
            />

            <QuickActionCard
              title="Members"
              icon="people-outline"
              onPress={() => navigation.navigate("Members")}
            />

            <QuickActionCard
              title="Departments"
              icon="grid-outline"
              onPress={() => navigation.navigate("Departments")}
            />

            <QuickActionCard
              title="Finance"
              icon="cash-outline"
              onPress={() => navigation.navigate("Finance")}
            />

            <QuickActionCard
              title="Settings"
              icon="settings-outline"
              onPress={() => navigation.navigate("Settings")}
            />

          </View>
        </Section>

        {/* ✅ UPCOMING EVENTS */}
        <Section title="Upcoming Events">
          {upcomingEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => navigation.navigate("Events")}
            />
          ))}
        </Section>

      </ScrollView>
    </View>
  );
}const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  body: {
    paddingBottom: 100,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
});