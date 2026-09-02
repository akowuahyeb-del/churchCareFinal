import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, getDocs, doc, getDoc, orderBy, query } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

const STATUS_OPTIONS = ["new", "assigned", "in_progress", "resolved", "closed"];

const formatTimelineDate = (value) => {
  if (!value) return "";

  let d;

  if (typeof value?.toDate === "function") {
    d = value.toDate(); // Firestore Timestamp
  } else {
    d = new Date(value); // ISO string
  }

  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " • " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};


export default function PastoralTicketDetailScreen({ navigation, route }) {
  const { requestId, organizationId, entityId } = route.params;

  const [ticket, setTicket] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [internalNote, setInternalNote] = useState(true);
  const [team, setTeam] = useState([]);
  const [saving, setSaving] = useState(false);

  const functions = getFunctions();
  const updateStatus = httpsCallable(functions, "updatePastoralRequestStatus");
  const addNote = httpsCallable(functions, "addPastoralNote");
  const assignRequest = httpsCallable(functions, "assignPastoralRequest");

  const currentUser = getAuth().currentUser;

  const load = useCallback(async () => {
    const ref = doc(
      db,
      "organizations",
      organizationId,
      "entities",
      entityId,
      "pastoralRequests",
      requestId
    );
    const snap = await getDoc(ref);

if (!snap.exists()) {
  Alert.alert(
    "Not Found",
    "The request could not be found."
  );

  navigation.goBack();
  return;
}

const ticketData = {
  id: snap.id,
  ...snap.data(),
};

if (
  ticketData.visibility ===
  "confidential"
) {

  const recipients =
    ticketData
      .confidentialRecipients || [];

  if (
    !recipients.includes(
      currentUser?.uid
    )
  ) {

    Alert.alert(
      "Access Denied",
      "You are not authorized to view this confidential pastoral request."
    );

    navigation.goBack();

    return;
  }
}

setTicket(ticketData);

    const notesSnap = await getDocs(
      query(collection(ref, "notes"), orderBy("createdAt", "desc"))
    );
    setNotes(notesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const teamSnap = await getDocs(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "pastoralTeam"
      )
    );
    setTeam(teamSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  }, [organizationId, entityId, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (status) => {
    setSaving(true);
    try {
      await updateStatus({ organizationId, entityId, requestId, status });
      await load();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (member) => {
    setSaving(true);
    try {
      await assignRequest({
        organizationId,
        entityId,
        requestId,
        assigneeUid: member.uid,
        assigneeName: member.name,
      });
      await load();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await addNote({
        organizationId,
        entityId,
        requestId,
        body: noteText.trim(),
        authorName: currentUser?.displayName || "Staff",
        internal: internalNote,
      });
      setNoteText("");
      await load();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!ticket) {
    return (
      <View style={{ flex: 1 }}>
        <AppHeader title="Loading..." onBack={() => navigation.goBack()} />
      </View>
    );
  }

  // Staff eligible to take this category, for reassignment.
  const eligibleStaff =
  ticket.visibility ===
  "confidential"
    ? []
    : team.filter(
        (m) =>
          m.active &&
          (m.categories || []).includes(
            ticket.category
          )
      );

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
        subtitle={ticket.anonymous ? "Anonymous" : ticket.memberName || "Unknown"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.description}>{ticket.description}</Text>

          {!ticket.anonymous && ticket.memberPhone && (
            <Text style={styles.phone}>📞 {ticket.memberPhone}</Text>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaBadge}>Urgency: {ticket.urgency}</Text>
            <Text style={styles.metaBadge}>Status: {ticket.status}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, ticket.status === s && styles.chipActive]}
              onPress={() => handleStatusChange(s)}
              disabled={saving}
            >
              <Text style={[styles.chipText, ticket.status === s && styles.chipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {ticket.visibility ===
  "confidential" && (
  <View
    style={{
      backgroundColor: "#FDEDEC",
      borderWidth: 1,
      borderColor: "#E74C3C",
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    }}
  >
    <Text
      style={{
        color: "#C0392B",
        fontWeight: "800",
      }}
    >
      🔒 Confidential Care Request
    </Text>

    <Text
      style={{
        color: "#7B241C",
        marginTop: 4,
      }}
    >
      This request is visible only
      to the specifically selected
      pastoral leaders.
    </Text>
  </View>
)}


        <Text style={styles.sectionTitle}>Assigned To</Text>
        <View style={styles.chipRow}>
          {eligibleStaff.length === 0 ? (
            <Text style={{ color: "#999" }}>
              No staff configured for "{ticket.category}" requests yet.
            </Text>
          ) : (
            eligibleStaff.map((m) => (
              <TouchableOpacity
                key={m.uid}
                style={[
                  styles.chip,
                  ticket.assignedToUid === m.uid && styles.chipActive,
                ]}
                onPress={() => handleAssign(m)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.chipText,
                    ticket.assignedToUid === m.uid && styles.chipTextActive,
                  ]}
                >
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Notes</Text>
        {notes.map((n) => (
          <View
            key={n.id}
            style={[styles.noteCard, n.internal && styles.noteCardInternal]}
          >
           <Text style={styles.noteAuthor}>
  {n.system ? "System" : n.authorName || "Staff"}
  {n.internal && !n.system ? " · internal" : ""}
</Text>

<Text style={styles.noteDate}>
  📅 {formatTimelineDate(n.createdAt)}
</Text>


<Text style={styles.noteBody}>
  {n.body}
</Text>
          </View>
        ))}

        <View style={styles.noteInputRow}>
          <Text style={styles.switchLabel}>Internal note (not visible to member)</Text>
          <Switch value={internalNote} onValueChange={setInternalNote} />
        </View>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note..."
          multiline
          value={noteText}
          onChangeText={setNoteText}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={submitNote} disabled={saving}>
          <Text style={styles.saveBtnText}>Add Note</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16 },
  label: { fontSize: 12, color: "#666", fontWeight: "700" },
  description: { marginTop: 6, fontSize: 15, lineHeight: 21 },
  phone: { marginTop: 10, color: "#4B3F72", fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  metaBadge: { backgroundColor: "#F5F5F5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11, color: "#666" },
  sectionTitle: { fontWeight: "700", marginTop: 8, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: "#EEE", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  chipActive: { backgroundColor: "#4B3F72" },
  chipText: { color: "#555", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  noteCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 },
  noteCardInternal: { backgroundColor: "#FFF8E1" },
  noteAuthor: { fontSize: 11, fontWeight: "700", color: "#4B3F72" },
  noteBody: { marginTop: 4, fontSize: 13 },
  noteInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  switchLabel: { fontSize: 12, color: "#666" },
  noteInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, minHeight: 70, marginTop: 8, textAlignVertical: "top" },
  saveBtn: { backgroundColor: "#4B3F72", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  noteDate: {
  fontSize: 11,
  color: "#888",
  marginTop: 2,
  marginBottom: 6,
},
});