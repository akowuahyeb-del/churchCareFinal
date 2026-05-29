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
/* ✅ ONLY ADDITION → ministries (NO REMOVAL) */
const defaultState = {
  name: "",
  phone: "",
  address: "",
  occupation: "",
  ministry: "",          // 🔵 kept (NO CHANGE)
  ministries: [],        // ✅ added (multi-select)
  baptismStatus: "",
  emergencyContact: "",
  membershipDuration: ""
};

const [member, setMember] = useState(defaultState);
const [image, setImage] = useState(null);

/* ✅ NEW (PHOTO MENU CONTROL) */
const [showPhotoOptions, setShowPhotoOptions] = useState(false);

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

/* ✅ IMAGE PICK (UNCHANGED, just close menu added) */
const pickImage = async () => {
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });

  setShowPhotoOptions(false); // ✅ close menu

  if (!res.canceled) setImage(res.assets[0].uri);
};

/* ✅ CAMERA FIXED ✅ */
const takePhoto = async () => {

  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    Alert.alert("Permission Required", "Please allow camera access");
    return;
  }

  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });

  setShowPhotoOptions(false);

  if (!res.canceled) setImage(res.assets[0].uri);
};

/* ✅ MULTI-MINISTRY TOGGLE (ADDED ONLY) */
const toggleMinistry = (opt) => {

  let list = member.ministries || [];

  if (list.includes(opt)) {
    list = list.filter(m => m !== opt);
  } else {
    list.push(opt);
  }

  setMember({ ...member, ministries: list });
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
    ...member,   // ✅ keeps BOTH ministry + ministries
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
<View style={styles.header}>
<Text style={styles.headerText}>Member Registration</Text>
</View>

<View style={styles.card}>

{/* ✅ PHOTO SECTION (UPDATED UX ONLY) */}
<View style={styles.photoSection}>

<TouchableOpacity
style={styles.photoBtn}
onPress={() => setShowPhotoOptions(!showPhotoOptions)}
>
<Text>Select / Take Photo</Text>
</TouchableOpacity>

{/* ✅ NEW MENU */}
{showPhotoOptions && (
<View style={styles.photoOptions}>
<TouchableOpacity onPress={pickImage}>
<Text style={styles.optionText}>📁 Gallery</Text>
</TouchableOpacity>

<TouchableOpacity onPress={takePhoto}>
<Text style={styles.optionText}>📷 Camera</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => setShowPhotoOptions(false)}>
<Text style={styles.cancelText}>Cancel</Text>
</TouchableOpacity>
</View>
)}

{image && (
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

{/* ✅ EXISTING INPUTS (UNCHANGED) */}
<Input label="Name" value={member.name}
onChange={(t) => setMember({ ...member, name: t })} />

<Input label="Phone" value={member.phone}
onChange={(t) => setMember({ ...member, phone: t })} />

<Input label="Address" value={member.address}
onChange={(t) => setMember({ ...member, address: t })} />

<Input label="Occupation" value={member.occupation}
onChange={(t) => setMember({ ...member, occupation: t })} />

{/* ✅ EXISTING MINISTRY INPUT (KEPT) */}
<Text style={styles.label}>Ministry</Text>
<TextInput
style={styles.input}
value={member.ministry}
onChangeText={(t) => setMember({ ...member, ministry: t })}
placeholder="Type ministry"
/>

{/* ✅ NEW MULTI-SELECT (ADDED ONLY) */}
<View style={styles.chipRow}>
{ministryOptions.map(opt => {

const selected = member.ministries?.includes(opt);

return (
<TouchableOpacity
key={opt}
style={[
styles.chip,
selected && styles.activeChip
]}
onPress={() => toggleMinistry(opt)}
>
<Text style={selected && styles.activeChipText}>
{opt}
</Text>
</TouchableOpacity>
);
})}
</View>

{/* ✅ BAPTISM (UNCHANGED) */}
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
<Text style={
member.baptismStatus === opt && styles.activeChipText
}>
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

{/* ✅ BUTTONS (UNCHANGED) */}
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

{/* ✅ SAFE DISPLAY (OLD + NEW DATA) */}
<Text style={styles.sub}>
{item.ministries?.length > 0
? item.ministries.join(", ")
: item.ministry}
</Text>

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

/* ✅ YOUR ORIGINAL STYLES + SMALL ADDITIONS */
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
sub: { fontSize: 12, color: "#666" },

/* ✅ NEW ONLY */
photoOptions: {
backgroundColor: "#fff",
padding: 10,
borderRadius: 8,
marginTop: 6
},

optionText: {
marginBottom: 8
}

});