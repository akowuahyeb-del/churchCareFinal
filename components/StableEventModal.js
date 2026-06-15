import React from "react";
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function StableEventModal({
  visible,
  onClose,
  data,
  setData,
  onSave,
  onDelete
}) {
  const [showDate, setShowDate] = React.useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>Edit Item</Text>

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

          {/* BUTTONS */}
          <View style={styles.row}>
            <TouchableOpacity style={styles.save} onPress={onSave}>
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