// screens/GroupAttendanceScreen.js
//
// ✅ Entirely separate from the general attendance flow. Group sessions
// write to a dedicated `group_sessions` collection, and attendance
// records are tagged with `sessionScope: "group"` + `groupId` so they
// never contaminate general membership absence calculations.

import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, onSnapshot, deleteDoc
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";

export default function GroupAttendanceScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // ✅ Can be opened from a group's page with the group pre-selected,
  // or from AttendanceScreen's group mode with no pre-selection.
  const preselectedGroup = route?.params?.group || null;

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;

  const [attendanceAreas, setAttendanceAreas] =
  useState([]);

  const [selectedGroup,  setSelectedGroup]  = useState(preselectedGroup);
  const [groupMembers,   setGroupMembers]   = useState([]);
  const [attendance,     setAttendance]     = useState({});
  const [sessionId,      setSessionId]      = useState(null);
  const [sessionActive,  setSessionActive]  = useState(false);
  const [sessionNote,    setSessionNote]    = useState("");
  const [search,         setSearch]         = useState("");
  const [saving,         setSaving]         = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [sessionModal,   setSessionModal]   = useState(false);
  const [sessionPurpose, setSessionPurpose] = useState("Rehearsal");
  const [startTime,      setStartTime]      = useState("");

  const pendingRef  = useRef(new Set());
  const attendanceUnsubRef = useRef(null);

  const today = new Date().toISOString().split("T")[0];

  const SESSION_PURPOSES = ["Rehearsal", "Practice", "Meeting", "Prayer", "Training", "Workshop", "Other"];

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(d => {
      if (d) { try { setActiveEntity(JSON.parse(d)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;
    loadGroups();
  }, [organizationId, entityId]);

  useEffect(() => {
    if (!selectedGroup || !organizationId || !entityId) return;
    loadGroupMembers(selectedGroup);
  }, [selectedGroup, organizationId, entityId]);

  useEffect(() => {
    if (!sessionId || !organizationId || !entityId) return;
    startAttendanceListener();
    return () => { if (attendanceUnsubRef.current) attendanceUnsubRef.current(); };
  }, [sessionId]);

  const loadGroups = async () => {
  setLoading(true);

  try {
    const snap = await getDocs(
      collection(
        db,
        "organizations",
        organizationId,
        "ministries"
      )
    );

    const ministries = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        entityType: "ministry",
      }))
      .filter(
        (item) => item.active !== false
      );

    console.log(
      "MINISTRIES LOADED:",
      ministries.length
    );

    console.log(
      "MINISTRIES:",
      ministries
    );

    setAttendanceAreas(
      ministries
    );

  } catch (e) {

    console.log(
      "❌ loadGroups:",
      e
    );

  } finally {

    setLoading(false);

  }
};

 const loadGroupMembers = async (group) => {
  setLoading(true);

  try {
    const snap = await getDocs(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "members"
      )
    );

    const all = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const ministryName =
      (group?.name || "")
        .trim()
        .toLowerCase();

    const inGroup = all.filter(
      (member) =>
        (member?.ministry || "")
          .trim()
          .toLowerCase() ===
        ministryName
    );

    console.log(
      "GROUP:",
      group?.name
    );

    console.log(
      "MEMBERS FOUND:",
      inGroup.length
    );

    setGroupMembers(inGroup);

  } catch (e) {

    console.log(
      "❌ loadGroupMembers:",
      e
    );

  } finally {

    setLoading(false);

  }
};

  const startAttendanceListener = () => {
    if (attendanceUnsubRef.current) attendanceUnsubRef.current();
    const q = query(
      collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
      where("sessionId", "==", sessionId),
      where("sessionScope", "==", "group")
    );
    attendanceUnsubRef.current = onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const x = d.data();
        map[x.memberId] = { id: d.id, status: x.status, time: x.timestamp };
      });
      setAttendance(map);
    });
  };

 const startSession = async () => {
  if (!selectedGroup || !startTime) {
    Alert.alert(
      "Required",
      "Select a group and set start time."
    );
    return;
  }

  try {
    const ref = await addDoc(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "group_sessions"
      ),
      {
        groupId: selectedGroup.id,

        groupName: selectedGroup.name,

        attendanceEntityId:
          selectedGroup.id,

        attendanceEntityName:
          selectedGroup.name,

        attendanceEntityType:
          selectedGroup.entityType ||
          "group",

        date: today,

        purpose: sessionPurpose,

        startTime: startTime,

        status: "open",

        sessionScope: "group",

        entityId: entityId,

        organizationId: organizationId,

        totalMembers:
          groupMembers.length,

        createdAt:
          new Date().toISOString(),
      }
    );

    setSessionId(ref.id);

    setSessionActive(true);

    setSessionModal(false);

    Alert.alert(
      "✅ Session Started",
      `${selectedGroup.name} ${sessionPurpose} session is live.`
    );

  } catch (e) {

    console.log(
      "❌ startGroupSession:",
      e
    );

    Alert.alert(
      "Error",
      "Could not start session."
    );
  }
};

  const endSession = async () => {
    const present = groupMembers.filter(m => attendance[m.id]?.status === "present").length;
    const absent  = groupMembers.length - present;
    const rate    = groupMembers.length > 0 ? Math.round((present / groupMembers.length) * 100) : 0;

    Alert.alert(
      "End Group Session?",
      `${present} of ${groupMembers.length} members present (${rate}%).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          onPress: async () => {
            try {
              await updateDoc(
                doc(db, "organizations", organizationId, "entities", entityId, "group_sessions", sessionId),
                {
                  status:       "ended",
                  endedAt:      new Date().toISOString(),
                  finalPresent: present,
                  finalAbsent:  absent,
                  finalRate:    rate,
                  note:         sessionNote,
                }
              );
              if (attendanceUnsubRef.current) attendanceUnsubRef.current();
              setSessionActive(false);
              setSessionId(null);
              setAttendance({});
            } catch (e) {
              Alert.alert("Error", "Could not end session.");
            }
          }
        }
      ]
    );
  };

  const toggleAttendance = async (member, status) => {
    if (!sessionId) { Alert.alert("No Session", "Start a session first."); return; }
    if (pendingRef.current.has(member.id)) return;
    pendingRef.current.add(member.id);

    try {
      const existing = attendance[member.id];
      if (existing?.status === status) return;

      if (existing) {
        await deleteDoc(
          doc(db, "organizations", organizationId, "entities", entityId, "attendance", existing.id)
        );
      }

      await addDoc(
        collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
        {
          memberId:     member.id,
          memberCode:   member.memberCode || "",
          name:         member.name,
          sessionId,
          sessionScope: "group",      // ✅ The critical tag — marks this as group-only
          groupId: selectedGroup.id,
groupName: selectedGroup.name,

attendanceEntityId:
  selectedGroup.id,

attendanceEntityName:
  selectedGroup.name,

attendanceEntityType:
  selectedGroup.entityType ||
  "ministry",
          date:         today,
          status,
          method:       "manual",
          timestamp:    new Date().toISOString(),
          entityId,
          organizationId,
        }
      );
    } finally {
      pendingRef.current.delete(member.id);
    }
  };

  // ✅ Derived stats — only group members count
  const presentCount = groupMembers.filter(m => attendance[m.id]?.status === "present").length;
  const absentCount  = groupMembers.length - presentCount;
  const rate         = groupMembers.length > 0 ? Math.round((presentCount / groupMembers.length) * 100) : 0;

  const filtered = groupMembers.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedGroup) {
    return (
      <View style={styles.container}>
        <AppHeader title="Group Attendance" subtitle="Select a group to begin"
          showBack onBack={() => navigation.goBack()} />
        <ScrollViewPlaceholder>
          <Text style={styles.pickLabel}>Select Group</Text>
          {loading ? <ActivityIndicator color="#4B3F72" /> : (
            attendanceAreas.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color="#ddd" />
                <Text style={styles.emptyText}>No groups created yet</Text>
              </View>
            ) : (
              attendanceAreas.map(g => (

                <TouchableOpacity key={g.id} style={styles.groupOption}
                  onPress={() => setSelectedGroup(g)}>
                  <View style={[styles.groupIcon, { backgroundColor: (g.color || "#4B3F72") + "20" }]}>
                    <Ionicons name={g.icon || "people-outline"} size={18} color={g.color || "#4B3F72"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupOptionName}>{g.name}</Text>
                    <Text style={styles.groupOptionSub}>
                      {g.memberCount || "?"} members · {g.category || "Group"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </TouchableOpacity>
              ))
            )
          )}
        </ScrollViewPlaceholder>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={selectedGroup.name}
        subtitle={`Group Attendance · ${sessionPurpose}`}
        showBack
        onBack={() => {
          if (sessionActive) {
            Alert.alert("Session Active", "End the session before leaving.");
            return;
          }
          setSelectedGroup(null);
          setGroupMembers([]);
          setAttendance({});
        }}
      />

      {/* SESSION BAR */}
      {sessionActive ? (
        <View style={styles.sessionBar}>
          <View style={styles.sessionBarLeft}>
            <View style={styles.sessionDot} />
            <Text style={styles.sessionBarText}>Live · {startTime}</Text>
          </View>
          <TouchableOpacity style={styles.endBtn} onPress={endSession}>
            <Ionicons name="stop-circle-outline" size={13} color="#fff" />
            <Text style={styles.endBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.startBtn} onPress={() => setSessionModal(true)}>
          <Ionicons name="play-circle-outline" size={16} color="#fff" />
          <Text style={styles.startBtnText}>Start {selectedGroup.name} Session</Text>
        </TouchableOpacity>
      )}

      {/* STATS */}
      <View style={styles.statsRow}>
        <MiniStat label="Present" value={presentCount} color="#27ae60" />
        <MiniStat label="Absent" value={absentCount} color="#e74c3c" />
        <MiniStat label="Rate" value={`${rate}%`} color="#4B3F72" />
        <MiniStat label="Group Size" value={groupMembers.length} color="#888" />
      </View>

      {/* IMPORTANT NOTICE */}
      <View style={styles.scopeNotice}>
        <Ionicons name="shield-checkmark-outline" size={12} color="#27ae60" />
        <Text style={styles.scopeNoticeText}>
          Only {selectedGroup.name} members appear here.
          Non-members are not counted as absent.
        </Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={14} color="#aaa" />
        <TextInput style={styles.searchInput} placeholder="Search members…"
          value={search} onChangeText={setSearch} />
      </View>

      {/* MEMBER LIST */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const status = attendance[item.id]?.status;
          const isPending = pendingRef.current.has(item.id);
          return (
            <View style={[styles.memberRow,
              status === "present" && styles.memberRowPresent,
              status === "absent"  && styles.memberRowAbsent]}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {(item.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberSub}>{item.role || item.ministry || ""}</Text>
              </View>
              <TouchableOpacity
                style={[styles.markBtn, { backgroundColor: status === "present" ? "#27ae60" : "#ddd" }]}
                disabled={isPending || !sessionActive}
                onPress={() => toggleAttendance(item, "present")}
              >
                {isPending ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.markBtn, { backgroundColor: status === "absent" ? "#e74c3c" : "#ddd", marginLeft: 4 }]}
                disabled={isPending || !sessionActive}
                onPress={() => toggleAttendance(item, "absent")}
              >
                {isPending ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="close" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>
              {groupMembers.length === 0
                ? "No members in this group yet. Add members to the group first."
                : "No members match your search."}
            </Text>
          </View>
        )}
      />

      {/* SESSION START MODAL */}
      <Modal visible={sessionModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Start {selectedGroup.name} Session</Text>
            <Text style={styles.fieldLabel}>Purpose</Text>
            <View style={styles.chipRow}>
              {SESSION_PURPOSES.map(p => (
                <TouchableOpacity key={p}
                  style={[styles.chip, sessionPurpose === p && styles.chipActive]}
                  onPress={() => setSessionPurpose(p)}>
                  <Text style={[styles.chipText, sessionPurpose === p && { color: "#fff" }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Start Time</Text>
            <TextInput style={styles.input} value={startTime} onChangeText={setStartTime}
              placeholder="e.g. 3:00 PM" />
            <View style={styles.infoBox}>
              <Ionicons name="people-outline" size={12} color="#4B3F72" />
              <Text style={styles.infoBoxText}>
                {groupMembers.length} members will appear on this register.
                This session is completely separate from general church attendance.
              </Text>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={startSession}>
                <Text style={styles.white}>Start Session</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSessionModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

// Simple scroll wrapper for the group picker view
function ScrollViewPlaceholder({ children }) {
  const { ScrollView } = require("react-native");
  return <ScrollView contentContainerStyle={{ padding: 14 }}>{children}</ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  pickLabel: { fontSize: 13, fontWeight: "800", color: "#555", textTransform: "uppercase", marginBottom: 10 },
  groupOption: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  groupIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  groupOptionName: { fontSize: 14, fontWeight: "700", color: "#222" },
  groupOptionSub: { fontSize: 11, color: "#888", marginTop: 2 },
  sessionBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  sessionBarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#27ae60" },
  sessionBarText: { fontSize: 12, fontWeight: "700", color: "#333" },
  endBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e74c3c", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  endBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4B3F72", margin: 12, padding: 13, borderRadius: 12 },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  statsRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  miniStat: { flex: 1, alignItems: "center", paddingVertical: 10 },
  miniStatValue: { fontSize: 18, fontWeight: "900" },
  miniStatLabel: { fontSize: 9, color: "#aaa", fontWeight: "700", textTransform: "uppercase", marginTop: 1 },
  scopeNotice: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#e8f8f0", paddingHorizontal: 14, paddingVertical: 7 },
  scopeNoticeText: { fontSize: 11, color: "#27ae60", fontWeight: "600" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", marginHorizontal: 12, marginTop: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, elevation: 1 },
  searchInput: { flex: 1, fontSize: 13 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 4 },
  memberRowPresent: { borderLeftWidth: 3, borderLeftColor: "#27ae60" },
  memberRowAbsent: { borderLeftWidth: 3, borderLeftColor: "#e74c3c" },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 12, fontWeight: "800", color: "#4B3F72" },
  memberName: { fontSize: 13, fontWeight: "700", color: "#222" },
  memberSub: { fontSize: 11, color: "#aaa", marginTop: 1 },
  markBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13, textAlign: "center", maxWidth: 260 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#222", marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0" },
  chipActive: { backgroundColor: "#4B3F72" },
  chipText: { fontSize: 11, color: "#555", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 6 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 10, marginTop: 8 },
  infoBoxText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },
  modalBtnRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  modalSaveBtn: { flex: 1, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  modalCancelBtn: { flex: 1, backgroundColor: "#aaa", padding: 12, borderRadius: 10, alignItems: "center" },
  white: { color: "#fff", fontWeight: "700" },
});