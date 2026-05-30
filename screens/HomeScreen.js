import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image
} from "react-native";

export default function HomeScreen() {

  /* ✅ YOUR FLYERS */
  const flyers = [
    {
      id: "1",
      image: require("../assets/flyer1.jpg")
    }
  ];

  return (
    <ScrollView style={styles.container}>

      {/* ✅ HEADER (UNCHANGED CONCEPT) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChurchCare</Text>
        <Text style={styles.headerSub}>Welcome Back</Text>
      </View>

      {/* ✅ ✅ ✅ PASTOR MESSAGE (RESTORED) */}
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>Message from Pastor John</Text>
        <Text style={styles.messageText}>
          Stay strong in faith. This week we focus on spiritual growth and unity.
        </Text>
      </View>

      {/* ✅ ✅ ✅ QUICK ACTIONS (RESTORED) */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickText}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickText}>Members</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickText}>Reports</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ ✅ ✅ ✅ CAROUSEL (ONLY ADDITION HERE) */}
      <View style={styles.carouselContainer}>

        <Text style={styles.sectionTitle}>Featured Event</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {flyers.map((item) => (
            <View key={item.id} style={styles.carouselCard}>
              <Image source={item.image} style={styles.carouselImage} />
            </View>
          ))}
        </ScrollView>

      </View>

      {/* ✅ ✅ ✅ UPCOMING EVENTS (UNCHANGED) */}
      <Text style={styles.sectionTitle}>Upcoming Events</Text>

      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>Sunday Service</Text>
        <Text style={styles.eventSub}>10:00 AM</Text>
      </View>

      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>Midweek Prayer</Text>
        <Text style={styles.eventSub}>Wednesday 6:00 PM</Text>
      </View>

    </ScrollView>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 15
  },

  header: {
    backgroundColor: "#4B3F72",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },

  headerSub: {
    color: "#ddd",
    fontSize: 12
  },

  /* ✅ MESSAGE CARD */
  messageCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15
  },

  messageTitle: {
    fontWeight: "600",
    marginBottom: 5
  },

  messageText: {
    fontSize: 13,
    color: "#555"
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10
  },

  /* ✅ QUICK ACTIONS */
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  quickBtn: {
    backgroundColor: "#fff",
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginRight: 8,
    alignItems: "center"
  },

  quickText: {
    fontSize: 12,
    fontWeight: "500"
  },

  /* ✅ ✅ CAROUSEL */
  carouselContainer: {
    marginBottom: 20
  },

  carouselCard: {
    marginRight: 12
  },

  carouselImage: {
    width: 320,
    height: 180,
    borderRadius: 15
  },

  /* ✅ EVENTS */
  eventCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },

  eventTitle: {
    fontWeight: "600"
  },

  eventSub: {
    fontSize: 12,
    color: "#666"
  }

});