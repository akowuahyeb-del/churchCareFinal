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
  Alert,
  TextInput
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

  /* ✅ PASTOR MESSAGE */
  const [pastorMessage, setPastorMessage] = useState(
    "Stay strong in faith. God is working in your life this week."
  );
  const [editingMessage, setEditingMessage] = useState(false);

  /* ✅ EVENTS */
  const [events, setEvents] = useState([
    { id: "1", title: "Sunday Service", time: "2 June • 9:00 AM" },
    { id: "2", title: "Youth Meeting", time: "5 June • 5:00 PM" }
  ]);

  const [addingEvent, setAddingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");

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
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>ChurchCare</Text>
            <Text style={styles.headerSub}>Welcome Back</Text>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
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

        {/* ✅ PASTOR MESSAGE */}
        <Text style={styles.sectionTitle}>Message from Pastor</Text>

        <View style={styles.pastorBox}>

          {editingMessage ? (
            <>
              <TextInput
                value={pastorMessage}
                onChangeText={setPastorMessage}
                multiline
                style={styles.input}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => setEditingMessage(false)}
              >
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.pastorText}>{pastorMessage}</Text>

              <TouchableOpacity onPress={() => setEditingMessage(true)}>
                <Text style={styles.editText}>Edit Message</Text>
              </TouchableOpacity>
            </>
          )}

        </View>

        {/* ✅ QUICK ACTIONS (NOW BEFORE EVENTS ✅) */}
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

        {/* ✅ EVENTS */}
        <Text style={styles.sectionTitle}>Upcoming Events</Text>

        <View style={{ marginBottom: 15 }}>

          {events.map((item) => (
            <View key={item.id} style={styles.eventRow}>
              <View>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventTime}>{item.time}</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setEvents(prev => prev.filter(e => e.id !== item.id));
                }}
              >
                <Ionicons name="trash-outline" size={18} color="red" />
              </TouchableOpacity>
            </View>
          ))}

          {/* ✅ ADD EVENT FORM */}
          {addingEvent ? (
            <View style={styles.addForm}>
              <TextInput
                placeholder="Event Title"
                value={newTitle}
                onChangeText={setNewTitle}
                style={styles.input}
              />

              <TextInput
                placeholder="Date & Time"
                value={newTime}
                onChangeText={setNewTime}
                style={styles.input}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  if (!newTitle || !newTime) return;

                  setEvents(prev => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      title: newTitle,
                      time: newTime
                    }
                  ]);

                  setNewTitle("");
                  setNewTime("");
                  setAddingEvent(false);
                }}
              >
                <Text style={{ color: "#fff" }}>Save Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setAddingEvent(true)}
            >
              <Text style={{ color: "#fff" }}>+ Add Event</Text>
            </TouchableOpacity>
          )}

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

const styles = StyleSheet.create({

  header: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    margin: 15
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

  dot: { width: 6, height: 6, backgroundColor: "#ccc", margin: 4 },
  activeDot: { backgroundColor: "#4B3F72" },

  pastorBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15
  },

  pastorText: { fontSize: 13 },
  editText: { color: "#1BA97F", fontSize: 12 },

  input: {
    backgroundColor: "#eee",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6
  },

  saveBtn: {
    backgroundColor: "#1BA97F",
    padding: 10,
    borderRadius: 6,
    alignItems: "center"
  },

  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6
  },

  eventTitle: { fontWeight: "600" },
  eventTime: { fontSize: 12, color: "#666" },

  addBtn: {
    backgroundColor: "#4B3F72",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6
  },

  addForm: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8
  },

  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },

  quickCard: {
    width: "32%",
    padding: 12,
    borderRadius: 10,
    alignItems: "center"
  },

  attCard: { backgroundColor: "#2F55D4" },
  memberCard: { backgroundColor: "#1BA97F" },
  reportCard: { backgroundColor: "#D97706" },

  quickText: { color: "#fff", fontSize: 11 },

  modalWrap: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "center",
    alignItems: "center"
  },

  fullImage: {
    width: 320,
    height: 480
  }

});