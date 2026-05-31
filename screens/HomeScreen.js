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

  /* ✅ EVENTS (UPDATED ONLY) */
  const [events, setEvents] = useState([
    { id: "1", title: "Sunday Service", date: "9:00 AM", desc: "Main worship", active: true },
    { id: "2", title: "Youth Meetup", date: "Friday 6PM", desc: "Youth fellowship", active: true }
  ]);

  const activeEvents = events.filter(e => e.active);

  /* ✅ NEW FUNCTIONS ONLY */
  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const editEvent = (id) => {
    setEvents(prev =>
      prev.map(e =>
        e.id === id
          ? { ...e, title: e.title + " (Edited)" }
          : e
      )
    );
  };

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

              {/* ✅ ONLY THIS SIDE WAS UPDATED */}
              <View style={{ alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={20} color="#4B3F72" />

                <TouchableOpacity
                  style={{ marginTop: 4 }}
                  onPress={() => editEvent(event.id)}
                >
                  <Ionicons name="create-outline" size={16} color="#1BA97F" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 4 }}
                  onPress={() => deleteEvent(event.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff4d4d" />
                </TouchableOpacity>
              </View>

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

        {/* ✅ QUICK ACTIONS */}
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
