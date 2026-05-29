import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  TextInput, TouchableOpacity,
  FlatList, Image
} from "react-native";

/* ✅ FIREBASE */
import { db, storage } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* ✅ IMAGE PICKER */
import * as ImagePicker from "expo-image-picker";

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

  const [image, setImage] = useState(null);

  /* ✅ MEMBERS */
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

  /* ✅ PICK IMAGE */
  const pickImage = async () => {

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  /* ✅ UPLOAD IMAGE */
  const uploadImage = async () => {

    if (!image) return null;

    const response = await fetch(image);
    const blob = await response.blob();

    const fileName = `members/${Date.now()}`;

    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, blob);

    const url = await getDownloadURL(storageRef);

    return url;
  };

  /* ✅ SAVE MEMBER */
  const saveMember = async () => {

    if (!member.name || !member.phone) {
      alert("Name and Phone required");
      return;
    }

    let imageUrl = null;

    if (image) {
      imageUrl = await uploadImage();
    }

    await addDoc(collection(db, "members"), {
      ...member,
      photo: imageUrl,
      createdAt: new Date()
    });

    /* ✅ RESET */
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

    setImage(null);

    alert("✅ Member saved");

    loadMembers();
  };

  /* ✅ FILTER */
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}

        /* ✅ HEADER FORM */
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Member Registration</Text>

            {/* ✅ IMAGE */}
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
              <Text>Select Photo</Text>
            </TouchableOpacity>

            {image && (
              <Image
                source={{ uri: image }}
                style={styles.preview}
              />
            )}

            {/* ✅ FORM */}
            <TextInput placeholder="Name"
              value={member.name}
              onChangeText={(t) => setMember({ ...member, name: t })}
              style={styles.input}
            />

            <TextInput placeholder="Phone"
              value={member.phone}
              onChangeText={(t) => setMember({ ...member, phone: t })}
              style={styles.input}
            />

            <TextInput placeholder="Address"
              value={member.address}
              onChangeText={(t) => setMember({ ...member, address: t })}
              style={styles.input}
            />

            <TextInput placeholder="Occupation"
              value={member.occupation}
              onChangeText={(t) => setMember({ ...member, occupation: t })}
              style={styles.input}
            />

            <TextInput placeholder="Ministry Group"
              value={member.ministry}
              onChangeText={(t) => setMember({ ...member, ministry: t })}
              style={styles.input}
            />

            <TextInput placeholder="Baptism Status"
              value={member.baptismStatus}
              onChangeText={(t) => setMember({ ...member, baptismStatus: t })}
              style={styles.input}
            />

            <TextInput placeholder="Emergency Contact"
              value={member.emergencyContact}
              onChangeText={(t) => setMember({ ...member, emergencyContact: t })}
              style={styles.input}
            />

            <TextInput placeholder="Membership Duration"
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
              style={styles.input}
            />
          </>
        }

        /* ✅ LIST */
        renderItem={({ item }) => (
          <View style={styles.card}>

            <Image
              source={{
                uri: item.photo || "https://via.placeholder.com/50"
              }}
              style={styles.avatar}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.phone}</Text>
              <Text style={styles.sub}>{item.ministry}</Text>
            </View>

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

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: "center"
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10
  },

  name: { fontWeight: "600" },
  sub: { fontSize: 12, color: "#666" },

  photoBtn: {
    backgroundColor: "#ddd",
    padding: 10,
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 10
  },

  preview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10
  }

});