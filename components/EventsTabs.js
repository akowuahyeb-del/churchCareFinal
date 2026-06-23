// EventsTabs.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StableEventModal from "../components/StableEventModal";

export default function EventsTabs({
  events = [],
  program = [],
  preachers = [],
  setProgram,
  onAddPreacher,
  onEditPreacher
}) {
  const [activeTab, setActiveTab] = useState("events");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ✅ ACTIVE SESSION (temporary)
  const [activeSession, setActiveSession] = useState("First Service");

  // ✅ FILTER PREACHERS BY SESSION
  const sessionPreachers = Array.isArray(preachers)
    ? preachers.filter(p => p.session?.name === activeSession)
    : [];

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

      <View style={{ marginTop: 10 }}>

        {/* ── EVENTS ── */}
        {activeTab === "events" && (
          <>
            {events.map(ev => (
              <View key={ev.id} style={styles.card}>
                <Text style={styles.title}>{ev.title}</Text>
                <Text style={styles.sub}>{ev.date}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── PROGRAM ── */}
        {activeTab === "program" && (
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedItem({
                  id: null,
                  title: "",
                  date: null,
                  session: activeSession,
                  preacherId: null
                });
                setModalVisible(true);
              }}
            >
              <Text style={{ color: "#4B3F72", fontWeight: "700" }}>
                + Add Program Item
              </Text>
            </TouchableOpacity>

            <Text style={styles.sessionHeader}>{activeSession}</Text>

            {program
              .filter(item => item.session === activeSession)
              .map(item => {
                const linkedPreacher = preachers.find(
                  p => p.id === item.preacherId
                );

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => {
                      setSelectedItem(item);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.title}>{item.title}</Text>
                    {linkedPreacher ? (
                      <Text style={styles.sub}>
                        {linkedPreacher.name} • {linkedPreacher.topic}
                      </Text>
                    ) : (
                      <Text style={styles.unassigned}>
                        No preacher assigned
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
          </>
        )}

        {/* ── PREACHERS ── */}
        {activeTab === "preachers" && (
          <>
            <Text style={styles.sessionHeader}>{activeSession}</Text>

            {/* ✅ ADD PREACHER BUTTON */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                console.log("🔥 Add Preacher Clicked");
                onAddPreacher && onAddPreacher();
              }}
            >
              <Text style={{ color: "#4B3F72", fontWeight: "700" }}>
                + Add Preacher
              </Text>
            </TouchableOpacity>

            {/* ✅ LIST */}
            {sessionPreachers.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => {
                  console.log("🔥 Edit Preacher Clicked");
                  onEditPreacher && onEditPreacher(p);
                }}
              >
                <Text style={styles.title}>{p.name}</Text>
                <Text style={styles.sub}>{p.topic}</Text>
              </TouchableOpacity>
            ))}

            {sessionPreachers.length === 0 && (
              <Text style={{ color: "#aaa", marginLeft: 4 }}>
                No preacher for this session
              </Text>
            )}
          </>
        )}

      </View>

      {/* ✅ PROGRAM MODAL */}
      <StableEventModal
        visible={modalVisible}
        data={selectedItem || {}}
        setData={setSelectedItem}
        onClose={() => setModalVisible(false)}
        preachers={sessionPreachers}
        requirePreacher
        title="Program Item"
        onSave={() => {
          if (!selectedItem) return;

          const cleanItem = {
            id: selectedItem?.id || Date.now().toString(),
            title: selectedItem.title || "",
            date: selectedItem.date || null,
            session: selectedItem.session || activeSession,
            notes: selectedItem.notes || "",
            preacherId: selectedItem.preacherId || null,
            time: selectedItem.time || ""
          };

          let updated;

          if (program.some(p => p.id === selectedItem?.id)) {
            updated = program.map(p =>
              p.id === selectedItem.id ? cleanItem : p
            );
          } else {
            updated = [...program, cleanItem];
          }

          setProgram(updated);
          setModalVisible(false);
        }}
        onDelete={() => {
          if (!selectedItem?.id) return;
          setProgram(program.filter(p => p.id !== selectedItem.id));
          setModalVisible(false);
        }}
      />
    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 12
  },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderRadius: 12,
    padding: 4
  },

  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 5
  },

  activeTab: {
    backgroundColor: "#4B3F72",
    borderRadius: 10
  },

  tabText: {
    fontSize: 12,
    color: "#777",
    fontWeight: "700"
  },

  activeTabText: {
    color: "#fff"
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8
  },

  title: {
    fontWeight: "700",
    fontSize: 14,
    color: "#222"
  },

  sub: {
    fontSize: 12,
    color: "#777"
  },

  unassigned: {
    fontSize: 12,
    color: "#aaa",
    fontStyle: "italic"
  },

  sessionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B3F72",
    marginBottom: 6,
    marginLeft: 4,
    marginTop: 10
  }
});