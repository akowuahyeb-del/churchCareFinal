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
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function HomeScreen() {

  const screenWidth = Dimensions.get("window").width;

  const [flyers, setFlyers] = useState([]);

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  const localImages = [
    require("../assets/flyer1.jpg"),
    require("../assets/flyer2.jpg"),
    require("../assets/flyer3.jpg")
  ];

  const loadFlyers = async () => {
    const snapshot = await getDocs(collection(db, "flyers"));

    const data = snapshot.docs.map((doc, index) => ({
      id: doc.id,
      ...doc.data(),
      localImage: localImages[index % localImages.length]
    }));

    setFlyers(data);
  };

  useEffect(() => {
    loadFlyers();
  }, []);

  useEffect(() => {
    if (flyers.length === 0) return;

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
  }, [flyers.length]);

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChurchCare</Text>
        <Text style={styles.headerSub}>Welcome Back</Text>
      </View>

      {/* MESSAGE */}
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>Message from Pastor John</Text>
        <Text style={styles.messageText}>
          Stay strong in faith. This week we focus on spiritual growth.
        </Text>
      </View>

      {/* QUICK ACTIONS */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.quickRow}>

        <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#E8F0FE" }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#2F55D4" />
          <Text style={[styles.quickText, { color: "#2F55D4" }]} numberOfLines={2}>
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#E6F7EF" }]}>
          <Ionicons name="people-outline" size={18} color="#1BA97F" />
          <Text style={[styles.quickText, { color: "#1BA97F" }]} numberOfLines={2}>
            Members
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#FFF4E5" }]}>
          <Ionicons name="analytics-outline" size={18} color="#D97706" />
          <Text style={[styles.quickText, { color: "#D97706" }]} numberOfLines={2}>
            Reports
          </Text>
        </TouchableOpacity>

      </View>

      {/* CAROUSEL */}
      <View style={styles.carouselContainer}>

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
              onPress={() => setSelectedImage(item.localImage)}
              style={{ width: screenWidth - 30, marginRight: 10 }}
            >

              <Image
                source={item.localImage}
                style={styles.carouselImage}
                resizeMode="cover"
              />

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

      {/* FULL VIEW */}
      <Modal visible={!!selectedImage} transparent>
        <View style={styles.modalWrap}>
          <Pressable onPress={() => setSelectedImage(null)}>
            <Image source={selectedImage} style={styles.fullImage} />
          </Pressable>
        </View>
      </Modal>

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
    borderRadius: 16,
    marginBottom: 15,
    elevation: 4
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },

  headerSub: {
    color: "#ddd",
    fontSize: 12
  },

  messageCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
    elevation: 3
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
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    color: "#222",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2
  },

  quickText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    flexWrap: "wrap"
  },

  carouselContainer: {
    marginBottom: 20
  },

  carouselImage: {
    width: "100%",
    height: 190,
    borderRadius: 16
  },

  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ccc",
    marginHorizontal: 4
  },

  activeDot: {
    width: 8,
    height: 8,
    backgroundColor: "#4B3F72"
  },

  eventCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3
  },

  eventTitle: {
    fontWeight: "700",
    fontSize: 14
  },

  eventSub: {
    fontSize: 12,
    color: "#777"
  },

  modalWrap: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "center",
    alignItems: "center"
  },

  fullImage: {
    width: 350,
    height: 500,
    borderRadius: 20
  }

});