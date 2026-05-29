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

/* ✅ DEFAULT STATE */
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
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
  if (!result.canceled) setImage(result.assets[0].uri);
};

/* ✅ TAKE PHOTO */
const takePhoto = async () => {
  const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (!result.canceled) setImage(result.assets[0].uri);
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
  keyExtractor={item => item.id}
  contentContainerStyle={{ paddingBottom: 60 }}

  ListHeaderComponent={
    <>
      <Text style={styles.header}>Member Registration</Text>

      {/* ✅ PHOTO SECTION */}
      <View style={styles.photoContainer}>

        {!image ? (
          <>
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
              <Text>Select from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Text>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelAlt} onPress={() => setImage(null)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Image source={{ uri: image }} style={styles.preview} />

            <View style={styles.row}>
              <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
                <Text style={{ color: "#fff" }}>Change</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
                <Text style={{ color: "#fff" }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

      </View>

      {/* ✅ FIELDS */}
      <TextInput placeholder="Name" value={member.name}
        onChangeText={(t) => setMember({ ...member, name: t })}
        style={styles.input} />

      <TextInput placeholder="Phone" value={member.phone}
        onChangeText={(t) => setMember({ ...member, phone: t })}
        style={styles.input} />

      <TextInput placeholder="Address" value={member.address}
        onChangeText={(t) => setMember({ ...member, address: t })}
        style={styles.input} />

      <TextInput placeholder="Occupation" value={member.occupation}
        onChangeText={(t) => setMember({ ...member, occupation: t })}
        style={styles.input} />

      <TextInput placeholder="Ministry Group" value={member.ministry}
        onChangeText={(t) => setMember({ ...member, ministry: t })}
        style={styles.input} />

      <TextInput placeholder="Baptism Status" value={member.baptismStatus}
        onChangeText={(t) => setMember({ ...member, baptismStatus: t })}
        style={styles.input} />

      <TextInput placeholder="Emergency Contact" value={member.emergencyContact}
        onChangeText={(t) => setMember({ ...member, emergencyContact: t })}
        style={styles.input} />

      <TextInput placeholder="Membership Duration" value={member.membershipDuration}
        onChangeText={(t) => setMember({ ...member, membershipDuration: t })}
        style={styles.input} />

      {/* ✅ BUTTONS */}
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
        source={{ uri: item.photo || "https://via.placeholder.com/60" }}
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

header: { fontSize: 18, fontWeight: "600", marginBottom: 10 },

input: {
  backgroundColor: "#fff",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10
},

photoContainer: { marginBottom: 10 },

photoBtn: {
  backgroundColor: "#ddd",
  padding: 12,
  borderRadius: 8,
  marginBottom: 8,
  alignItems: "center"
},

cancelAlt: { alignItems: "center", marginBottom: 10 },

preview: {
  width: 90,
  height: 90,
  borderRadius: 45,
  alignSelf: "center",
  marginBottom: 10
},

row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },

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
  marginBottom: 10,
  borderRadius: 10,
  alignItems: "center"
},

avatar: {
  width: 60,
  height: 60,
  borderRadius: 30,
  marginRight: 10
},

name: { fontWeight: "600" },
sub: { fontSize: 12, color: "#666" },

changeBtn: {
  backgroundColor: "#4B3F72",
  padding: 10,
  flex: 1,
  marginRight: 5,
  borderRadius: 8,
  alignItems: "center"
},

removeBtn: {
  backgroundColor: "#e74c3c",
  padding: 10,
  flex: 1,
  marginLeft: 5,
  borderRadius: 8,
  alignItems: "center"
}

});