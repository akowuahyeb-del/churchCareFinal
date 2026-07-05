// screens/AttendanceSummaryScreen.js

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import { Ionicons } from "@expo/vector-icons";


export default function AttendanceSummaryScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance Summary"
        subtitle="Attendance intelligence & trends"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.body}>

  <View style={styles.sessionCard}>
    <View style={styles.sessionHeader}>
      <Ionicons
        name="calendar-outline"
        size={22}
        color="#4B3F72"
      />

      <Text style={styles.sessionTitle}>
        Sunday Service
      </Text>
    </View>

    <Text style={styles.sessionType}>
      First Service
    </Text>

    <Text style={styles.sessionMeta}>
      05 Jul 2026 • 08:00 AM – 10:15 AM
    </Text>

    <View style={styles.sessionDivider} />

    <View style={styles.sessionFooter}>
      <Ionicons
        name="business-outline"
        size={14}
        color="#666"
      />

      <Text style={styles.sessionChurch}>
        Prince of Peace Congregation
      </Text>
    </View>
  </View>

</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4B3F72",
  },

  subtitle: {
    marginTop: 10,
    color: "#888",
  },
  body: {
  padding: 14,
},

sessionCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  elevation: 2,
},

sessionHeader: {
  flexDirection: "row",
  alignItems: "center",
},

sessionTitle: {
  marginLeft: 8,
  fontSize: 18,
  fontWeight: "800",
  color: "#4B3F72",
},

sessionType: {
  marginTop: 10,
  fontSize: 14,
  fontWeight: "700",
  color: "#333",
},

sessionMeta: {
  marginTop: 4,
  fontSize: 12,
  color: "#888",
},

sessionDivider: {
  height: 1,
  backgroundColor: "#eee",
  marginVertical: 14,
},

sessionFooter: {
  flexDirection: "row",
  alignItems: "center",
},

sessionChurch: {
  marginLeft: 6,
  color: "#666",
  fontSize: 12,
  fontWeight: "600",
},
});