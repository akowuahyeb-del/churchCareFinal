import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert
} from "react-native";

/* ✅ FIREBASE */
import { db, storage } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/* ✅ IMAGE PICKER */
import * as ImagePicker from "expo-image-picker";

export default function MembersScreen() {

  /* ✅ FORM STATE */
  const defaultState = {
    name: "",
    phone: "",
    address: "",
    occupation: "",
    ministry: "",
    baptismStatus: "",
    emergencyContact: "",
    membershipDuration: ""
  };

  const [member, setMember] = useState(defaultState);
  const [image, setImage] = useState(null);

  /* ✅ DATA */
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  /* ✅ LOAD */
  const loadMembers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "members"));

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setMembers(list);
    } catch (e) {
      console.log(e);
    }
  };

  /* ✅ PICK IMAGE */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6
    });

    if (result.canceled) return;

    setImage(result.assets[0].uri);
  };

  /* ✅ UPLOAD IMAGE */
  const uploadImage = async () => {
    if (!image) return null;

    const response = await fetch(image);
    const blob = await response.blob();

    const storageRef = ref(storage, `members/${Date.now()}`);

    await uploadBytes(storageRef, blob);

    return await getDownloadURL(storageRef);
  };

  /* ✅ SAVE */
  const saveMember = async () => {

    if (!member.name || !member.phone) {
      Alert.alert("Error", "Name and phone are required");
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

    clearForm();

    Alert.alert("✅ Success", "Member saved");

    loadMembers();
  };

  /* ✅ CLEAR */
  const clearForm = () => {
    setMember(defaultState);
    setImage(null);
  };

  /* ✅ CANCEL */
  const cancelForm = () => {
    clearForm();
    Alert.alert("Cancelled");
  };

  /* ✅ FILTER */
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 60 }}

        ListHeaderComponent={
          <>
            <Text style={styles.header}>Member Registration</Text>

            {/* ✅ PHOTO PICKER */}
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
              <Text>Select Member Photo</Text>
            </TouchableOpacity>

            {image && (
              <Image source={{ uri: image }} style={styles.preview} />
            )}

            {/* ✅ FORM FIELDS */}

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
              placeholder="Membership Duration"
              value={member.membershipDuration}
              onChangeText={(t) => setMember({ ...member, membershipDuration: t })}
              style={styles.input}
            />

            {/* ✅ BUTTON ROW */}

            <View style={styles.row}>

              <TouchableOpacity style={styles.saveBtn} onPress={saveMember}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.clearBtn} onPress={clearForm}>
                <Text>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={cancelForm}>
                <Text>Cancel</Text>
              </TouchableOpacity>

            </View>

            {/* ✅ SEARCH */}
            <TextInput
              placeholder="Search members..."
              value={search}
              onChangeText={setSearch}
              style={styles.input}
            />
          </>
        }

        renderItem={({ item }) => (
          <View style={styles.card}>

            <Image
              source={{
                uri: item.photo || "https://via.placeholder.com/60"
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
    borderRadius: 8,
    marginBottom: 10
  },

  photoBtn: {
    backgroundColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10
  },

  preview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    alignSelf: "center"
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 10,
    flex: 1,
    marginRight: 5,
    borderRadius: 8,
    alignItems: "center"
  },

  clearBtn: {
    backgroundColor: "#ccc",
    padding: 10,
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center"
  },

  cancelBtn: {
    backgroundColor: "#eee",
    padding: 10,
    flex: 1,
    marginLeft: 5,
    borderRadius: 8,
    alignItems: "center"
  },

  btnText: { color: "#fff" },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center"
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10
  },

  name: { fontWeight: "600" },

  sub: {
    fontSize: 12,
    color: "#666"
  }

});