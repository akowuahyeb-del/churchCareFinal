import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  TextInput, TouchableOpacity,
  FlatList, Alert
} from "react-native";

/* ✅ CAMERA */
import { Camera } from "expo-camera";

/* ✅ FIREBASE */
import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  doc, getDoc, query, where
} from "firebase/firestore";

export default function QRCodeAttendanceScreen({ route }) {

/* ✅ CHURCH */
const selectedChurch = route?.params?.selectedChurch || "church_1";

/* ✅ ROLE */
const userRole = "admin";

/* ✅ STATES */
const [permission, setPermission] = useState(null);
const [scanned, setScanned] = useState(false);

const [members, setMembers] = useState([]);
const [search, setSearch] = useState("");
const [recent, setRecent] = useState([]);

const today = new Date().toISOString().split("T")[0];

/* ✅ SERVICE */
const selectedService = "Sunday Service";
const selectedType = "Main Service";

/* ✅ SERVICE START TIMES */
const serviceStartTimes = {
  "Sunday Service": 9,
  "Midweek Service": 17,
  "Choir Rehearsal": 18,
  "Youth Meeting": 16,
  "Cell Meeting": 19
};

/* ✅ LOAD CAMERA + DATA */
useEffect(() => {
  (async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setPermission(status === "granted");
  })();

  loadMembers();
  loadRecent();
}, []);

/* ✅ MEMBERS */
const loadMembers = async () => {
  const q = query(
    collection(db, "members"),
    where("churchId", "==", selectedChurch)
  );

  const snap = await getDocs(q);

  setMembers(snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  })));
};

/* ✅ RECENT */
const loadRecent = async () => {

  const q = query(
    collection(db, "attendance"),
    where("churchId", "==", selectedChurch)
  );

  const snap = await getDocs(q);

  const list = snap.docs
    .map(d => d.data())
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

  setRecent(list);
};

/* ✅ LATE LOGIC */
const getAttendanceStatus = () => {

  const now = new Date();
  const hour = now.getHours();

  const startHour = serviceStartTimes[selectedService] || 9;

  if (hour > startHour) return "late";

  return "present";
};

/* ✅ SAVE */
const saveAttendance = async (member, memberId, override = false) => {

  const status = getAttendanceStatus();

  await addDoc(collection(db, "attendance"), {
    memberId,
    name: member.name,
    churchId: selectedChurch,

    service: selectedService,
    type: selectedType,

    method: "qr",
    date: today,

    status: status,
    time: new Date(),

    override: override
  });

  Alert.alert(`✅ ${member.name} checked in`);

  loadRecent();
  setScanned(false);
};

/* ✅ SCAN */
const handleScan = async ({ data }) => {

  if (scanned) return;

  setScanned(true);

  try {

    const memberRef = doc(db, "members", data);
    const snap = await getDoc(memberRef);

    if (!snap.exists()) {
      Alert.alert("❌ Member not found");
      setScanned(false);
      return;
    }

    const member = snap.data();

    /* ✅ DUPLICATE CHECK */
    const q = query(
      collection(db, "attendance"),
      where("memberId", "==", data),
      where("date", "==", today),
      where("service", "==", selectedService),
      where("type", "==", selectedType)
    );

    const existing = await getDocs(q);

    if (!existing.empty) {

      if (userRole !== "admin") {
        Alert.alert("⚠ Already checked in");
        setScanned(false);
        return;
      }

      /* ✅ ADMIN OVERRIDE */
      Alert.alert(
        "Already Checked In",
        "Override?",
        [
          { text: "Cancel", onPress: () => setScanned(false) },
          {
            text: "Override",
            onPress: () => saveAttendance(member, data, true)
          }
        ]
      );

      return;
    }

    await saveAttendance(member, data);

  } catch (error) {
    console.log(error);
    setScanned(false);
  }

  setTimeout(() => setScanned(false), 2000);
};

/* ✅ MANUAL */
const markManual = async (member) => {

  const q = query(
    collection(db, "attendance"),
    where("memberId", "==", member.id),
    where("date", "==", today),
    where("service", "==", selectedService),
    where("type", "==", selectedType)
  );

  const existing = await getDocs(q);

  if (!existing.empty && userRole !== "admin") {
    Alert.alert("⚠ Already checked in");
    return;
  }

  await saveAttendance(member, member.id);
};

/* ✅ FILTER */
const filtered = members.filter(m =>
  (m.name || "").toLowerCase().includes(search.toLowerCase())
);

/* ✅ UI */
return (
<View style={styles.container}>

<Text style={styles.header}>QR Check‑in</Text>

{/* ✅ CAMERA */}
<View style={styles.scannerBox}>
{permission && (
  <Camera
    style={{ width: "100%", height: 200 }}
    onBarCodeScanned={scanned ? undefined : handleScan}
    barCodeScannerSettings={{ barCodeTypes: ["qr"] }}
  />
)}
<Text style={styles.scanText}>Scan QR Code</Text>
</View>

{/* ✅ SEARCH */}
<TextInput
placeholder="Search member..."
value={search}
onChangeText={setSearch}
style={styles.input}
/>

{/* ✅ MANUAL RESULTS */}
{search.length > 0 && (
<FlatList
data={filtered}
keyExtractor={item => item.id}
renderItem={({ item }) => (
<TouchableOpacity
style={styles.card}
onPress={() => markManual(item)}
>
<Text>{item.name}</Text>
<Text style={styles.sub}>{item.phone}</Text>
</TouchableOpacity>
)}
/>
)}

{/* ✅ RECENT */}
<Text style={styles.title}>Recent Check-ins</Text>

<FlatList
data={recent}
keyExtractor={(item, i) => i.toString()}
renderItem={({ item }) => (
<View style={styles.card}>
<Text>{item.name}</Text>

<Text
style={{
  color: item.status === "late" ? "#f39c12" : "#27ae60"
}}
>
{item.status} • {new Date(item.time).toLocaleTimeString()}
</Text>

</View>
)}
/>

</View>
);
}

/* ✅ STYLES */
const styles = StyleSheet.create({
container:{flex:1,padding:15},
header:{fontSize:18,fontWeight:"600"},

scannerBox:{
backgroundColor:"#fff",
padding:10,
borderRadius:10,
marginVertical:10
},

scanText:{textAlign:"center",marginTop:5,fontSize:12},

input:{
backgroundColor:"#fff",
padding:10,
borderRadius:8
},

card:{
backgroundColor:"#fff",
padding:10,
marginVertical:5,
borderRadius:8
},

title:{fontWeight:"600",marginTop:10},

sub:{fontSize:12,color:"#666"}
});