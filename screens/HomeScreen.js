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
  Pressable,
  Alert
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {

  const screenWidth = Dimensions.get("window").width;

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  const [flyers, setFlyers] = useState([
    { id: "1", image: require("../assets/flyer1.jpg"), active: true },
    { id: "2", image: require("../assets/flyer2.jpg"), active: true },
    { id: "3", image: require("../assets/flyer3.jpg"), active: false }
  ]);

  const activeFlyers = flyers.filter(f => f.active);

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
    <View style={{ flex: 1, backgroundColor: "#f4f6fb" }}>

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

      <Animated.ScrollView
        contentContainerStyle={{
          padding: 15,
          paddingBottom: 120
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* ✅ FLYERS */}
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

        {/* ✅ MANAGE FLYERS (RESTORED + DELETE) */}
        <View style={styles.adminPanel}>
          <Text style={styles.sectionTitle}>Manage Flyers</Text>

          {flyers.map((item) => (
            <View key={item.id} style={styles.adminRow}>

              <Image source={item.image} style={styles.adminImage} />

              <Text style={styles.statusText}>
                {item.active ? "Active" : "Inactive"}
              </Text>

              {/* Activate/Deactivate */}
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

              {/* DELETE BUTTON */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Delete Flyer",
                    "Are you sure you want to delete this flyer?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          setFlyers(prev =>
                            prev.filter(f => f.id !== item.id)
                          );
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>

            </View>
          ))}
        </View>

        {/* ✅ QUICK ACTIONS (FIXED SIZE) */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickGrid}>

          <TouchableOpacity style={[styles.quickCard, styles.attCard]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.quickText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, styles.memberCard]}>
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.quickText}>Members</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, styles.reportCard]}>
            <Ionicons name="bar-chart" size={20} color="#fff" />
            <Text style={styles.quickText}>Reports</Text>
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

  header: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    margin: 15,
    elevation: 6
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center"
  },

  logo: {
    width: 38,
    height: 38,
    marginRight: 10
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

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8
  },

  carouselImage: {
    width: "100%",
    height: 140,
    borderRadius: 12
  },

  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 6
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
    marginBottom: 14
  },

  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8
  },

  adminImage: {
    width: 50,
    height: 50,
    borderRadius: 6
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600"
  },

  adminBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },

  adminBtnText: {
    color: "#fff",
    fontSize: 11
  },

  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  quickCard: {
    width: "32%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3
  },

  attCard: { backgroundColor: "#2F55D4" },
  memberCard: { backgroundColor: "#1BA97F" },
  reportCard: { backgroundColor: "#D97706" },

  quickText: {
    color: "#fff",
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
    borderRadius: 12
  }

});