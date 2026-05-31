import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity,
  TextInput, Alert
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera, CameraView } from "expo-camera";

import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  deleteDoc, doc, query, where
} from "firebase/firestore";

export default function AttendanceScreen() {

/* ✅ ROLE */
const userRole = "admin";

/* ✅ MODE */
const [mode, setMode] = useState("manual");

/* ✅ CAMERA */
const [permission, setPermission] = useState(false);
const [scanned, setScanned] = useState(false);

/* ✅ DATE */
const [dateObj, setDateObj] = useState(new Date());
const [showPicker, setShowPicker] = useState(false);
const today = dateObj.toISOString().split("T")[0];

/* ✅ CHURCH */
const [selectedChurch, setSelectedChurch] = useState("church_1");

/* ✅ MEMBERS */
const [members, setMembers] = useState([]);
const [searchMember, setSearchMember] = useState("");

/* ✅ SERVICE */
const [selectedService] = useState("Sunday Service");
const [selectedType] = useState("First Service");

/* ✅ ATTENDANCE */
const [attendance, setAttendance] = useState({});
const [presentCount, setPresentCount] = useState(0);

/* ✅ CAMERA PERMISSION */
useEffect(() => {
  (async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setPermission(status === "granted");
  })();
}, []);

/* ✅ LOAD MEMBERS */
useEffect(() => { loadMembers(); }, [selectedChurch]);

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

/* ✅ LOAD ATTENDANCE */
useEffect(() => { loadAttendance(); },
[selectedChurch, dateObj, selectedService, selectedType]);

const loadAttendance = async () => {

  const q = query(
    collection(db, "attendance"),
    where("churchId", "==", selectedChurch)
  );

  const snap = await getDocs(q);

  let map = {};
  let present = 0;

  snap.docs.forEach(d => {
    const data = d.data();

    if (
      data.date === today &&
      data.service === selectedService &&
      data.type === selectedType
    ) {
      map[data.memberId] = {
        id: d.id,
        status: data.status
      };

      if (data.status === "present") present++;
    }
  });

  setAttendance(map);
  setPresentCount(present);
};

/* ✅ MANUAL ATTENDANCE */
const toggleAttendance = async (member, status) => {

  const existing = attendance[member.id];

  if (existing && userRole !== "admin") return;

  if (existing) {
    await deleteDoc(doc(db, "attendance", existing.id));
  }

  await addDoc(collection(db, "attendance"), {
    memberId: member.id,
    name: member.name,
    churchId: selectedChurch,
    service: selectedService,
    type: selectedType,
    date: today,
    status
  });

  loadAttendance();
};

/* ✅ QR SCAN */
const handleScan = async ({ data }) => {

  if (scanned) return;
  setScanned(true);

  const member = members.find(m => m.id === data);

  if (!member) {
    Alert.alert("Member not found");
    setScanned(false);
    return;
  }

  await toggleAttendance(member, "present");

  setTimeout(() => setScanned(false), 2000);
};

/* ✅ FILTER */
const filtered = members.filter(m =>
  (m.name || "").toLowerCase().includes(searchMember.toLowerCase())
);

return (
<View style={styles.container}>

<Text style={styles.header}>Attendance</Text>

{/* ✅ DATE */}
<TouchableOpacity
  style={styles.box}
  onPress={() => setShowPicker(true)}
>
  <Text>{today}</Text>
</TouchableOpacity>

{showPicker && (
  <DateTimePicker
    value={dateObj}
    mode="date"
    onChange={(e, d) => {
      setShowPicker(false);
      if (d) setDateObj(d);
    }}
  />
)}

<Text style={styles.presentText}>
  Today's Present: {presentCount}
</Text>

{/* ✅ MODE SWITCH */}
<View style={styles.modeRow}>

  <TouchableOpacity
    style={[styles.modeBtn, mode === "manual" && styles.activeMode]}
    onPress={() => setMode("manual")}
  >
    <Text style={mode === "manual" && styles.white}>Manual</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.modeBtn, mode === "qr" && styles.activeMode]}
    onPress={() => setMode("qr")}
  >
    <Text style={mode === "qr" && styles.white}>QR Scan</Text>
  </TouchableOpacity>

</View>

{/* ✅ QR CAMERA */}
{mode === "qr" && (
  <View style={styles.cameraBox}>

    {permission ? (
      <CameraView
        style={{ height: 200 }}
        barcodeScannerEnabled={true}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
    ) : (
      <Text>Camera permission required</Text>
    )}

    <Text style={styles.scanText}>Scan QR Code</Text>

  </View>
)}

{/* ✅ MANUAL MODE */}
{mode === "manual" && (
  <View>

    <TextInput
      placeholder="Search members..."
      value={searchMember}
      onChangeText={setSearchMember}
      style={styles.input}
    />

    <FlatList
      data={filtered}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => {

        const status = attendance[item.id]?.status;

        return (
          <View style={styles.card}>

            <Text>{item.name}</Text>

            <View style={{ flexDirection: "row" }}>

              <TouchableOpacity
                style={[
                  styles.btn,
                  status === "present" && styles.present
                ]}
                onPress={() => toggleAttendance(item, "present")}
              >
                <Text style={styles.white}>Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  status === "absent" && styles.absent
                ]}
                onPress={() => toggleAttendance(item, "absent")}
              >
                <Text style={styles.white}>Absent</Text>
              </TouchableOpacity>

            </View>

          </View>
        );
      }}
    />

  </View>
)}

</View>
);
}

const styles = StyleSheet.create({
container:{flex:1,padding:15},
header:{fontSize:18},

box:{backgroundColor:"#fff",padding:10,marginVertical:5},
presentText:{marginVertical:10,fontWeight:"600"},

modeRow:{flexDirection:"row",marginVertical:10},

modeBtn:{
flex:1,
backgroundColor:"#ddd",
padding:10,
marginRight:5,
borderRadius:8,
alignItems:"center"
},

activeMode:{backgroundColor:"#4B3F72"},

cameraBox:{
backgroundColor:"#fff",
padding:10,
borderRadius:10,
marginVertical:10
},

scanText:{textAlign:"center",fontSize:12,color:"#666"},

input:{backgroundColor:"#fff",padding:10,marginVertical:5},

card:{backgroundColor:"#fff",padding:10,marginVertical:5},

btn:{backgroundColor:"#bbb",padding:8,marginRight:5},
present:{backgroundColor:"#27ae60"},
absent:{backgroundColor:"#e74c3c"},

white:{color:"#fff"}
});