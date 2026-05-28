import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity,
  TextInput, Modal, Alert
} from "react-native";

/* ✅ FIREBASE IMPORT */
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs
} from "firebase/firestore";

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

  /* ✅ ADD NEW */
  const [newService, setNewService] = useState("");
  const [newType, setNewType] = useState("");

  /* ✅ MEMBERS (FROM FIREBASE) */
  const [members, setMembers] = useState([]);

  const today = new Date().toISOString().split("T")[0];

  /* ✅ LOAD MEMBERS FROM FIREBASE */
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "members"));

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        attendance: []
      }));

      setMembers(data);

    } catch (error) {
      console.log("❌ Error loading members:", error);
    }
  };

  /* ✅ ADD SERVICE */
  const addService = () => {
    if (!newService.trim()) return;
    setServices(prev => [...prev, newService]);
    setSelectedService(newService);
    setNewService("");
    setServiceModal(false);
  };

  /* ✅ ADD TYPE */
  const addType = () => {
    if (!newType.trim()) return;
    setTypes(prev => [...prev, newType]);
    setSelectedType(newType);
    setNewType("");
    setTypeModal(false);
  };

  /* ✅ FILTER MEMBERS */
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchMember.toLowerCase())
  );

  /* ✅ SAVE ATTENDANCE TO FIREBASE */
  const saveAttendance = async (member, status) => {
    try {
      await addDoc(collection(db, "attendance"), {
        memberId: member.id,
        name: member.name,
        service: selectedService,
        type: selectedType,
        status: status,
        date: today,
        createdAt: new Date()
      });

      Alert.alert("✅ Saved", "Attendance recorded");

    } catch (error) {
      console.log("❌ Error saving:", error);
    }
  };

  /* ✅ TOGGLE */
  const toggleAttendance = (member, status) => {

    Alert.alert(
      "Confirm",
      `${status === "present" ? "Mark Present" : "Mark Absent"} for ${member.name}?`,
      [
        { text: "Cancel" },
        { text: "Yes", onPress: () => saveAttendance(member, status) }
      ]
    );
  };

  return (
    <View style={styles.container}>

      <Text style={styles.header}>Attendance</Text>

      {/* ✅ SERVICE */}
      <TouchableOpacity style={styles.combo} onPress={() => setServiceModal(true)}>
        <Text>{selectedService}</Text>
      </TouchableOpacity>

      {/* ✅ TYPE */}
      <TouchableOpacity style={styles.combo} onPress={() => setTypeModal(true)}>
        <Text>{selectedType}</Text>
      </TouchableOpacity>

      {/* ✅ SEARCH */}
      <TextInput
        placeholder="Search member..."
        value={searchMember}
        onChangeText={setSearchMember}
        style={styles.searchInput}
      />

      {/* ✅ MEMBER LIST */}
      <FlatList
        data={filteredMembers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>

            <Text style={styles.name}>{item.name}</Text>

            <View style={styles.row}>

              <TouchableOpacity
                style={styles.present}
                onPress={() => toggleAttendance(item, "present")}
              >
                <Text style={styles.btnText}>Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.absent}
                onPress={() => toggleAttendance(item, "absent")}
              >
                <Text style={styles.btnText}>Absent</Text>
              </TouchableOpacity>

            </View>

          </View>
        )}
      />

      {/* ✅ SERVICE MODAL */}
      <Modal visible={serviceModal} transparent>
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
              .map((s, i) => (
                <TouchableOpacity key={i} onPress={() => {
                  setSelectedService(s);
                  setServiceModal(false);
                }}>
                  <Text style={styles.item}>{s}</Text>
                </TouchableOpacity>
              ))}

            <TextInput
              placeholder="New Service"
              value={newService}
              onChangeText={setNewService}
              style={styles.input}
            />

            <TouchableOpacity style={styles.addBtn} onPress={addService}>
              <Text style={{ color: "#fff" }}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setServiceModal(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* ✅ TYPE MODAL */}
      <Modal visible={typeModal} transparent>
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
              .map((t, i) => (
                <TouchableOpacity key={i} onPress={() => {
                  setSelectedType(t);
                  setTypeModal(false);
                }}>
                  <Text style={styles.item}>{t}</Text>
                </TouchableOpacity>
              ))}

            <TextInput
              placeholder="New Type"
              value={newType}
              onChangeText={setNewType}
              style={styles.input}
            />

            <TouchableOpacity style={styles.addBtn} onPress={addType}>
              <Text style={{ color: "#fff" }}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTypeModal(false)}>
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
    marginBottom: 10,
    borderRadius: 8
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
  absent: { backgroundColor: "#e74c3c", padding: 8 },

  btnText: { color: "#fff" },

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
    marginBottom: 10,
    borderRadius: 6
  },

  item: { padding: 10 },

  addBtn: {
    backgroundColor: "#4B3F72",
    padding: 10,
    alignItems: "center"
  }
});