// screens/ConcurrentSessionsScreen.js
//
// ✅ Shows all currently open sessions across this entity — main
// service, youth service, and any concurrent meetings — simultaneously.
// Accessible from AttendanceScreen's header. Each live session card
// is a tap-through to that session's full attendance view.

import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot, updateDoc, doc
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";

export default function ConcurrentSessionsScreen() {
  const navigation = useNavigation();
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;

  const [liveSessions,  setLiveSessions]  = useState([]);
  const [groupSessions, setGroupSessions] = useState([]);
  const [loading,       setLoading]       = useState(true);

  const generalUnsubRef = useRef(null);
  const groupUnsubRef   = useRef(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(d => {
      if (d) { try { setActiveEntity(JSON.parse(d)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;

    // ✅ Watch ALL open sessions in real time — both general and group
    const q1 = query(
      collection(db, "organizations", organizationId, "entities", entityId, "sessions"),
      where("date", "==", today),
      where("status", "in", ["open", "extended"])
    );
    generalUnsubRef.current = onSnapshot(q1, snap => {
      setLiveSessions(snap.docs.map(d => ({ id: d.id, ...d.data(), sessionType: "general" })));
      setLoading(false);
    });

    const q2 = query(
      collection(db, "organizations", organizationId, "entities", entityId, "group_sessions"),
      where("date", "==", today),
      where("status", "==", "open")
    );
    groupUnsubRef.current = onSnapshot(q2, snap => {
      setGroupSessions(snap.docs.map(d => ({ id: d.id, ...d.data(), sessionType: "group" })));
    });

    return () => {
      if (generalUnsubRef.current) generalUnsubRef.current();
      if (groupUnsubRef.current) groupUnsubRef.current();
    };
  }, [organizationId, entityId, today]);

  const allLive = [...liveSessions, ...groupSessions];

  const endSession = async (session) => {
    Alert.alert(`End "${session.service || session.groupName}?"`, "This locks attendance.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          const coll = session.sessionType === "group" ? "group_sessions" : "sessions";
          await updateDoc(
            doc(db, "organizations", organizationId, "entities", entityId, coll, session.id),
            { status: "ended", endedAt: new Date().toISOString() }
          );
        }
      }
    ]);
  };

 const resumeSession = (session) => {
  navigation.navigate("MainTabs", {
    screen: "Attendance",
    params: {
      resumeSessionId: session.id,
      resumeEntityId: entityId,
    },
  });
};

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#4B3F72" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Live Sessions"
        subtitle={`${allLive.length} session${allLive.length !== 1 ? "s" : ""} running today`}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.body}>

        {allLive.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Live Sessions</Text>
            <Text style={styles.emptyText}>
              Start a session from Attendance to see it here. Multiple concurrent sessions will all appear in this list simultaneously.
            </Text>
          </View>
        ) : (
          <>
            {/* OVERVIEW BANNER */}
            <View style={styles.overviewBanner}>
              <Ionicons name="pulse-outline" size={16} color="#4B3F72" />
              <Text style={styles.overviewText}>
                <Text style={{ fontWeight: "800" }}>{allLive.length} concurrent session{allLive.length > 1 ? "s" : ""}</Text> happening right now.
                Each is completely independent — attendance is tracked separately with no cross-contamination.
              </Text>
            </View>

            {/* GENERAL SESSIONS */}
            {liveSessions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>General Services</Text>
                {liveSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onResume={() => resumeSession(session)}
                    onEnd={() => endSession(session)}
                  />
                ))}
              </>
            )}

            {/* GROUP SESSIONS */}
            {groupSessions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Group Meetings</Text>
                {groupSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isGroup
                    onEnd={() => endSession(session)}
                  />
                ))}
              </>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

function SessionCard({ session, isGroup, onResume, onEnd }) {
  const color = isGroup ? "#7C3AED" : "#4B3F72";
  return (
    <View style={[styles.sessionCard, { borderLeftColor: color }]}>
      <View style={styles.sessionCardHeader}>
        <View style={[styles.sessionIcon, { backgroundColor: color + "20" }]}>
          <Ionicons
            name={isGroup ? "people-outline" : "home-outline"}
            size={18}
            color={color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessionCardTitle}>
            {isGroup ? `${session.groupName} · ${session.purpose}` : `${session.service} · ${session.type}`}
          </Text>
          <Text style={styles.sessionCardSub}>
            Started {session.startTime || "—"}
            {session.event && session.event !== "None" ? ` · ${session.event}` : ""}
          </Text>
        </View>
        <View style={[styles.liveChip, { backgroundColor: color }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveChipText}>Live</Text>
        </View>
      </View>

      {session.status === "extended" && (
        <View style={styles.extendedBadge}>
          <Text style={styles.extendedBadgeText}>Extended</Text>
        </View>
      )}

      <View style={styles.sessionCardActions}>
        {onResume && (
          <TouchableOpacity style={[styles.resumeBtn, { backgroundColor: color }]} onPress={onResume}>
            <Ionicons name="enter-outline" size={13} color="#fff" />
            <Text style={styles.resumeBtnText}>Open Attendance</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.endCardBtn} onPress={onEnd}>
          <Ionicons name="stop-circle-outline" size={13} color="#fff" />
          <Text style={styles.endCardBtnText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { padding: 14, paddingBottom: 60 },
  overviewBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#EEF0FA", borderRadius: 12, padding: 14, marginBottom: 16 },
  overviewText: { flex: 1, fontSize: 12, color: "#4B3F72", lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", textTransform: "uppercase", marginBottom: 8, marginTop: 6 },
  sessionCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 2 },
  sessionCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  sessionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sessionCardTitle: { fontSize: 14, fontWeight: "800", color: "#222" },
  sessionCardSub: { fontSize: 11, color: "#888", marginTop: 2 },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveChipText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  extendedBadge: { backgroundColor: "#FFF3CD", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 8 },
  extendedBadgeText: { fontSize: 10, color: "#856404", fontWeight: "700" },
  sessionCardActions: { flexDirection: "row", gap: 8 },
  resumeBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, padding: 10 },
  resumeBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  endCardBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#e74c3c", borderRadius: 8, padding: 10 },
  endCardBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#888", marginTop: 16 },
  emptyText: { fontSize: 13, color: "#bbb", textAlign: "center", marginTop: 8, lineHeight: 20, maxWidth: 300 },
});