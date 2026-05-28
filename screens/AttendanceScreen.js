import React, { useState } from "react";
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity,
  TextInput, Modal, Alert
} from "react-native";

export default function AttendanceScreen() {

  const [services, setServices] = useState(["Sunday", "Midweek"]);
  const [types, setTypes] = useState(["First", "Second"]);

  const [selectedService, setSelectedService] = useState("Sunday");
  const [selectedType, setSelectedType] = useState("First");

  const [members, setMembers] = useState([
    { id: "1", name: "Grace Mensah", attendance: [] },
    { id: "2", name: "Kofi Agyeman", attendance: [] }
  ]);

  const today = new Date().toISOString().split("T")[0];

  const toggle = (member) => {

    const updated = members.map(m => {
      if (m.id !== member.id) return m;

      const exists = m.attendance.find(
        a => a.date === today &&
             a.service === selectedService &&
             a.type === selectedType
      );

      if (exists) {
        Alert.alert("Undo?", "Remove attendance?", [
          { text: "Cancel" },
          {
            text: "OK",
            onPress: () => remove(member.id)
          }
        ]);
        return m;
      }

      return {
        ...m,
        attendance: [
          ...m.attendance,
          {
            service: selectedService,
            type: selectedType,
            date: today,
            status: "present"
          }
        ]
      };
    });

    setMembers(updated);
  };

  const remove = (id) => {
    const updated = members.map(m => {
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
    });

    setMembers(updated);
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Attendance</Text>

      <Text>{selectedService} - {selectedType}</Text>

      <FlatList
        data={members}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>

            <Text>{item.name}</Text>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => toggle(item)}
            >
              <Text style={{ color: "#fff" }}>Mark</Text>
            </TouchableOpacity>

          </View>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, padding: 20 },

  title: { fontSize: 18, marginBottom: 10 },

  card: {
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 8,
    marginTop: 5,
    borderRadius: 6
  }

});