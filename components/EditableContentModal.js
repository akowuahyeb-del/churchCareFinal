import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, TextInput,
  TouchableOpacity, StyleSheet
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function EditableContentModal({
  visible,
  onClose,
  titleValue,
  messageValue,
  onSave,
  onDelete
}) {

  /* ✅ STATE */
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiry, setExpiry] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState("date");

  /* ✅ FIX: sync props when modal opens */
  useEffect(() => {
    if (visible) {
      setTitle(titleValue || "");
      setMessage(messageValue || "");
    }
  }, [visible, titleValue, messageValue]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.wrap}>
        <View style={styles.box}>

          <Text style={styles.heading}>Edit Content</Text>

          {/* ✅ TITLE */}
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Header title"
          />

          {/* ✅ MESSAGE */}
          <TextInput
            style={[styles.input, { height: 90 }]}
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Message..."
          />

          {/* ✅ EXPIRY BUTTON */}
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => {
              setMode("date");
              setShowPicker(true);
            }}
          >
            <Text>
              {expiry
                ? new Date(expiry).toLocaleString()
                : "Set expiry"}
            </Text>
          </TouchableOpacity>

          {/* ✅ FIXED PICKER (only render conditionally) */}
          {showPicker && (
            <DateTimePicker
              value={expiry ? new Date(expiry) : new Date()}
              mode={mode}
              onChange={(event, selectedDate) => {
                if (!selectedDate) {
                  setShowPicker(false);
                  return;
                }

                if (mode === "date") {
                  setMode("time");
                  setShowPicker(true);
                  setExpiry(selectedDate.toISOString());
                } else {
                  const newDate = new Date(expiry || selectedDate);
                  newDate.setHours(
                    selectedDate.getHours(),
                    selectedDate.getMinutes()
                  );
                  setExpiry(newDate.toISOString());
                  setShowPicker(false);
                }
              }}
            />
          )}

          {/* ✅ SAVE */}
          <TouchableOpacity
            style={styles.save}
            onPress={() => {
              onSave({ title, message, expiry });
              onClose();
            }}
          >
            <Text style={styles.white}>Save</Text>
          </TouchableOpacity>

          {/* ✅ DELETE */}
          {onDelete && (
            <TouchableOpacity
              style={styles.delete}
              onPress={() => {
                onDelete();
                onClose();
              }}
            >
              <Text style={styles.white}>Delete</Text>
            </TouchableOpacity>
          )}

          {/* ✅ CANCEL */}
          <TouchableOpacity onPress={onClose}>
            <Text style={{ textAlign: "center", marginTop: 8 }}>
              Cancel
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0006",
  },

  box: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 16,
    borderRadius: 16,
  },

  heading: {
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  dateBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },

  save: {
    backgroundColor: "#1BA97F",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  delete: {
    backgroundColor: "#ff4d4d",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },

  white: {
    color: "#fff",
    fontWeight: "700",
  },
});