// components/ProgramModal.js
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ProgramModal({
  visible,
  onClose,
  onSave,
  onDelete,
  preachers = [],
  activeSession,
  initialData = {}
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(null);
  const [participants, setParticipants] = useState([]);

  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState("");

  // ✅ Load edit data fresh every time the modal opens
  useEffect(() => {
    if (!visible) return;
    setTitle(initialData?.title || "");
    setNotes(initialData?.notes || "");
    setTime(initialData?.time || "");
    setDate(initialData?.date || null);
    if (initialData?.participants?.length) {
  setParticipants(initialData.participants);
} else if (initialData?.preacherId) {
  const preacher = preachers.find(
    p => p.id === initialData.preacherId
  );

  setParticipants(
    preacher
      ? [{
          id: preacher.id,
          name: preacher.name,
          role: "Preacher"
        }]
      : []
  );
} else {
  setParticipants([]);
}
    setError("");
  }, [visible, initialData]);

  const handleSave = () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
   

   onSave({
  id: initialData?.id || Date.now().toString(),
  title: title.trim(),
  notes: notes.trim(),
  time,
  date,

  participants,

  // backward compatibility
  preacherId:
    participants.find(
      p => p.role === "Preacher"
    )?.id || null,

  session: activeSession
});

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>
            {initialData?.id ? "Edit Program Item" : "New Program Item"}
          </Text>

          {/* ✅ Read-only — tells you exactly which session this belongs to */}
          {activeSession?.name && (
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>{activeSession.name}</Text>
            </View>
          )}

          <Text style={styles.label}>Programme Item</Text>
<TextInput
  placeholder="e.g. Call to Worship"
  style={styles.input}
  value={title}
  onChangeText={setTitle}
/>

          <Text style={styles.label}>Duration / Time</Text>
<TextInput
  placeholder="e.g. 5 min or 9:00 AM"
  style={styles.input}
  value={time}
  onChangeText={setTime}
/>
   <Text style={styles.label}>Date (Optional)</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}>
            <Text>
              {date ? new Date(date).toDateString() : "Pick Date (optional)"}
            </Text>
          </TouchableOpacity>

          {showDate && (
            <DateTimePicker
              value={date ? new Date(date) : new Date()}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowDate(false);
                if (d) setDate(d.toISOString());
              }}
            />
          )}

          <Text style={styles.label}>Reference / Notes (Optional)</Text>

<TextInput
  placeholder="e.g. PH 528:1-3"
  style={[styles.input, { height: 70 }]}
  multiline
  value={notes}
  onChangeText={setNotes}
/>

         <Text style={styles.label}>
  Responsible Person / Group (Optional)
</Text>


          {preachers.length === 0 ? (
            <Text style={styles.emptyText}>
              No preacher available for this service yet.

You may leave this blank or add a preacher from the Preachers tab.
            </Text>
          ) : (
            preachers.map(p => {
              const active = participants.some(
  participant => participant.id === p.id
);

{participants.length > 0 && (
  <>
    <Text
      style={[
        styles.label,
        { marginTop: 10 }
      ]}
    >
      Selected
    </Text>

    <Text style={styles.sub}>
      {participants.map(p => p.name).join(", ")}
    </Text>
  </>
)}
       
return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.item, active && styles.itemActive]}
                 onPress={() => {
  const exists = participants.some(
    participant => participant.id === p.id
  );

  if (exists) {
    setParticipants(prev =>
      prev.filter(
        participant => participant.id !== p.id
      )
    );
  } else {
    setParticipants(prev => [
      ...prev,
      {
        id: p.id,
        name: p.name,
        role: "Preacher"
      }
    ]);
  }

  setError("");
}}
                >
                  <Text style={[styles.text, active && styles.textActive]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.sub, active && styles.textActive]}>
                    {p.topic}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.save} onPress={handleSave}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
          </TouchableOpacity>

          {initialData?.id && (
            <TouchableOpacity
              style={styles.delete}
              onPress={() => {
                onDelete && onDelete(initialData.id);
                onClose();
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Delete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose}>
            <Text style={{ textAlign: "center", marginTop: 10, color: "#777" }}>
              Cancel
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "#0006" },
  box: { backgroundColor: "#fff", margin: 20, padding: 16, borderRadius: 12 },
  title: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  sessionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF0FA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10
  },
  sessionBadgeText: { fontSize: 11, fontWeight: "700", color: "#4B3F72" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  label: { fontWeight: "700", marginBottom: 6, fontSize: 12, color: "#777" },
  item: { padding: 10, backgroundColor: "#eee", marginBottom: 6, borderRadius: 8 },
  itemActive: { backgroundColor: "#4B3F72" },
  text: { fontWeight: "700", color: "#000" },
  textActive: { color: "#fff" },
  sub: { fontSize: 12, color: "#555" },
  emptyText: { fontSize: 12, color: "#aaa", marginBottom: 8 },
  errorText: { color: "#e74c3c", fontSize: 12, marginBottom: 8, fontWeight: "600" },
  save: {
    backgroundColor: "#4B3F72",
    padding: 12,
    alignItems: "center",
    marginTop: 6,
    borderRadius: 10
  },
  delete: {
    backgroundColor: "#e74c3c",
    padding: 12,
    alignItems: "center",
    marginTop: 8,
    borderRadius: 10
  }
});