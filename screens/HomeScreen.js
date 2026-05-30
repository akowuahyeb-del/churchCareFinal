import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Modal,
  Pressable
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {

  const screenWidth = Dimensions.get("window").width;

  const scrollY = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  const flyers = [
    { id: "1", image: require("../assets/flyer1.jpg") },
    { id: "2", image: require("../assets/flyer2.jpg") },
    { id: "3", image: require("../assets/flyer3.jpg") }
  ];

  /* ✅ AUTO SLIDE */
  useEffect(() => {
    const interval = setInterval(() => {

      currentIndex.current =
        (currentIndex.current + 1) % flyers.length;

      setActiveIndex(currentIndex.current);

      scrollRef.current?.scrollTo({
        x: currentIndex.current * (screenWidth - 30),
        animated: true
      });

    }, 3000);

    return () => clearInterval(interval);
  }, []);

  /* ✅ SHRINK EFFECT */
  const carouselHeight = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [180, 110],  // ✅ shrink size
    extrapolate: "clamp"
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fb" }}>

      {/* ✅ STICKY + SHRINK CAROUSEL */}
      <Animated.View style={[styles.carouselWrapper, { height: carouselHeight }]}>

        <Text style={styles.sectionTitle}>Featured Events</Text>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >

          {flyers.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedImage(item.image)}
              style={{ width: screenWidth - 30, marginRight: 10 }}
            >
              <Image source={item.image} style={styles.carouselImage} />
            </TouchableOpacity>
          ))}

        </ScrollView>

        <View style={styles.dotsContainer}>
          {flyers.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index && styles.activeDot
              ]}
            />
          ))}
        </View>

      </Animated.View>

      {/* ✅ SCROLLABLE CONTENT */}
      <Animated.ScrollView
        contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}

        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ChurchCare</Text>
          <Text style={styles.headerSub}>Welcome Back</Text>
        </View>

        {/* MESSAGE */}
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Message from Pastor</Text>
          <Text style={styles.messageText}>
            Stay strong in faith. Continue to grow spiritually.
          </Text>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickGrid}>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#E8F0FE" }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#2F55D4" />
            <Text style={[styles.quickText, { color: "#2F55D4" }]}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#E6F7EF" }]}>
            <Ionicons name="people-outline" size={18} color="#1BA97F" />
            <Text style={[styles.quickText, { color: "#1BA97F" }]}>Members</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#FFF4E5" }]}>
            <Ionicons name="analytics-outline" size={18} color="#D97706" />
            <Text style={[styles.quickText, { color: "#D97706" }]}>Reports</Text>
          </TouchableOpacity>

        </View>

        {/* EVENTS */}
        <Text style={styles.sectionTitle}>Upcoming Events</Text>

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>Sunday Service</Text>
          <Text style={styles.eventSub}>10:00 AM</Text>
        </View>

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>Midweek Prayer</Text>
          <Text style={styles.eventSub}>Wednesday 6:00 PM</Text>
        </View>

      </Animated.ScrollView>

      {/* FULL IMAGE */}
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

  carouselWrapper: {
    backgroundColor: "#f4f6fb",
    padding: 15
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
    color: "#222"
  },

  carouselImage: {
    width: "100%",
    height: 140,
    borderRadius: 12
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

  header: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },

  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },

  headerSub: {
    color: "#ddd",
    fontSize: 12
  },

  messageCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12
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
    justifyContent: "space-between"
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
    fontWeight: "600",
    marginTop: 3
  },

  eventCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },

  eventTitle: {
    fontWeight: "700",
    fontSize: 13
  },

  eventSub: {
    fontSize: 11,
    color: "#777"
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