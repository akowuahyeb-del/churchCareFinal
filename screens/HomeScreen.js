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

/* ✅ FIREBASE */
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function HomeScreen() {

  const screenWidth = Dimensions.get("window").width;

  const [flyers, setFlyers] = useState([]);

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  /* ✅ LOCAL ASSETS (FORCE DISPLAY) */
  const localImages = [
    require("../assets/flyer1.jpg"),
    require("../assets/flyer2.jpg"),
    require("../assets/flyer3.jpg")
  ];

  /* ✅ LOAD FROM FIREBASE */
  const loadFlyers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "flyers"));

      const data = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...doc.data(),
        localImage: localImages[index % localImages.length] // ✅ FORCE LOCAL IMAGE
      }));

      setFlyers(data);

    } catch (error) {
      console.log("Error loading flyers:", error);
    }
  };

  /* ✅ LOAD + AUTO REFRESH */
  useEffect(() => {

    loadFlyers();

    const interval = setInterval(() => {
      loadFlyers();
    }, 5000);

    return () => clearInterval(interval);

  }, []);

  /* ✅ AUTO SLIDE */
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

      {/* ✅ HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChurchCare</Text>
        <Text style={styles.headerSub}>Welcome Back</Text>
      </View>

      {/* ✅ MESSAGE */}
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>Message from Pastor John</Text>
        <Text style={styles.messageText}>
          Stay strong in faith. This week we focus on spiritual growth.
        </Text>
      </View>

      {/* ✅ QUICK ACTIONS */}
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

      {/* ✅ CAROUSEL */}
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
              activeOpacity={0.9}
              onPress={() => setSelectedImage(item.localImage)}
              style={{
                width: screenWidth - 30,
                marginRight: 10
              }}
            >

              {/* ✅ ALWAYS SHOW LOCAL IMAGE */}
              <Image
                source={item.localImage}
                style={styles.carouselImage}
                resizeMode="cover"
              />

            </TouchableOpacity>
          ))}

        </ScrollView>

        {/* ✅ DOTS */}
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

      {/* ✅ EVENTS */}
      <Text style={styles.sectionTitle}>Upcoming Events</Text>

      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>Sunday Service</Text>
        <Text style={styles.eventSub}>10:00 AM</Text>
      </View>

      {/* ✅ FULL IMAGE */}
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
  container: { flex: 1, backgroundColor: "#f4f6fb", padding: 15 },

  header: { backgroundColor: "#4B3F72", padding: 20, borderRadius: 12, marginBottom: 15 },

  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  headerSub: { color: "#ddd", fontSize: 12 },

  messageCard: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 15 },

  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },

  quickRow: { flexDirection: "row", marginBottom: 20 },

  quickBtn: {
    backgroundColor: "#fff",
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginRight: 8,
    alignItems: "center"
  },

  carouselImage: {
    width: "100%",
    height: 180,
    borderRadius: 15
  },

  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10
  },

  dot: {
    width: 6,
    height: 6,
    backgroundColor: "#ccc",
    margin: 4,
    borderRadius: 3
  },

  activeDot: {
    width: 8,
    height: 8,
    backgroundColor: "#4B3F72"
  },

  eventCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10
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