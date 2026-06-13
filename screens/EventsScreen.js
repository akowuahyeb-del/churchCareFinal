import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";



export default function EventsScreen() {
  const navigation = useNavigation();

  const [events, setEvents] = useState([
    { id: 1, title: "Sunday Service", date: "Tomorrow", location: "Main Hall" },
    { id: 2, title: "Prayer Meeting", date: "Wednesday", location: "Chapel" },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const addEvent = () => {
    if (!newTitle) return;

    const newEvent = {
      id: Date.now(),
      title: newTitle,
      date: newDate || "TBD",
      location: newLocation || "Unknown",
    };

    setEvents([newEvent, ...events]);
    setModalVisible(false);
    setNewTitle("");
    setNewDate("");
    setNewLocation("");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ✅ HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.getParent()?.navigate("Home")}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Events</Text>

        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ✅ BODY */}
      <ScrollView contentContainerStyle={styles.body}>
        {events.map((event) => (
          <View key={event.id} style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="calendar-outline" size={22} color="#4B3F72" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{event.title}</Text>
              <Text style={styles.desc}>{event.date}</Text>
              <Text style={styles.desc}>{event.location}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity>
                <Ionicons name="create-outline" size={18} color="#4B3F72" />
              </TouchableOpacity>

              <TouchableOpacity>
                <Ionicons name="trash-outline" size={18} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ✅ ADD EVENT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Event</Text>

            <TextInput
              placeholder="Event Title"
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              placeholder="Date"
              style={styles.input}
              value={newDate}
              onChangeText={setNewDate}
            />

            <TextInput
              placeholder="Location"
              style={styles.input}
              value={newLocation}
              onChangeText={setNewLocation}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={addEvent}>
              <Text style={styles.saveText}>Save Event</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  body: {
    backgroundColor: "#f4f6fb",
    padding: 14,
    paddingBottom: 80,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF0FA",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
  },

  desc: {
    fontSize: 12,
    color: "#888",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 14,
    padding: 16,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
  },

  cancelText: {
    textAlign: "center",
    marginTop: 10,
    color: "#888",
  },
});