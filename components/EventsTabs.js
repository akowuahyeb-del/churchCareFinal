import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StableEventModal from "../components/StableEventModal";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";   

export default function EventsTabs({
  events,
  program,
  preachers,
  setProgram     // ✅ important (comes from HomeScreen)
}) {

  const [activeTab, setActiveTab] = useState("events");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <View style={styles.container}>

      {/* ✅ TAB HEADER */}
      <View style={styles.tabRow}>
        {[
          { key: "events", label: "Upcoming", icon: "calendar-outline" },
          { key: "program", label: "Program", icon: "list-outline" },
          { key: "preachers", label: "Preachers", icon: "person-outline" }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? "#fff" : "#777"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ✅ CONTENT */}
      <View style={{ marginTop: 10 }}>

        {/* ── UPCOMING EVENTS ── */}
        {activeTab === "events" && (
          <>
            {events.map(ev => (
              <TouchableOpacity
                key={ev.id}
                style={styles.card}
                onPress={() => {
                  setSelectedItem({ id: ev.id, title: ev.title, date: ev.date });
                  setModalVisible(true);
                }}
              >
                <Text style={styles.title}>{ev.title}</Text>
                <Text style={styles.sub}>{ev.date}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── PROGRAM ── */}
        {activeTab === "program" && (
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedItem({ title: "", date: null });
                setModalVisible(true);
              }}
            >
              <Text style={{ color: "#4B3F72", fontWeight: "700" }}>
                + Add Program Item
              </Text>
            </TouchableOpacity>

            {program.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => {
                  setSelectedItem(item);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.title}>{item.title || item.item}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── PREACHERS (UNCHANGED) ── */}
        {activeTab === "preachers" && (
          <>
            {preachers.map(p => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.title}>{p.name}</Text>
                <Text style={styles.sub}>{p.topic}</Text>
              </View>
            ))}
          </>
        )}

      </View>

      {/* ✅ ✅ STABLE MODAL HERE (IMPORTANT POSITION) */}
      <StableEventModal
  visible={modalVisible}
  data={selectedItem || {}}
  setData={setSelectedItem}
  onClose={() => setModalVisible(false)}

  onSave={async () => {
    if (!selectedItem || !setProgram) return;

    let updated;

    // ✅ EDIT existing item
if (selectedItem?.id && program.some(p => p.id === selectedItem.id)) {
  updated = program.map(p =>
    p.id === selectedItem.id
      ? {
          id: selectedItem.id,                        // ✅ FIXED
          title: selectedItem.title || "",
          date: selectedItem.date || null,
          session: selectedItem.session || ""        // ✅ session-aware
        }
      : p
  );
}
    // ✅ ADD new item
    else {
      updated = [
        ...program,
        {
          id: Date.now().toString(),
          title: selectedItem.title || "",
          date: selectedItem.date || null,
        },
      ];
    }

    setProgram(updated);        // ✅ goes to HomeScreen → Firestore
    setModalVisible(false);     // ✅ CLOSE modal
  }}

  onDelete={async () => {
    if (!selectedItem || !setProgram) return;

    const updated = program.filter(p => p.id !== selectedItem.id);

    setProgram(updated);        // ✅ persist delete
    setModalVisible(false);     // ✅ CLOSE modal
  }}
/>


    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 12,
  },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderRadius: 12,
    padding: 4,
  },

  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 5,
  },

  activeTab: {
    backgroundColor: "#4B3F72",
    borderRadius: 10,
  },

  tabText: {
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
  },

  activeTabText: {
    color: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },

  title: {
    fontWeight: "700",
    fontSize: 14,
    color: "#222"
  },

  sub: {
    fontSize: 12,
    color: "#777"
  }
});