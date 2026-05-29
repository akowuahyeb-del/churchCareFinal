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

/* ✅ OPTIONS (SMART INPUTS) */
const ministryOptions = [
  "Choir", "Ushering", "Youth", "Prayer Team", "Evangelism"
];

const baptismOptions = [
  "Baptised", "Not Baptised", "Preparing"
];

/* ✅ DEFAULT FORM */
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

const [members, setMembers] = useState([]);
const [search, setSearch] = useState("");

const today = new Date();

/* ✅ LOAD MEMBERS */
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

/* ✅ IMAGE PICK */
const pickImage = async () => {
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
  if (!res.canceled) setImage(res.assets[0].uri);
};

/* ✅ CAMERA */
const takePhoto = async () => {
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (!res.canceled) setImage(res.assets[0].uri);
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

/* ✅ SAVE MEMBER */
const saveMember = async () => {

  if (!member.name || !member.phone) {
    Alert.alert("Error", "Name and phone required");
    return;
  }

  let imageUrl = null;

  if (image) {
    imageUrl = await uploadImage();
  }

  await addDoc(collection(db, "members"), {
    ...member,
    photo: imageUrl,
    createdAt: today
  });

  clearForm();

  Alert.alert("✅ Member saved");

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

  ListHeaderComponent={
    <>
      {/* ✅ HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Member Registration</Text>
      </View>

      {/* ✅ CARD */}
      <View style={styles.card}>

        {/* ✅ PHOTO */}
        <View style={styles.photoSection}>

          {!image ? (
            <>
              <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                <Text>Select Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Text>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setImage(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Image source={{ uri: image }} style={styles.preview} />

              <View style={styles.row}>
                <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
                  <Text style={styles.btnWhite}>Change</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dangerBtn} onPress={() => setImage(null)}>
                  <Text style={styles.btnWhite}>Remove</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ✅ FIELDS */}
        <Input label="Name" value={member.name}
          onChange={(t) => setMember({ ...member, name: t })} />

        <Input label="Phone" value={member.phone}
          onChange={(t) => setMember({ ...member, phone: t })} />

        <Input label="Address" value={member.address}
          onChange={(t) => setMember({ ...member, address: t })} />

        <Input label="Occupation" value={member.occupation}
          onChange={(t) => setMember({ ...member, occupation: t })} />

        {/* ✅ MINISTRY (SMART) */}
        <Text style={styles.label}>Ministry</Text>
        <TextInput
          style={styles.input}
          value={member.ministry}
          onChangeText={(t) => setMember({ ...member, ministry: t })}
          placeholder="Type or select"
        />

        <View style={styles.chipRow}>
          {ministryOptions.map(opt => (
            <TouchableOpacity key={opt} style={styles.chip}
              onPress={() => setMember({ ...member, ministry: opt })}>
              <Text>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ✅ BAPTISM */}
        <Text style={styles.label}>Baptism Status</Text>
        <View style={styles.chipRow}>
          {baptismOptions.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                member.baptismStatus === opt && styles.activeChip
              ]}
              onPress={() =>
                setMember({ ...member, baptismStatus: opt })
              }
            >
              <Text
                style={
                  member.baptismStatus === opt && styles.activeChipText
                }
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Emergency Contact"
          value={member.emergencyContact}
          onChange={(t) =>
            setMember({ ...member, emergencyContact: t })
          } />

        <Input label="Membership Duration"
          value={member.membershipDuration}
          onChange={(t) =>
            setMember({ ...member, membershipDuration: t })
          } />

        {/* ✅ BUTTONS */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.primaryBtn} onPress={saveMember}>
            <Text style={styles.btnWhite}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={clearForm}>
            <Text>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={cancelForm}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ SEARCH */}
        <TextInput
          style={styles.input}
          placeholder="Search members..."
          value={search}
          onChangeText={setSearch}
        />

      </View>
    </>
  }

  renderItem={({ item }) => (
    <View style={styles.listCard}>
      <Image
        source={{ uri: item.photo || "https://via.placeholder.com/60" }}
        style={styles.avatar}
      />
      <View>
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

/* ✅ INPUT COMPONENT */
const Input = ({ label, value, onChange }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ fontSize: 12, color: "#666" }}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChange} />
  </View>
);

/* ✅ STYLES */
const styles = StyleSheet.create({

container: { flex: 1, backgroundColor: "#f4f6fb" },

header: {
  backgroundColor: "#4B3F72",
  padding: 30
},

headerText: { color: "#fff", fontSize: 18, fontWeight: "600" },

card: {
  backgroundColor: "#fff",
  margin: 15,
  padding: 15,
  borderRadius: 15
},

input: {
  backgroundColor: "#f7f8fb",
  padding: 10,
  borderRadius: 8,
  marginTop: 5
},

photoSection: { alignItems: "center", marginBottom: 15 },

photoBtn: {
  backgroundColor: "#ddd",
  padding: 10,
  borderRadius: 8,
  marginBottom: 6
},

preview: {
  width: 80,
  height: 80,
  borderRadius: 40,
  marginBottom: 10
},

row: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 10
},

primaryBtn: {
  flex: 1,
  backgroundColor: "#4B3F72",
  padding: 10,
  borderRadius: 8,
  marginRight: 5,
  alignItems: "center"
},

secondaryBtn: {
  flex: 1,
  backgroundColor: "#ddd",
  padding: 10,
  borderRadius: 8,
  marginHorizontal: 5,
  alignItems: "center"
},

cancelBtn: {
  flex: 1,
  backgroundColor: "#eee",
  padding: 10,
  borderRadius: 8,
  marginLeft: 5,
  alignItems: "center"
},

btnWhite: { color: "#fff" },

dangerBtn: {
  flex: 1,
  backgroundColor: "#e74c3c",
  padding: 10,
  borderRadius: 8,
  marginLeft: 5,
  alignItems: "center"
},

cancelText: { marginTop: 5, color: "#666" },

chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },

chip: {
  backgroundColor: "#eee",
  padding: 6,
  borderRadius: 15,
  marginRight: 6,
  marginBottom: 6
},

activeChip: { backgroundColor: "#4B3F72" },

activeChipText: { color: "#fff" },

listCard: {
  flexDirection: "row",
  backgroundColor: "#fff",
  marginHorizontal: 15,
  marginBottom: 8,
  padding: 10,
  borderRadius: 10
},

avatar: {
  width: 50,
  height: 50,
  borderRadius: 25,
  marginRight: 10
},

name: { fontWeight: "600" },
sub: { fontSize: 12, color: "#666" }

});
``