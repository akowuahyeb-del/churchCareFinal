import React, { useState } from "react";
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity,
  TextInput, Modal, Alert
} from "react-native";

export default function AttendanceScreen() {

  /* ✅ SERVICES */
  const [services, setServices] = useState([
    "Sunday Service", "Midweek Service", "Choir"
  ]);

  const [types, setTypes] = useState([
    "First Service", "Second Service", "Wedding"
  ]);

  const [selectedService, setSelectedService] = useState("Sunday Service");
  const [selectedType, setSelectedType] = useState("First Service");

  const [serviceModal, setServiceModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);

  /* ✅ SEARCH */
  const [searchMember, setSearchMember] = useState("");
  const [searchService, setSearchService] = useState("");
  const [searchType, setSearchType] = useState("");

  /* ✅ ADD INPUT */
  const [newService, setNewService] = useState("");
  const [newType, setNewType] = useState("");

  /* ✅ MEMBERS */
  const [members, setMembers] = useState([
    { id: "1", name: "Grace Mensah", attendance: [] },
    { id: "2", name: "Kofi Agyeman", attendance: [] }
  ]);

  const today = new Date().toISOString().split("T")[0];

  /* ✅ FILTER MEMBERS */
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchMember.toLowerCase())
  );

  /* ✅ ADD SERVICE */
  const addService = () => {
    if (!newService.trim()) return;
    setServices([...services, newService]);
    setSelectedService(newService);
    setNewService("");
    setServiceModal(false);
  };

  /* ✅ ADD TYPE */
  const addType = () => {
    if (!newType.trim()) return;
    setTypes([...types, newType]);
    setSelectedType(newType);
    setNewType("");
    setTypeModal(false);
  };

  /* ✅ REMOVE */
  const removeAttendance = (id) => {
    setMembers(members.map(m => {
      if (m.id !== id) return m;

      return {
        ...m,
        attendance: m.attendance.filter(
          a =>
            !(a.date === today &&
              a.service === selectedService &&
              a.type === selectedType)
        )
      };
    }));
  };

  /* ✅ TOGGLE */
  const toggleAttendance = (member, status) => {

    const exists = member.attendance.find(
      a => a.date === today &&
           a.service === selectedService &&
           a.type === selectedType
    );

    if (exists) {
      Alert.alert(
        "Undo Attendance?",
        `Remove attendance for ${member.name}?`,
        [
          { text: "Cancel" },
          { text: "Yes", onPress: () => removeAttendance(member.id) }
        ]
      );
      return;
    }

    setMembers(members.map(m => {
      if (m.id !== member.id) return m;

      return {
        ...m,
        attendance: [
          ...m.attendance,
          {
            service: selectedService,
            type: selectedType,
            status,
            date: today
          }
        ]
      };
    }));
  };

  /* ✅ STATUS */
  const getStatus = (m) => {
    const rec = m.attendance.find(
      a => a.date === today &&
           a.service === selectedService &&
           a.type === selectedType
    );
    return rec ? rec.status : null;
  };

  return (
    <View style={styles.container}>

      <Text style={styles.header}>Attendance</Text>

      {/* ✅ SERVICE */}
      <TouchableOpacity
        style={styles.combo}
        onPress={() => setServiceModal(true)}
      >
        <Text>{selectedService}</Text>
      </TouchableOpacity>

      {/* ✅ TYPE */}
      <TouchableOpacity
        style={styles.combo}
        onPress={() => setTypeModal(true)}
      >
        <Text>{selectedType}</Text>
      </TouchableOpacity>

      {/* ✅ MEMBER SEARCH */}
      <TextInput
        placeholder="Search member..."
        value={searchMember}
        onChangeText={setSearchMember}
        style={styles.searchInput}
      />

      {/* ✅ MEMBERS */}
      <FlatList
        data={filteredMembers}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {

          const status = getStatus(item);

          return (
            <View style={styles.card}>

              <Text style={styles.name}>{item.name}</Text>

              <View style={styles.row}>

                {/* PRESENT */}
                <TouchableOpacity
                  style={[styles.present, status && styles.disabled]}
                  onPress={() => toggleAttendance(item, "present")}
                >
                  <Text style={styles.btnText}>Present</Text>
                </TouchableOpacity>

                {/* ABSENT */}
                <TouchableOpacity
                  style={[styles.absent, status && styles.disabled]}
                  onPress={() => toggleAttendance(item, "absent")}
                >
                  <Text style={styles.btnText}>Absent</Text>
                </TouchableOpacity>

                {/* UNDO */}
                {status && (
                  <TouchableOpacity
                    style={styles.undo}
                    onPress={() => toggleAttendance(item)}
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
        <View style={styles.overlay}>
          <View style={styles.modal}>

            <TextInput
              placeholder="Service"
              value={searchService}
              onChangeText={setSearchService}
              style={styles.input}
            />

            {services
              .filter(s => s.toLowerCase().includes(searchService.toLowerCase()))
              .map((s, i) => {
                const selected = s === selectedService;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.itemBox,
                      selected && styles.selectedItem
                    ]}
                    onPress={() => {
                      setSelectedService(s);
                      setServiceModal(false);
                    }}
                  >
                    <Text style={selected && styles.selectedText}>{s}</Text>
                  </TouchableOpacity>
                );
              })}

            {/* ADD */}
            <TextInput
              placeholder="New Service"
              value={newService}
              onChangeText={setNewService}
              style={styles.input}
            />

            <TouchableOpacity style={styles.addBtn} onPress={addService}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setServiceModal(false)}
              style={styles.cancelBtn}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* ✅ TYPE MODAL */}
      <Modal visible={typeModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>

            <TextInput
              placeholder="Type"
              value={searchType}
              onChangeText={setSearchType}
              style={styles.input}
            />

            {types
              .filter(t => t.toLowerCase().includes(searchType.toLowerCase()))
              .map((t, i) => {
                const selected = t === selectedType;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.itemBox,
                      selected && styles.selectedItem
                    ]}
                    onPress={() => {
                      setSelectedType(t);
                      setTypeModal(false);
                    }}
                  >
                    <Text style={selected && styles.selectedText}>{t}</Text>
                  </TouchableOpacity>
                );
              })}

            {/* ADD */}
            <TextInput
              placeholder="New Type"
              value={newType}
              onChangeText={setNewType}
              style={styles.input}
            />

            <TouchableOpacity style={styles.addBtn} onPress={addType}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTypeModal(false)}
              style={styles.cancelBtn}
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

  container: { flex: 1, padding: 20 },

  header: { fontSize: 18, marginBottom: 10 },

  combo: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },

  searchInput: {
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

  present: { backgroundColor: "#27ae60", padding: 8, marginRight: 8 },
  absent: { backgroundColor: "#e74c3c", padding: 8, marginRight: 8 },
  undo: { backgroundColor: "#555", padding: 8 },

  disabled: { opacity: 0.4 },

  btnText: { color: "#fff", fontSize: 12 },

  overlay: {
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

  input: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10
  },

  itemBox: {
    padding: 10,
    borderRadius: 6
  },

  selectedItem: {
    backgroundColor: "#E6DFFD",
    borderWidth: 1,
    borderColor: "#4B3F72"
  },

  selectedText: {
    fontWeight: "600",
    color: "#4B3F72"
  },

  addBtn: {
    backgroundColor: "#4B3F72",
    padding: 10,
    alignItems: "center",
    marginTop: 5
  },

  addText: { color: "#fff" },

  cancelBtn: {
    marginTop: 10,
    alignItems: "center"
  }

});