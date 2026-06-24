// EventsTabs.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgramModal from "./ProgramModal";
import { SESSIONS, DEFAULT_SESSION, sessionsMatch } from "../constants/sessions";

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

  // ✅ Real switcher now, backed by the shared SESSIONS list
  const [activeSession, setActiveSession] = useState(DEFAULT_SESSION);

  // ✅ Only preachers belonging to the session you're currently viewing
  const sessionPreachers = Array.isArray(preachers)
    ? preachers.filter(p => sessionsMatch(p.session, activeSession))
    : [];

  // ✅ Only program items belonging to the session you're currently viewing
  const sessionProgram = Array.isArray(program)
    ? program.filter(item => sessionsMatch(item.session, activeSession))
    : [];

  const showSessionSwitcher = activeTab === "program" || activeTab === "preachers";

  return (
    <View style={styles.container}>

      {/* ✅ TAB HEADER */}
      <View style={styles.tabRow}>
        {[
          { key: "events", label: "Upcoming", icon: "calendar-outline" },
          { key: "program", label: "Program", icon: "list-outline" },
          { key: "preachers", label: "Preachers", icon: "person-outline" }
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.activeTab]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons
              name={t.icon}
              size={14}
              color={activeTab === t.key ? "#fff" : "#777"}
            />
            <Text style={[styles.tabText, activeTab === t.key && styles.activeTabText]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ✅ SESSION SWITCHER — only where session actually matters */}
      {showSessionSwitcher && (
        <View style={styles.sessionSwitchRow}>
          {SESSIONS.map(s => {
            const active = sessionsMatch(activeSession, s);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.sessionChip, active && styles.sessionChipActive]}
                onPress={() => setActiveSession(s)}
              >
                <Text style={[styles.sessionChipText, active && styles.sessionChipTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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
            {events.length === 0 && (
              <Text style={styles.emptyText}>No upcoming events</Text>
            )}
          </>
        )}

        {/* ── PROGRAM (session-scoped + preacher-linked) ── */}
        {activeTab === "program" && (
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedItem({}); // empty = "new" to ProgramModal
                setModalVisible(true);
              }}
            >
              <Text style={{ color: "#4B3F72", fontWeight: "700" }}>
                + Add Program Item
              </Text>
            </TouchableOpacity>

            <Text style={styles.sessionHeader}>{activeSession.name}</Text>

            {sessionProgram.map(item => {
              const linkedPreacher = preachers.find(p => p.id === item.preacherId);

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
                    <Text style={styles.unassigned}>No preacher assigned</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {sessionProgram.length === 0 && (
              <Text style={styles.emptyText}>
                No program for {activeSession.name}
              </Text>
            )}
          </>
        )}

        {/* ── PREACHERS (session-scoped) ── */}
        {activeTab === "preachers" && (
          <>
            <Text style={styles.sessionHeader}>{activeSession.name}</Text>

            <TouchableOpacity
              style={styles.card}
              onPress={() => onAddPreacher && onAddPreacher(activeSession)}
            >
              <Text style={{ color: "#4B3F72", fontWeight: "700" }}>
                + Add Preacher
              </Text>
            </TouchableOpacity>

            {sessionPreachers.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => onEditPreacher && onEditPreacher(p)}
              >
                <Text style={styles.title}>{p.name}</Text>
                <Text style={styles.sub}>{p.topic}</Text>
              </TouchableOpacity>
            ))}

            {sessionPreachers.length === 0 && (
              <Text style={styles.emptyText}>
                No preacher for {activeSession.name}
              </Text>
            )}
          </>
        )}

      </View>

      {/* ✅ PROGRAM MODAL */}
      <ProgramModal
        visible={modalVisible}
        initialData={selectedItem || {}}
        onClose={() => setModalVisible(false)}
        preachers={sessionPreachers}
        activeSession={activeSession}
        onSave={(itemObject) => {
          const exists = program.some(p => p.id === itemObject.id);
          const updated = exists
            ? program.map(p => (p.id === itemObject.id ? itemObject : p))
            : [...program, itemObject];

          setProgram(updated);
          setModalVisible(false);
        }}
        onDelete={(id) => {
          setProgram(program.filter(p => p.id !== id));
          setModalVisible(false);
        }}
      />
    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({
  container: { marginHorizontal: 14, marginTop: 12 },

  tabRow: { flexDirection: "row", backgroundColor: "#eee", borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: "row", justifyContent: "center", paddingVertical: 10, gap: 5 },
  activeTab: { backgroundColor: "#4B3F72", borderRadius: 10 },
  tabText: { fontSize: 12, color: "#777", fontWeight: "700" },
  activeTabText: { color: "#fff" },

  sessionSwitchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  sessionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#eee"
  },
  sessionChipActive: { backgroundColor: "#4B3F72" },
  sessionChipText: { fontSize: 11, color: "#555", fontWeight: "700" },
  sessionChipTextActive: { color: "#fff" },

  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8 },
  title: { fontWeight: "700", fontSize: 14, color: "#222" },
  sub: { fontSize: 12, color: "#777" },
  unassigned: { fontSize: 12, color: "#aaa", fontStyle: "italic" },
  emptyText: { color: "#aaa", marginLeft: 4 },

  sessionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B3F72",
    marginBottom: 6,
    marginLeft: 4,
    marginTop: 10
  }
});