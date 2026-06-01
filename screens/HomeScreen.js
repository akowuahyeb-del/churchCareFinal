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
  Pressable,
  TextInput
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {

  const screenWidth = Dimensions.get("window").width;

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  /* FLYERS */
  const [flyers, setFlyers] = useState([
    { id: "1", image: require("../assets/flyer1.jpg"), active: true },
    { id: "2", image: require("../assets/flyer2.jpg"), active: true },
    { id: "3", image: require("../assets/flyer3.jpg"), active: false }
  ]);

  const activeFlyers = flyers.filter(f => f.active);

  /* FLYER DELETE */
  const [flyerToDelete, setFlyerToDelete] = useState(null);
  const [deleteFlyerModalVisible, setDeleteFlyerModalVisible] = useState(false);

  const confirmDeleteFlyer = () => {
    setFlyers(prev => prev.filter(f => f.id !== flyerToDelete.id));
    setDeleteFlyerModalVisible(false);
    setFlyerToDelete(null);
  };

  /* EVENTS */
  const [events, setEvents] = useState([
    { id: "1", title: "Sunday Service", date: "9:00 AM", desc: "Main worship", active: true },
    { id: "2", title: "Youth Meetup", date: "Friday 6PM", desc: "Youth fellowship", active: true }
  ]);

  const activeEvents = events.filter(e => e.active);

  /* STATES */
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [editingEvent, setEditingEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDesc, setEditDesc] = useState("");

  /* FUNCTIONS */

  const createEvent = () => {
    if (!newTitle.trim()) return;
    const newEvent = {
      id: Date.now().toString(),
      title: newTitle,
      date: newDate,
      desc: newDesc,
      active: true
    };
    setEvents(prev => [newEvent, ...prev]);
    setCreateModalVisible(false);
    setNewTitle(""); setNewDate(""); setNewDesc("");
  };

  const editEvent = (event) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditDate(event.date);
    setEditDesc(event.desc);
    setEditModalVisible(true);
  };

  const saveEdit = () => {
    setEvents(prev =>
      prev.map(e =>
        e.id === editingEvent.id
          ? { ...e, title: editTitle, date: editDate, desc: editDesc }
          : e
      )
    );
    setEditModalVisible(false);
  };

  const deleteEvent = (event) => {
    setEventToDelete(event);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
    setDeleteModalVisible(false);
  };

  /* AUTO SLIDE */
  useEffect(() => {
    if (activeFlyers.length === 0) return;

    const interval = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % activeFlyers.length;
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

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>ChurchCare</Text>
            <Text style={styles.headerSub}>Welcome Back</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* 1 — CAROUSEL */}
        <View style={styles.carouselWrapper}>
          <Text style={styles.sectionTitle}>Featured Events</Text>

          <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {activeFlyers.map(item => (
              <TouchableOpacity key={item.id}
                onPress={() => setSelectedImage(item.image)}
                style={{ width: screenWidth - 30, marginRight: 10 }}>
                <Image source={item.image} style={styles.carouselImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.dotsContainer}>
            {activeFlyers.map((_, index) => (
              <View key={index} style={[styles.dot, activeIndex === index && styles.activeDot]} />
            ))}
          </View>
        </View>

        {/* 2 — MESSAGE FROM PASTOR */}
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Message from Pastor</Text>
          <Text style={styles.messageText}>
            Stay strong in faith. Continue to grow spiritually.
          </Text>
        </View>

        {/* 3 — MANAGE FLYERS */}
        <View style={styles.adminPanel}>
          <Text style={styles.adminTitle}>Manage Flyers</Text>

          {flyers.map(item => (
            <View key={item.id} style={styles.adminRow}>
              <Image source={item.image} style={styles.adminImage} />

              <Text style={styles.statusText}>
                {item.active ? "Active" : "Inactive"}
              </Text>

              {/* Toggle Active/Inactive */}
              <TouchableOpacity
                style={[styles.adminBtn, { backgroundColor: item.active ? "#ff4d4d" : "#1BA97F" }]}
                onPress={() =>
                  setFlyers(prev =>
                    prev.map(f => f.id === item.id ? { ...f, active: !f.active } : f)
                  )
                }
              >
                <Text style={styles.adminBtnText}>
                  {item.active ? "Deactivate" : "Activate"}
                </Text>
              </TouchableOpacity>

              {/* Delete Flyer */}
              <TouchableOpacity
                style={[styles.adminBtn, { backgroundColor: "#7f1d1d", marginLeft: 4 }]}
                onPress={() => {
                  setFlyerToDelete(item);
                  setDeleteFlyerModalVisible(true);
                }}
              >
                <Text style={styles.adminBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 4 — QUICK ACTIONS */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: 15 }]}>Quick Actions</Text>

        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#2F55D4" />
            <Text style={styles.quickText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCard}>
            <Ionicons name="people-outline" size={18} color="#1BA97F" />
            <Text style={styles.quickText}>Members</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCard}>
            <Ionicons name="analytics-outline" size={18} color="#D97706" />
            <Text style={styles.quickText}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* 5 — UPCOMING EVENTS */}
        <View style={{ paddingHorizontal: 15, marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>

          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
            <Text style={{ color: "#fff" }}>+ Add Event</Text>
          </TouchableOpacity>

          {activeEvents.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>{event.date}</Text>
                <Text style={styles.eventDesc}>{event.desc}</Text>
              </View>

              <View style={{ alignItems: "center", gap: 6 }}>
                <Ionicons name="calendar-outline" size={20} color="#4B3F72" />

                <TouchableOpacity onPress={() => editEvent(event)}>
                  <Ionicons name="create-outline" size={20} color="#1BA97F" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => deleteEvent(event)}>
                  <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* CREATE EVENT MODAL */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Create Event</Text>
            <TextInput style={styles.input} placeholder="Title" value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={styles.input} placeholder="Date / Time" value={newDate} onChangeText={setNewDate} />
            <TextInput style={styles.input} placeholder="Description" value={newDesc} onChangeText={setNewDesc} />
            <TouchableOpacity style={styles.modalBtn} onPress={createEvent}>
              <Text style={{ color: "#fff" }}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]}
              onPress={() => setCreateModalVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT EVENT MODAL */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Event</Text>
            <TextInput style={styles.input} placeholder="Title" value={editTitle} onChangeText={setEditTitle} />
            <TextInput style={styles.input} placeholder="Date / Time" value={editDate} onChangeText={setEditDate} />
            <TextInput style={styles.input} placeholder="Description" value={editDesc} onChangeText={setEditDesc} />
            <TouchableOpacity style={styles.modalBtn} onPress={saveEdit}>
              <Text style={{ color: "#fff" }}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]}
              onPress={() => setEditModalVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DELETE EVENT MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Delete Event?</Text>
            <Text style={{ color: "#666", marginBottom: 14, textAlign: "center" }}>
              "{eventToDelete?.title}" will be permanently removed.
            </Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d" }]} onPress={confirmDelete}>
              <Text style={{ color: "#fff" }}>Yes, Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]}
              onPress={() => setDeleteModalVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DELETE FLYER MODAL */}
      <Modal visible={deleteFlyerModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Delete Flyer?</Text>
            <Text style={{ color: "#666", marginBottom: 14, textAlign: "center" }}>
              This flyer will be permanently removed from the list.
            </Text>
            {flyerToDelete && (
              <Image source={flyerToDelete.image} style={styles.flyerPreview} />
            )}
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d", marginTop: 12 }]}
              onPress={confirmDeleteFlyer}>
              <Text style={{ color: "#fff" }}>Yes, Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]}
              onPress={() => setDeleteFlyerModalVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* IMAGE FULLSCREEN MODAL */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
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
  header: { backgroundColor: "#4B3F72", paddingTop: 40, paddingBottom: 12, paddingHorizontal: 15 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 28, height: 28, marginRight: 8 },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  headerSub: { color: "#ddd", fontSize: 11 },

  carouselWrapper: { marginTop: 10, paddingHorizontal: 15 },
  carouselImage: { width: "100%", height: 150, borderRadius: 12 },
  dotsContainer: { flexDirection: "row", justifyContent: "center", marginTop: 6 },
  dot: { width: 6, height: 6, backgroundColor: "#ccc", margin: 4, borderRadius: 3 },
  activeDot: { backgroundColor: "#4B3F72" },

  messageCard: { backgroundColor: "#fff", marginHorizontal: 15, marginTop: 14, padding: 14, borderRadius: 10 },
  messageTitle: { fontWeight: "600", marginBottom: 4 },
  messageText: { fontSize: 12, color: "#555" },

  adminPanel: { paddingHorizontal: 15, marginTop: 14 },
  adminTitle: { fontWeight: "700", marginBottom: 8, fontSize: 16 },
  adminRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, backgroundColor: "#fff", padding: 8, borderRadius: 8 },
  adminImage: { width: 50, height: 50, borderRadius: 6 },
  statusText: { fontSize: 12, flex: 1, marginLeft: 8 },
  adminBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  adminBtnText: { color: "#fff", fontSize: 10 },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 15 },
  quickCard: { width: "48%", padding: 10, backgroundColor: "#E8F0FE", borderRadius: 10, marginBottom: 8, alignItems: "center" },
  quickText: { fontSize: 11 },

  eventCard: { flexDirection: "row", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 8 },
  eventTitle: { fontWeight: "700", fontSize: 13 },
  eventDate: { fontSize: 11, color: "#4B3F72" },
  eventDesc: { fontSize: 11, color: "#666" },

  addBtn: { backgroundColor: "#4B3F72", padding: 8, borderRadius: 6, marginBottom: 10, alignItems: "center" },

  modalWrap: { flex: 1, backgroundColor: "#000c", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 12, width: "85%" },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 10, padding: 10 },
  modalBtn: { backgroundColor: "#1BA97F", padding: 12, alignItems: "center", borderRadius: 8 },

  flyerPreview: { width: "100%", height: 120, borderRadius: 8, resizeMode: "cover" },

  fullImage: { width: 320, height: 480, borderRadius: 16 }
});