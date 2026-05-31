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

  /* ✅ FLYERS */
  const [flyers, setFlyers] = useState([
    { id: "1", image: require("../assets/flyer1.jpg"), active: true },
    { id: "2", image: require("../assets/flyer2.jpg"), active: true },
    { id: "3", image: require("../assets/flyer3.jpg"), active: false }
  ]);

  const activeFlyers = flyers.filter(f => f.active);

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

  /* ✅ SHRINK EFFECT */
  const carouselHeight = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [180, 110],
    extrapolate: "clamp"
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fb" }}>

      {/* ✅ STICKY HEADER (ONLY ADDITION) */}
      <View style={styles.stickyHeader}>
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

      {/* ✅ CAROUSEL */}
      <Animated.View style={[styles.carouselWrapper, { height: carouselHeight, marginTop: 80 }]}>
        <Text style={styles.sectionTitle}>Featured Events</Text>

        {activeFlyers.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#777" }}>
            No active flyers
          </Text>
        ) : (
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
        )}

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
      </Animated.View>

      {/* ✅ ADMIN CONTROL PANEL */}
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

      {/* ✅ SCROLLABLE CONTENT */}
      <Animated.ScrollView
        contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >

        {/* HEADER (unchanged) */}
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

      </Animated.ScrollView>

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

  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#4B3F72",
    padding: 16
  },

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

  adminPanel: {
    paddingHorizontal: 15,
    marginTop: 5
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

  header: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center"
  },

  logo: {
    width: 38,
    height: 38,
    marginRight: 10,
    borderRadius: 8,
    resizeMode: "contain"
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
