// EventsTabs.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StableEventModal from "../components/StableEventModal";

export default function EventsTabs({
  events,
  program,
  preachers,
  setProgram
}) {
  const [activeTab, setActiveTab] = useState("events");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [localPreachers, setLocalPreachers] = useState(preachers || []);

  // ✅ ACTIVE SESSION (for testing)
  const [activeSession, setActiveSession] = useState("First Service");

  // ✅ PREACHERS AVAILABLE FOR THE CURRENT SESSION ONLY
  const sessionPreachers = (p => p.session === activeSession);

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

        {/* ── PROGRAM (SESSION FILTERED + PREACHER LINKED) ── */}
        {activeTab === "program" && (
          <>
            {/* ✅ ADD BUTTON */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedItem({
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

            {/* ✅ ACTIVE SESSION */}
            <Text style={styles.sessionHeader}>
              {activeSession}
            </Text>

            {/* ✅ FILTERED PROGRAM */}
            {program
              .filter(item => item.session === activeSession)
              .map(item => {
                const linkedPreacher = localPreachers.find(
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

            {/* ✅ EMPTY STATE */}
            {program.filter(item => item.session === activeSession).length === 0 && (
              <Text style={{ color: "#aaa", marginLeft: 4 }}>
                No program for this session
              </Text>
            )}
          </>
        )}

        {/* ── PREACHERS (SESSION FILTERED) ── */}
        {activeTab === "preachers" && (
          <>
            <Text style={styles.sessionHeader}>
              {activeSession}
            </Text>

            {sessionPreachers.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => {
                  setSelectedItem(p);
                  setModalVisible(true);
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

      {/* ✅ MODAL (PROGRAM ITEMS) */}
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

          // ✅ ALWAYS BUILD CLEAN ITEM (IMPORTANT)
          const cleanItem = {
            id: selectedItem.id || Date.now().toString(),
            title: selectedItem.title || "",
            date: selectedItem.date || null,
            session: selectedItem.session || activeSession,
            notes: selectedItem.notes || "",
            preacherId: selectedItem.preacherId || null, // ✅ REAL LINK TO PREACHER
            time: selectedItem.time || ""
          };

          let updated;

          // ✅ EDIT EXISTING
          if (
            selectedItem?.id &&
            program.some(p => p.id === selectedItem.id)
          ) {
            updated = program.map(p =>
              p.id === selectedItem.id ? cleanItem : p
            );
          }
          // ✅ ADD NEW
          else {
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