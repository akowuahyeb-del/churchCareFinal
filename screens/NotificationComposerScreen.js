// screens/NotificationComposerScreen.js
//
// Reached from Members/Home with { organizationId, entityId, viewerMemberId }
// (or nothing extra for super_admin — same pattern MemberProfileScreen uses).
// Shows the permission checklist live, then the matching composer for
// whichever audience type the viewer picks. Server-side callables are the
// real enforcement; this screen just mirrors those rules so people don't
// hit a permission-denied wall after filling out a whole message.

import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from "firebase/firestore";
import { hasPermission } from "../constants/permissions";
import NotificationPermissionChecklist from "../components/NotificationPermissionChecklist";

const functions = getFunctions();
const _sendChurchBroadcast = httpsCallable(functions, "sendChurchBroadcast");
const _sendIndividualNotification = httpsCallable(functions, "sendIndividualNotification");
const _sendGroupNotification = httpsCallable(functions, "sendGroupNotification");

export default function NotificationComposerScreen({ route, navigation }) {
  const organizationId = route?.params?.organizationId;
  const entityId = route?.params?.entityId;
  const viewerMemberId = route?.params?.viewerMemberId || null;
  const isSuperAdminRoute = route?.params?.isSuperAdmin || false;

  const [viewer, setViewer] = useState({ isSuperAdmin: isSuperAdminRoute, permissions: [] });
  const [loadingViewer, setLoadingViewer] = useState(!isSuperAdminRoute);

  const [tab, setTab] = useState("compose"); // "compose" | "history"
  const [selectedType, setSelectedType] = useState(null); // "broadcast" | "individual" | "disciplinary" | "group"

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ── audience pickers ──
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  /* ── VIEWER PERMISSIONS ── */
  useEffect(() => {
    if (isSuperAdminRoute) return;
    if (!viewerMemberId || !organizationId || !entityId) { setLoadingViewer(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "organizations", organizationId, "entities", entityId, "members", viewerMemberId));
        setViewer({ isSuperAdmin: false, permissions: snap.exists() ? (snap.data().permissions || []) : [] });
      } catch (e) {
        console.log("❌ Load viewer permissions:", e);
      } finally {
        setLoadingViewer(false);
      }
    })();
  }, [viewerMemberId, organizationId, entityId]);

  /* ── MEMBERS + GROUPS (for pickers) ── */
  useEffect(() => {
    if (!organizationId || !entityId) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "organizations", organizationId, "entities", entityId, "members"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(data);
        // ministry is the group key per PROFILE_FIELDS — dedupe into a group list
        const uniqueGroups = [...new Set(data.map(m => m.ministry).filter(Boolean))];
        setGroups(uniqueGroups);
      } catch (e) {
        console.log("❌ Load members/groups:", e);
      }
    })();
  }, [organizationId, entityId]);

  /* ── HISTORY LOG ── */
  const loadLogs = async () => {
    if (!organizationId || !entityId) return;
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, "organizations", organizationId, "entities", entityId, "notificationLogs"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("❌ Load notification logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };
  useEffect(() => { if (tab === "history") loadLogs(); }, [tab]);

  const filteredMembers = members.filter(m =>
    (m.name || "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  const resetComposer = () => {
    setTitle(""); setMessage(""); setSelectedMemberId(null); setSelectedGroupId(null);
  };

  const canSend = () => {
    if (!selectedType || !title.trim() || !message.trim()) return false;
    if (selectedType === "individual" || selectedType === "disciplinary") return !!selectedMemberId;
    if (selectedType === "group") return !!selectedGroupId;
    return true;
  };

  const handleSend = async () => {
    if (!canSend()) return;
    setSending(true);
    try {
      let result;
      if (selectedType === "broadcast") {
        result = await _sendChurchBroadcast({ organizationId, entityId, title: title.trim(), message: message.trim() });
      } else if (selectedType === "individual" || selectedType === "disciplinary") {
        result = await _sendIndividualNotification({
          organizationId, entityId, memberId: selectedMemberId,
          title: title.trim(), message: message.trim(),
          category: selectedType === "disciplinary" ? "disciplinary" : undefined,
        });
      } else if (selectedType === "group") {
        result = await _sendGroupNotification({ organizationId, entityId, groupId: selectedGroupId, title: title.trim(), message: message.trim() });
      }

      const count = result?.data?.delivered ?? (result?.data?.delivered === false ? 0 : 1);
      Alert.alert("✅ Sent", typeof count === "number" ? `Delivered to ${count} recipient${count === 1 ? "" : "s"}.` : "Notification sent.");
      resetComposer();
      setSelectedType(null);
    } catch (e) {
      console.log("❌ send notification:", e);
      Alert.alert("Could not send", e.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  if (loadingViewer) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#4B3F72" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* TABS */}
      <View style={styles.tabRow}>
        {["compose", "history"].map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === "compose" ? "Compose" : "History"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "compose" ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionTitle}>What can you send?</Text>
          <NotificationPermissionChecklist viewer={viewer} selected={selectedType} onSelect={(key) => { setSelectedType(key); resetComposer(); }} />

          {selectedType && (
            <>
              <Text style={styles.sectionTitle}>Compose</Text>

              {(selectedType === "individual" || selectedType === "disciplinary") && (
                <>
                  <Text style={styles.label}>Recipient *</Text>
                  <TextInput style={styles.input} placeholder="Search member by name…" value={memberSearch} onChangeText={setMemberSearch} />
                  <FlatList
                    data={filteredMembers.slice(0, 8)}
                    keyExtractor={m => m.id}
                    style={{ maxHeight: 180, marginBottom: 8 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.pickRow, selectedMemberId === item.id && styles.pickRowActive]}
                        onPress={() => setSelectedMemberId(item.id)}
                      >
                        <Text style={[styles.pickRowText, selectedMemberId === item.id && { color: "#4B3F72", fontWeight: "700" }]}>
                          {item.name || "Unnamed"}
                        </Text>
                        {selectedMemberId === item.id && <Ionicons name="checkmark-circle" size={16} color="#4B3F72" />}
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}

              {selectedType === "group" && (
                <>
                  <Text style={styles.label}>Group *</Text>
                  {groups.length === 0 ? (
                    <Text style={styles.emptyHint}>No ministries/groups found among current members.</Text>
                  ) : (
                    <View style={styles.chipRow}>
                      {groups.map(g => (
                        <TouchableOpacity key={g} style={[styles.chip, selectedGroupId === g && styles.chipActive]} onPress={() => setSelectedGroupId(g)}>
                          <Text style={[styles.chipText, selectedGroupId === g && styles.chipTextActive]}>{g}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {selectedType === "broadcast" && (
                <View style={styles.infoBox}>
                  <Ionicons name="people-outline" size={14} color="#4B3F72" />
                  <Text style={styles.infoBoxText}>Sent to every active, invited, registered, and active-user member in this church.</Text>
                </View>
              )}

              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} placeholder="Notification title" value={title} onChangeText={setTitle} />

              <Text style={styles.label}>Message *</Text>
              <TextInput style={[styles.input, { height: 90, textAlignVertical: "top" }]} placeholder="Write your message…" value={message} onChangeText={setMessage} multiline />

              <TouchableOpacity
                style={[styles.sendBtn, (!canSend() || sending) && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={!canSend() || sending}
              >
                {sending ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="send" size={15} color="#fff" />
                    <Text style={styles.sendBtnText}>Send Notification</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {loadingLogs ? (
            <ActivityIndicator color="#4B3F72" style={{ marginTop: 30 }} />
          ) : logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={40} color="#ddd" />
              <Text style={styles.emptyText}>No notifications sent yet</Text>
            </View>
          ) : (
            logs.map(l => (
              <View key={l.id} style={styles.logRow}>
                <View style={[styles.logIcon, { backgroundColor: TYPE_COLOR[l.type] + "22" || "#eee" }]}>
                  <Ionicons name={TYPE_ICON[l.type] || "notifications-outline"} size={16} color={TYPE_COLOR[l.type] || "#888"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle}>{l.title}</Text>
                  <Text style={styles.logSub} numberOfLines={2}>{l.message}</Text>
                  <Text style={styles.logMeta}>
                    {TYPE_LABEL[l.type] || l.type} · {l.recipientCount ?? "—"} recipient{l.recipientCount === 1 ? "" : "s"} · {l.createdAt?.slice(0, 16).replace("T", " ")}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const TYPE_ICON = { church_broadcast: "megaphone-outline", individual: "person-outline", disciplinary: "warning-outline", group: "people-outline" };
const TYPE_COLOR = { church_broadcast: "#4B3F72", individual: "#0984E3", disciplinary: "#e74c3c", group: "#27ae60" };
const TYPE_LABEL = { church_broadcast: "Church Broadcast", individual: "Individual", disciplinary: "Disciplinary", group: "Group" };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  center: { justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },

  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { fontSize: 12, color: "#aaa", fontWeight: "700" },
  tabTextActive: { color: "#4B3F72" },

  body: { padding: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#888", textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  label: { fontSize: 12, fontWeight: "700", color: "#777", marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e8e8e8", fontSize: 14 },

  pickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 10, borderRadius: 8, marginVertical: 2, borderWidth: 1, borderColor: "#eee" },
  pickRowActive: { borderColor: "#4B3F72", backgroundColor: "#fafafe" },
  pickRowText: { fontSize: 13, color: "#333" },
  emptyHint: { fontSize: 12, color: "#999", fontStyle: "italic" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#eee" },
  chipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  chipText: { fontSize: 12, color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 12, marginBottom: 6 },
  infoBoxText: { flex: 1, fontSize: 12, color: "#4B3F72", lineHeight: 17 },

  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4B3F72", borderRadius: 12, padding: 15, marginTop: 18 },
  sendBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13 },

  logRow: { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, alignItems: "flex-start" },
  logIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logTitle: { fontSize: 13, fontWeight: "700", color: "#222" },
  logSub: { fontSize: 12, color: "#666", marginTop: 2 },
  logMeta: { fontSize: 10, color: "#aaa", marginTop: 4, fontWeight: "600" },
});