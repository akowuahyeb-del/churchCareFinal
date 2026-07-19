// EventsTabs.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgramModal from "./ProgramModal";
import { DEFAULT_SESSION, sessionsMatch } from "../constants/sessions";
import AppText from "./AppText";

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
  const [editModalVisible, setEditModalVisible] = useState(false);
const [editingSession, setEditingSession] = useState(null);
const [sessionNameInput, setSessionNameInput] = useState("");

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

const [sessions, setSessions] = useState([
  { id: "first-service", name: "First Service" },
  { id: "second-service", name: "Second Service" }
]);
// ✅ PROGRAMMATIC SESSION CREATOR
const addSession = (name) => {
  const trimmed = name.trim();
  if (!trimmed) return;

  const exists = sessions.some(
    s => s.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (exists) return;

  const newSession = {
    id: Date.now().toString(),
    name: trimmed
  };

  setSessions(prev => [...prev, newSession]);
};


  return (
    <View style={styles.container}>
     
{/* ✅ TAB HEADER */}
<View style={styles.tabRow}>
  {[
  { key: "events", label: "Upcoming", icon: "calendar-outline" },
  { key: "program", label: "Program", icon: "list-outline" },
  { key: "preachers", label: "Preachers", icon: "person-outline" },
].map(t => (
    <TouchableOpacity
      key={t.key}
      style={[styles.tab, activeTab === t.key && styles.activeTab]}
      onPress={() => setActiveTab(t.key)}
    >
      <Ionicons
  name={t.icon}
  size={18}
  color={activeTab === t.key ? "#fff" : "#667085"}
/>

<AppText
  allowFontScaling={false}
  style={[
    styles.tabText,
    activeTab === t.key && styles.activeTabText
  ]}
>
  {t.label}
</AppText>

    </TouchableOpacity>
  ))}
</View>




 {/* ✅ SESSION SWITCHER WITH EDIT + DELETE */}
{showSessionSwitcher && (
  <View style={styles.sessionSwitchRow}>
    {sessions.map(s => {
      const active = sessionsMatch(activeSession, s);

      return (
        <View key={s.id} style={{ flexDirection: "row", alignItems: "center" }}>

          {/* ✅ SELECT SESSION */}
          <TouchableOpacity
            style={[styles.sessionChip, active && styles.sessionChipActive]}
            onPress={() => setActiveSession(s)}
            onLongPress={() => {
              setEditingSession(s);
              setSessionNameInput(s.name);
              setEditModalVisible(true);
            }}
          >
            <Text style={[styles.sessionChipText, active && styles.sessionChipTextActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>

          {/* ✅ DELETE */}
          <TouchableOpacity
            onPress={() => {
              setSessions(prev => prev.filter(item => item.id !== s.id));

              if (activeSession.id === s.id && sessions.length > 1) {
                setActiveSession(sessions[0]);
              }
            }}
            style={{ marginLeft: 4 }}
          >
            <Ionicons name="close-circle" size={16} color="#E11D48" />
          </TouchableOpacity>

        </View>
      );
    })}

    {/* ✅ ADD SESSION */}
    <TouchableOpacity
      style={[styles.sessionChip, { backgroundColor: "#ddd" }]}
      onPress={() => {
        setEditingSession(null);
        setSessionNameInput("");
        setEditModalVisible(true);
      }}
    >
      <Text style={{ fontSize: 11 }}>+ Add</Text>
    </TouchableOpacity>
  </View>
)}

{/* ✅ CONTENT CONTAINER */}
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

{/* ✅ EDIT SESSION MODAL */}
<Modal visible={editModalVisible} transparent animationType="fade">
  <View style={{
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  }}>
    <View style={{
      width: "80%",
      backgroundColor: "#fff",
      padding: 16,
      borderRadius: 12
    }}>

      <Text style={{ fontWeight: "800", marginBottom: 10 }}>
        Edit Session
      </Text>

      <TextInput
        value={sessionNameInput}
        onChangeText={setSessionNameInput}
        placeholder="Session name"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 8,
          padding: 10,
          marginBottom: 12
        }}
      />

      <TouchableOpacity
        style={{
          backgroundColor: "#4B3F72",
          padding: 12,
          borderRadius: 8,
          marginBottom: 8
        }}
        onPress={() => {
          const name = sessionNameInput.trim();
          if (!name) return;

         if (editingSession) {
  // ✅ EDIT
  setSessions(prev =>
    prev.map(item =>
      item.id === editingSession.id
        ? { ...item, name }
        : item
    )
  );
} else {
  // ✅ ADD USING FUNCTION
  addSession(name);
}


          setEditModalVisible(false);
          setEditingSession(null);
          setSessionNameInput("");
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Save
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setEditModalVisible(false)}>
        <Text style={{ textAlign: "center", color: "#888" }}>
          Cancel
        </Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>

</View>
);
}   // ✅ THIS WAS MISSING


/* ✅ STYLES */
const styles = StyleSheet.create({
  container: { marginHorizontal: 14, marginTop: 12 },


tabRow: {
  flexDirection: "row",
  alignItems: "center",

  backgroundColor: "#F0F1F3",
  borderRadius: 10,      // ✅ full pill

  padding: 6,

  marginBottom: 8,
},


tab: {
  flex: 1,

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",

  paddingVertical: 14,
  borderRadius: 999,
},



activeTab: {
  backgroundColor: "#4B5663", // ✅ same style as screenshot

  borderRadius: 10,

  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
},






tab: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 10,
},




activeTab: {
  backgroundColor: "#4B3F72",
  borderRadius: 10,
},

// Add flexShrink: 1 to the Text, and numberOfLines to prevent silent clipping

tabText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#667085",
  marginLeft: 6,
},

activeTabText: {
  color: "#FFFFFF",
  fontWeight: "700",
},




activeTabText: {
  color: "#FFFFFF",
  fontWeight: "700",
},


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
  },
 
});