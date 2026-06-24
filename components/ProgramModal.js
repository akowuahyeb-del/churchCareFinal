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
  const [selectedPreacherId, setSelectedPreacherId] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState("");

  // ✅ Load edit data fresh every time the modal opens
  useEffect(() => {
    if (!visible) return;
    setTitle(initialData?.title || "");
    setNotes(initialData?.notes || "");
    setTime(initialData?.time || "");
    setDate(initialData?.date || null);
    setSelectedPreacherId(initialData?.preacherId || null);
    setError("");
  }, [visible, initialData]);

  const handleSave = () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!selectedPreacherId) {
      setError("Please select a preacher for this session");
      return;
    }

    onSave({
      id: initialData?.id || Date.now().toString(),
      title: title.trim(),
      notes: notes.trim(),
      time,
      date,
      preacherId: selectedPreacherId,
      session: activeSession // ✅ always the session you're currently viewing
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

          <TextInput
            placeholder="Program Title"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            placeholder="Time (e.g. 9:00 AM)"
            style={styles.input}
            value={time}
            onChangeText={setTime}
          />

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

          <TextInput
            placeholder="Notes (optional)"
            style={[styles.input, { height: 70 }]}
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          {/* ✅ Only preachers belonging to THIS session ever appear here */}
          <Text style={styles.label}>Preacher</Text>

          {preachers.length === 0 ? (
            <Text style={styles.emptyText}>
              No preachers added for {activeSession?.name || "this session"} yet.
              Add one from the Preachers tab first.
            </Text>
          ) : (
            preachers.map(p => {
              const active = selectedPreacherId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => {
                    setSelectedPreacherId(p.id);
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