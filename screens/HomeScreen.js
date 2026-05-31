import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Pressable
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {

  const screenWidth = Dimensions.get("window").width;

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  /* ✅ FLYERS */
  const [flyers, setFlyers] = useState([
    { id: "1", image: require("../assets/flyer1.jpg"), active: true },
    { id: "2", image: require("../assets/flyer2.jpg"), active: true },
    { id: "3", image: require("../assets/flyer3.jpg"), active: false }
  ]);

  const activeFlyers = flyers.filter(f => f.active);

  /* ✅ EVENTS */
  const [events] = useState([
    { id: "1", title: "Sunday Service", date: "9:00 AM", desc: "Main worship", active: true },
    { id: "2", title: "Youth Meetup", date: "Friday 6PM", desc: "Youth fellowship", active: true }
  ]);

  const activeEvents = events.filter(e => e.active);

  /* ✅ AUTO SLIDE */
  useEffect(() => {

    if (activeFlyers.length === 0) return;

    const interval = setInterval(() => {

      currentIndex.current =
        (currentIndex.current + 1) % activeFlyers.length;

      setActiveIndex(currentIndex.current);

      scrollRef.current?.scrollTo({
        x: currentIndex.current * (screenWidth - 30),
        animated: true
      });

    }, 3000);

    return () => clearInterval(interval);

  }, [flyers]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fb", paddingBottom: 10 }}>

      {/* ✅ HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
          />
          <View>
            <Text style={styles.headerTitle}>ChurchCare</Text>
            <Text style={styles.headerSub}>Welcome Back</Text>
          </View>
        </View>
      </View>

      {/* ✅ FIXED: paddingBottom ADDED */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ✅ CAROUSEL */}
        <View style={styles.carouselWrapper}>
          <Text style={styles.sectionTitle}>Featured Events</Text>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {activeFlyers.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedImage(item.image)}
                style={{ width: screenWidth - 30, marginRight: 10 }}
              >
                <Image source={item.image} style={styles.carouselImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* DOTS */}
          <View style={styles.dotsContainer}>
            {activeFlyers.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeIndex === index && styles.activeDot
                ]}
              />
            ))}
          </View>
        </View>

        {/* ✅ MANAGE FLYERS */}
        <View style={styles.adminPanel}>
          <Text style={styles.adminTitle}>Manage Flyers</Text>

          {flyers.map((item) => (
            <View key={item.id} style={styles.adminRow}>
              <Image source={item.image} style={styles.adminImage} />

              <Text style={styles.statusText}>
                {item.active ? "Active" : "Inactive"}
              </Text>

              <TouchableOpacity
                style={[
                  styles.adminBtn,
                  { backgroundColor: item.active ? "#ff4d4d" : "#1BA97F" }
                ]}
                onPress={() => {
                  setFlyers(prev =>
                    prev.map(f =>
                      f.id === item.id
                        ? { ...f, active: !f.active }
                        : f
                    )
                  );
                }}
              >
                <Text style={styles.adminBtnText}>
                  {item.active ? "Deactivate" : "Activate"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ✅ EVENTS */}
        <View style={{ paddingHorizontal: 15 }}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>

          {activeEvents.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>{event.date}</Text>
                <Text style={styles.eventDesc}>{event.desc}</Text>
              </View>
              <Ionicons name="calendar-outline" size={20} color="#4B3F72" />
            </View>
          ))}
        </View>

        {/* ✅ MESSAGE */}
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Message from Pastor</Text>
          <Text style={styles.messageText}>
            Stay strong in faith. Continue to grow spiritually.
          </Text>
        </View>

        {/* ✅ QUICK ACTIONS (FIXED VISIBILITY) */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: 15 }]}>
          Quick Actions
        </Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#E8F0FE" }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#2F55D4" />
            <Text style={[styles.quickText, { color: "#2F55D4" }]}>
              Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#E6F7EF" }]}>
            <Ionicons name="people-outline" size={18} color="#1BA97F" />
            <Text style={[styles.quickText, { color: "#1BA97F" }]}>
              Members
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#FFF4E5" }]}>
            <Ionicons name="analytics-outline" size={18} color="#D97706" />
            <Text style={[styles.quickText, { color: "#D97706" }]}>
              Reports
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ✅ MODAL */}
      <Modal visible={!!selectedImage} transparent>
        <View style={styles.modalWrap}>
          <Pressable onPress={() => setSelectedImage(null)}>
            <Image source={selectedImage} style={styles.fullImage} />
          </Pressable>
        </View>
      </Modal>

    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({

  header: {
    backgroundColor: "#4B3F72",
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 15
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center"
  },

  logo: {
    width: 28,
    height: 28,
    marginRight: 8
  },

  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700"
  },

  headerSub: {
    color: "#ddd",
    fontSize: 11
  },

  carouselWrapper: {
    marginTop: 10,
    paddingHorizontal: 15
  },

  carouselImage: {
    width: "100%",
    height: 150,
    borderRadius: 12
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8
  },

  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6
  },

  dot: {
    width: 6,
    height: 6,
    backgroundColor: "#ccc",
    margin: 4,
    borderRadius: 3
  },

  activeDot: {
    backgroundColor: "#4B3F72"
  },

  adminPanel: {
    paddingHorizontal: 15,
    marginTop: 10
  },

  adminTitle: {
    fontWeight: "700",
    marginBottom: 6
  },

  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8
  },

  adminImage: {
    width: 50,
    height: 50,
    borderRadius: 6
  },

  statusText: {
    fontSize: 12
  },

  adminBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },

  adminBtnText: {
    color: "#fff",
    fontSize: 10
  },

  eventCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: "center"
  },

  eventTitle: {
    fontWeight: "700",
    fontSize: 13
  },

  eventDate: {
    fontSize: 11,
    color: "#4B3F72"
  },

  eventDesc: {
    fontSize: 11,
    color: "#666"
  },

  messageCard: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 12,
    borderRadius: 10
  },

  messageTitle: {
    fontWeight: "600"
  },

  messageText: {
    fontSize: 12,
    color: "#555"
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginBottom: 40
  },

  quickCard: {
    width: "48%",
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: "center"
  },

  quickText: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: "600"
  },

  modalWrap: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "center",
    alignItems: "center"
  },

  fullImage: {
    width: 320,
    height: 480,
    borderRadius: 16
  }

});
``