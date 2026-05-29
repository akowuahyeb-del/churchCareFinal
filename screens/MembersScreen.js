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

  /* ✅ MEMBER FORM */
  const [member, setMember] = useState({
    name: "",
    phone: "",
    address: "",
    occupation: "",
    ministry: "",
    baptismStatus: "",
    emergencyContact: "",
    membershipDuration: ""
  });

  /* ✅ MEMBERS LIST */
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  /* ✅ LOAD MEMBERS */
  const loadMembers = async () => {
    const snapshot = await getDocs(collection(db, "members"));

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setMembers(data);
  };

  /* ✅ SAVE MEMBER */
  const saveMember = async () => {

    if (!member.name || !member.phone) {
      alert("Name and Phone are required");
      return;
    }

    await addDoc(collection(db, "members"), {
      ...member,
      createdAt: new Date()
    });

    /* ✅ RESET FORM */
    setMember({
      name: "",
      phone: "",
      address: "",
      occupation: "",
      ministry: "",
      baptismStatus: "",
      emergencyContact: "",
      membershipDuration: ""
    });

    alert("✅ Member saved");

    loadMembers();
  };

  /* ✅ SEARCH FILTER */
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>

      <FlatList
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Member Management</Text>

            {/* ✅ FORM */}

            <TextInput
              placeholder="Name"
              value={member.name}
              onChangeText={(t) => setMember({ ...member, name: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Phone"
              keyboardType="phone-pad"
              value={member.phone}
              onChangeText={(t) => setMember({ ...member, phone: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Address"
              value={member.address}
              onChangeText={(t) => setMember({ ...member, address: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Occupation"
              value={member.occupation}
              onChangeText={(t) => setMember({ ...member, occupation: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Ministry Group"
              value={member.ministry}
              onChangeText={(t) => setMember({ ...member, ministry: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Baptism Status"
              value={member.baptismStatus}
              onChangeText={(t) => setMember({ ...member, baptismStatus: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Emergency Contact"
              value={member.emergencyContact}
              onChangeText={(t) => setMember({ ...member, emergencyContact: t })}
              style={styles.input}
            />

            <TextInput
              placeholder="Membership Duration (e.g 2 years)"
              value={member.membershipDuration}
              onChangeText={(t) => setMember({ ...member, membershipDuration: t })}
              style={styles.input}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveMember}>
              <Text style={{ color: "#fff" }}>Save Member</Text>
            </TouchableOpacity>

            {/* ✅ SEARCH */}
            <TextInput
              placeholder="Search members..."
              value={search}
              onChangeText={setSearch}
              style={styles.search}
            />
          </>
        }

        data={filtered}
        keyExtractor={i => i.id}

        renderItem={({ item }) => (
          <View style={styles.card}>

            <Text style={styles.name}>{item.name}</Text>

            <Text style={styles.sub}>{item.phone}</Text>
            <Text style={styles.sub}>{item.ministry}</Text>
            <Text style={styles.sub}>{item.status}</Text>

          </View>
        )}
      />

    </View>
  );
}

/* ✅ STYLES */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  header: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8
  },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 20
  },

  search: {
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

  name: { fontWeight: "600" },

  sub: { fontSize: 12, color: "#666" }
});
