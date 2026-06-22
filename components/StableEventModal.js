// StableEventModal.js
import React from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function StableEventModal({
  visible,
  onClose,
  data,
  setData,
  onSave,
  onDelete,
  preachers = [],
  requirePreacher = false,
  title = "Edit Item"
}) {
  const [showDate, setShowDate] = React.useState(false);
  const [error, setError] = React.useState("");

  // ✅ CLEAR ERROR EVERY TIME MODAL OPENS
  React.useEffect(() => {
    if (visible) setError("");
  }, [visible]);

  const handleSave = () => {
  if (requirePreacher && !data.preacherId) {
    setError("Please select a preacher");
    return;
  }

  setError("");

  onSave({
    ...data,
    id: data.id || Date.now().toString(),
    title: data.title || "",
    date: data.date || null,
    session: data.session || "",
    preacherId: data.preacherId || null
  });

  onClose();   // ✅ closes modal properly
};


  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>{title}</Text>

          {/* TEXT INPUT */}
          <TextInput
            style={styles.input}
            value={data.title}
            onChangeText={(t) => setData({ ...data, title: t })}
            placeholder="Enter title"
          />

          {/* DATE */}
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDate(true)}
          >
            <Text>
              {data.date ? new Date(data.date).toDateString() : "Pick Date"}
            </Text>
          </TouchableOpacity>

          {showDate && (
            <DateTimePicker
              value={data.date ? new Date(data.date) : new Date()}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowDate(false);
                if (d) setData({ ...data, date: d.toISOString() });
              }}
            />
          )}

          {/* ✅ LINKED PREACHER (PROGRAM ITEMS ONLY) */}
          {requirePreacher && (
            <View style={styles.preacherSection}>
              <Text style={styles.label}>Preacher</Text>

              {preachers.length === 0 ? (
                <Text style={styles.emptyText}>
                  No preachers added for this session yet
                </Text>
              ) : (
                preachers.map((p) => {
                  const active = data.preacherId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.preacherRow,
                        active && styles.preacherRowActive
                      ]}
                      onPress={() => {
                        setData({ ...data, preacherId: p.id });
                        setError("");
                      }}
                    >
                      <Text
                        style={[
                          styles.preacherName,
                          active && styles.preacherTextActive
                        ]}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={[
                          styles.preacherTopic,
                          active && styles.preacherTextActive
                        ]}
                      >
                        {p.topic}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}

              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {/* BUTTONS */}
          <View style={styles.row}>
            <TouchableOpacity style={styles.save} onPress={handleSave}>
              <Text style={styles.white}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.delete} onPress={onDelete}>
              <Text style={styles.white}>Delete</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose}>
            <Text style={{ textAlign: "center", marginTop: 10 }}>
              Cancel
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0007",
    justifyContent: "center",
  },
  box: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f4f6fb",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  dateBtn: {
    backgroundColor: "#f4f6fb",
    padding: 12,
    borderRadius: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#777",
    marginBottom: 6,
  },
  preacherSection: {
    marginTop: 14,
  },
  preacherRow: {
    backgroundColor: "#f4f6fb",
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  preacherRowActive: {
    backgroundColor: "#4B3F72",
  },
  preacherName: {
    fontWeight: "700",
    fontSize: 13,
    color: "#222",
  },
  preacherTopic: {
    fontSize: 11,
    color: "#777",
    marginTop: 2,
  },
  preacherTextActive: {
    color: "#fff",
  },
  emptyText: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 6,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  save: {
    backgroundColor: "#4B3F72",
    padding: 10,
    borderRadius: 8,
  },
  delete: {
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 8,
  },
  white: {
    color: "#fff",
    fontWeight: "700",
  },
});