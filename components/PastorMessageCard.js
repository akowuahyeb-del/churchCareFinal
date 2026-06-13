import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

export default function PastorMessageCard({ title, message, expiry: initialExpiry }) {

  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ✅ LOCAL EDIT STATE
  const [editTitle, setEditTitle] = useState(title || "");
  const [editMsg, setEditMsg] = useState(message || "");
  const [expiry, setExpiry] = useState(initialExpiry);

  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.card}>

      {/* ✅ HEADER */}
      <View style={styles.row}>
        <Text style={styles.title}>
          {editTitle || "Message from Pastor"}
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* EDIT */}
          <TouchableOpacity onPress={() => setVisible(true)}>
            <Ionicons name="create-outline" size={18} color="#4B3F72" />
          </TouchableOpacity>

          {/* COLLAPSE */}
          <TouchableOpacity onPress={() => setCollapsed(!collapsed)}>
            <Ionicons
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={18}
              color="#4B3F72"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ MESSAGE */}
      {!collapsed && (
        <>
          <Text style={styles.message}>{editMsg}</Text>

          {expiry && (
            <Text style={styles.expiry}>
              ⏱ Expires: {new Date(expiry).toLocaleString()}
            </Text>
          )}
        </>
      )}

      {/* ✅ MODAL */}
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>Edit Pastor Message</Text>

            {/* ✅ TITLE INPUT */}
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Edit title"
            />

            {/* ✅ MESSAGE INPUT */}
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              multiline
              value={editMsg}
              onChangeText={setEditMsg}
              placeholder="Enter message..."
            />

            {/* ✅ EXPIRY */}
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#4B3F72" />
              <Text style={{ marginLeft: 6 }}>
                {expiry
                  ? new Date(expiry).toLocaleString()
                  : "Set Expiry"}
              </Text>
            </TouchableOpacity>

            {/* ✅ SAFE DATE PICKER (NO CRASH) */}
            {showPicker && (
              <DateTimePicker
                value={expiry ? new Date(expiry) : new Date()}
                mode="date"   // ✅ FIXED (NO datetime)
                display="default"
                onChange={(event, date) => {
                  setShowPicker(false);
                  if (date) setExpiry(date.toISOString());
                }}
              />
            )}

            {/* ✅ ACTIONS */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.white}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                setEditTitle("");
                setEditMsg("");
                setExpiry(null);
                setVisible(false);
              }}
            >
              <Text style={styles.white}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setVisible(false)}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#222",
  },

  message: {
    fontSize: 13,
    color: "#444",
    marginTop: 8,
    lineHeight: 20,
  },

  expiry: {
    marginTop: 6,
    fontSize: 11,
    color: "#6c47b8",
  },

  modalWrap: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center",
  },

  modalBox: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 16,
  },

  modalTitle: {
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

  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 10,
  },

  saveBtn: {
    backgroundColor: "#1BA97F",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  deleteBtn: {
    backgroundColor: "#ff4d4d",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },

  cancelBtn: {
    marginTop: 6,
    alignItems: "center",
  },

  white: {
    color: "#fff",
    fontWeight: "700",
  },
});