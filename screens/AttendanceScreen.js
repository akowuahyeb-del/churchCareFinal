import React, { useState } from "react";
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity,
  TextInput, Modal
} from "react-native";

export default function AttendanceScreen() {

  /* ✅ SERVICES */
  const [services, setServices] = useState([
    "Sunday Service", "Midweek", "Choir"
  ]);

  const [types, setTypes] = useState([
    "First Service", "Second Service", "Wedding"
  ]);

  const [selectedService, setSelectedService] = useState("Sunday Service");
  const [selectedType, setSelectedType] = useState("First Service");

  const [serviceModal, setServiceModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);

  const [newService, setNewService] = useState("");
  const [newType, setNewType] = useState("");

  const [members, setMembers] = useState([
    { id: "1", name: "Grace Mensah", attendance: [] },
    { id: "2", name: "Kofi Agyeman", attendance: [] }
  ]);

  const today = new Date().toISOString().split("T")[0];

  /* ✅ ADD SERVICE */
  const addService = () => {
    if (!newService) return;
    setServices([...services, newService]);
    setSelectedService(newService);
    setNewService("");
    setServiceModal(false);
  };

  /* ✅ ADD TYPE */
  const addType = () => {
    if (!newType) return;
    setTypes([...types, newType]);
    setSelectedType(newType);
    setNewType("");
    setTypeModal(false);
  };

  /* ✅ TOGGLE ATTENDANCE */
  const toggleAttendance = (id, status) => {

    const updated = members.map(m => {

      if (m.id !== id) return m;

      const existingIndex = m.attendance.findIndex(
        a =>
          a.service === selectedService &&
          a.type === selectedType &&
          a.date === today
      );

      let updatedAttendance = [...m.attendance];

      if (existingIndex !== -1) {
        // ✅ TOGGLE (undo)
        updatedAttendance.splice(existingIndex, 1);
      } else {
        updatedAttendance.push({
          service: selectedService,
          type: selectedType,
          status,
          date: today
        });
      }

      return {
        ...m,
        attendance: updatedAttendance
      };
    });

    setMembers(updated);
  };

  /* ✅ CHECK STATUS */
  const getStatus = (member) => {

    const rec = member.attendance.find(
      a =>
        a.service === selectedService &&
        a.type === selectedType &&
        a.date === today
    );

    return rec ? rec.status : null;
  };

  return (
    <View style={styles.container}>

      {/* ✅ HEADER */}
      <Text style={styles.header}>Attendance Check-in</Text>

      {/* ✅ COMBO SERVICE */}
      <TouchableOpacity style={styles.combo} onPress={() => setServiceModal(true)}>
        <Text>{selectedService}</Text>
      </TouchableOpacity>

      {/* ✅ COMBO TYPE */}
      <TouchableOpacity style={styles.combo} onPress={() => setTypeModal(true)}>
        <Text>{selectedType}</Text>
      </TouchableOpacity>

      {/* ✅ MEMBER LIST */}
      <FlatList
        data={members}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {

          const status = getStatus(item);

          return (
            <View style={styles.card}>

              <Text style={styles.name}>{item.name}</Text>

              <View style={styles.row}>

                <TouchableOpacity
                  style={[
                    styles.present,
                    status && styles.disabled
                  ]}
                  onPress={() => toggleAttendance(item.id, "present")}
                >
                  <Text style={styles.btnText}>Present</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.absent,
                    status && styles.disabled
                  ]}
                  onPress={() => toggleAttendance(item.id, "absent")}
                >
                  <Text style={styles.btnText}>Absent</Text>
                </TouchableOpacity>

                {/* ✅ UNDO */}
                {status && (
                  <TouchableOpacity
                    style={styles.undo}
                    onPress={() => toggleAttendance(item.id)}
                  >
                    <Text style={styles.btnText}>Undo</Text>
                  </TouchableOpacity>
                )}

              </View>

            </View>
          );
        }}
      />

      {/* ✅ SERVICE MODAL */}
      <Modal visible={serviceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>

            <Text style={styles.modalTitle}>Select Service</Text>

            {services.map((s, i) => (
              <TouchableOpacity key={i} onPress={() => {
                setSelectedService(s);
                setServiceModal(false);
              }}>
                <Text style={styles.modalItem}>{s}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              placeholder="Add new service"
              value={newService}
              onChangeText={setNewService}
              style={styles.input}
            />

            <TouchableOpacity style={styles.addBtn} onPress={addService}>
              <Text style={{ color: "#fff" }}>Add</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* ✅ TYPE MODAL */}
      <Modal visible={typeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>

            <Text style={styles.modalTitle}>Select Type</Text>

            {types.map((t, i) => (
              <TouchableOpacity key={i} onPress={() => {
                setSelectedType(t);
                setTypeModal(false);
              }}>
                <Text style={styles.modalItem}>{t}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              placeholder="Add new type"
              value={newType}
              onChangeText={setNewType}
              style={styles.input}
            />

            <TouchableOpacity style={styles.addBtn} onPress={addType}>
              <Text style={{ color: "#fff" }}>Add</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({

  container: { flex: 1, padding: 20 },

  header: { fontSize: 18, marginBottom: 10 },

  combo: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8
  },

  name: { fontWeight: "600", marginBottom: 10 },

  row: { flexDirection: "row" },

  present: {
    backgroundColor: "green",
    padding: 8,
    borderRadius: 6,
    marginRight: 8
  },

  absent: {
    backgroundColor: "red",
    padding: 8,
    borderRadius: 6,
    marginRight: 8
  },

  undo: {
    backgroundColor: "#555",
    padding: 8,
    borderRadius: 6
  },

  disabled: {
    opacity: 0.4
  },

  btnText: { color: "#fff" },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0007"
  },

  modal: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 10
  },

  modalTitle: {
    fontWeight: "600",
    marginBottom: 10
  },

  modalItem: {
    padding: 10
  },

  input: {
    borderWidth: 1,
    marginTop: 10,
    padding: 8,
    borderRadius: 6
  },

  addBtn: {
    marginTop: 10,
    backgroundColor: "#4B3F72",
    padding: 10,
    alignItems: "center"
  }

});