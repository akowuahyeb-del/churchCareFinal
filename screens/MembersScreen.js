import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  TextInput, TouchableOpacity,
  FlatList
} from "react-native";

/* ✅ FIREBASE */
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function MembersScreen() {

  const [member, setMember] = useState({
    name: "",
    phone: "",
    ministry: ""
  });

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const snapshot = await getDocs(collection(db, "members"));

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setMembers(data);
  };

  const saveMember = async () => {

    if (!member.name) return;

    await addDoc(collection(db, "members"), {
      name: member.name,
      phone: member.phone,
      ministry: member.ministry,
      createdAt: new Date()
    });

    setMember({ name: "", phone: "", ministry: "" });

    loadMembers();
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>

      <FlatList
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Members</Text>

            <TextInput
              placeholder="Name"
              value={member.name}
              onChangeText={(t) => setMember({ ...member, name: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Phone"
              value={member.phone}
              onChangeText={(t) => setMember({ ...member, phone: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Ministry"
              value={member.ministry}
              onChangeText={(t) => setMember({ ...member, ministry: t })}
              style={styles.input}
            />

            <TouchableOpacity style={styles.btn} onPress={saveMember}>
              <Text style={{ color: "#fff" }}>Save Member</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="Search..."
              value={search}
              onChangeText={setSearch}
              style={styles.input}
            />
          </>
        }
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>{item.phone}</Text>
            <Text>{item.ministry}</Text>
          </View>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 18, marginBottom: 10 },

  input: {
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 10
  },

  card: {
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8
  },

  name: { fontWeight: "600" }
});