import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity,
  TextInput, Alert, Modal
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { CameraView, Camera } from "expo-camera";

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
const [selectedChurch] = useState("church_1");

/* ✅ MEMBERS */
const [members, setMembers] = useState([]);
const [searchMember, setSearchMember] = useState("");

/* ✅ SERVICES DATA */
const [services, setServices] = useState(["Sunday"]);
const [types, setTypes] = useState(["First"]);
const [events, setEvents] = useState(["General Service"]);

const [selectedService, setSelectedService] = useState("Sunday");
const [selectedType, setSelectedType] = useState("First");
const [selectedEvent, setSelectedEvent] = useState("General Service");

/* ✅ DROPDOWN */
const [showServiceDropdown, setShowServiceDropdown] = useState(false);
const [showTypeDropdown, setShowTypeDropdown] = useState(false);
const [showEventDropdown, setShowEventDropdown] = useState(false);

/* ✅ MODAL */
const [modalVisible, setModalVisible] = useState(false);
const [modalType, setModalType] = useState("");
const [inputValue, setInputValue] = useState("");
const [editingIndex, setEditingIndex] = useState(null);

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

/* ✅ ✅ FIXED MEMBERS LOAD */
useEffect(() => { loadMembers(); }, []);

const loadMembers = async () => {
  try {
    const q = query(
      collection(db, "members"),
      where("churchId", "==", selectedChurch)
    );

    const snap = await getDocs(q);

    let data = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // ✅ fallback if empty
    if (data.length === 0) {
      const snapAll = await getDocs(collection(db, "members"));

      data = snapAll.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }

    setMembers(data);

  } catch (error) {
    console.log(error);
  }
};

/* ✅ LOAD ATTENDANCE */
useEffect(() => { loadAttendance(); },
[dateObj, selectedService, selectedType]);

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

/* ✅ MODAL SAVE */
const handleSave = () => {
  if (!inputValue) return;

  let list, setter;

  if (modalType === "service") {
    list = services; setter = setServices;
  } else if (modalType === "type") {
    list = types; setter = setTypes;
  } else {
    list = events; setter = setEvents;
  }

  if (editingIndex !== null) {
    const updated = [...list];
    updated[editingIndex] = inputValue;
    setter(updated);
  } else {
    setter([...list, inputValue]);
  }

  resetModal();
};

/* ✅ DELETE */
const handleDelete = () => {

  let list, setter;

  if (modalType === "service") {
    list = services; setter = setServices;
  } else if (modalType === "type") {
    list = types; setter = setTypes;
  } else {
    list = events; setter = setEvents;
  }

  const updated = list.filter((_, i) => i !== editingIndex);
  setter(updated);

  resetModal();
};

/* ✅ RESET */
const resetModal = () => {
  setModalVisible(false);
  setEditingIndex(null);
  setInputValue("");
};

/* ✅ TOGGLE */
const toggleAttendance = async (member, status) => {

  const existing = attendance[member.id];

  if (existing && existing.status === status) {
    await deleteDoc(doc(db, "attendance", existing.id));
  } else {
    if (existing) {
      await deleteDoc(doc(db, "attendance", existing.id));
    }

    await addDoc(collection(db, "attendance"), {
      memberId: member.id,
      name: member.name,
      churchId: selectedChurch,
      service: selectedService,
      type: selectedType,
      event: selectedEvent,
      date: today,
      status
    });
  }

  loadAttendance();
};

/* ✅ FILTER */
const filtered = members.filter(m =>
  (m.name || "").toLowerCase().includes(searchMember.toLowerCase())
);

return (
<View style={styles.container}>

<Text style={styles.header}>Attendance</Text>

{/* DATE */}
<TouchableOpacity style={styles.box} onPress={()=>setShowPicker(true)}>
<Text>{today}</Text>
</TouchableOpacity>

{showPicker && (
<DateTimePicker
value={dateObj}
mode="date"
onChange={(e,d)=>{setShowPicker(false); if(d)setDateObj(d)}}
/>
)}

{/* ✅ SERVICE */}
<View>
<TouchableOpacity style={styles.box}
onPress={()=>setShowServiceDropdown(!showServiceDropdown)}>
<Text>Service: {selectedService}</Text>
</TouchableOpacity>

{showServiceDropdown && (
<View style={{backgroundColor:"#fff",padding:10}}>
{services.map((s,i)=>(
<TouchableOpacity key={i}
onPress={()=>{setSelectedService(s);setShowServiceDropdown(false)}}
onLongPress={()=>{setEditingIndex(i);setInputValue(s);setModalType("service");setModalVisible(true)}}
>
<Text>{s}</Text>
</TouchableOpacity>
))}
<TouchableOpacity onPress={()=>{setModalType("service");setModalVisible(true)}}>
<Text style={styles.link}>+ Add Service</Text>
</TouchableOpacity>
</View>
)}
</View>

{/* ✅ TYPE */}
<View>
<TouchableOpacity style={styles.box}
onPress={()=>setShowTypeDropdown(!showTypeDropdown)}>
<Text>Type: {selectedType}</Text>
</TouchableOpacity>

{showTypeDropdown && (
<View style={{backgroundColor:"#fff",padding:10}}>
{types.map((t,i)=>(
<TouchableOpacity key={i}
onPress={()=>{setSelectedType(t);setShowTypeDropdown(false)}}
onLongPress={()=>{setEditingIndex(i);setInputValue(t);setModalType("type");setModalVisible(true)}}
>
<Text>{t}</Text>
</TouchableOpacity>
))}
<TouchableOpacity onPress={()=>{setModalType("type");setModalVisible(true)}}>
<Text style={styles.link}>+ Add Type</Text>
</TouchableOpacity>
</View>
)}
</View>

{/* ✅ EVENT */}
<View>
<TouchableOpacity style={styles.box}
onPress={()=>setShowEventDropdown(!showEventDropdown)}>
<Text>Event: {selectedEvent}</Text>
</TouchableOpacity>

{showEventDropdown && (
<View style={{backgroundColor:"#fff",padding:10}}>
{events.map((e,i)=>(
<TouchableOpacity key={i}
onPress={()=>{setSelectedEvent(e);setShowEventDropdown(false)}}
onLongPress={()=>{setEditingIndex(i);setInputValue(e);setModalType("event");setModalVisible(true)}}
>
<Text>{e}</Text>
</TouchableOpacity>
))}
<TouchableOpacity onPress={()=>{setModalType("event");setModalVisible(true)}}>
<Text style={styles.link}>+ Add Event</Text>
</TouchableOpacity>
</View>
)}
</View>

<Text style={styles.presentText}>Present: {presentCount}</Text>

{/* MODE */}
<View style={styles.modeRow}>
<TouchableOpacity style={[styles.modeBtn, mode==="manual" && styles.activeMode]}
onPress={()=>setMode("manual")}>
<Text style={mode==="manual" && styles.white}>Manual</Text>
</TouchableOpacity>

<TouchableOpacity style={[styles.modeBtn, mode==="qr" && styles.activeMode]}
onPress={()=>setMode("qr")}>
<Text style={mode==="qr" && styles.white}>QR Scan</Text>
</TouchableOpacity>
</View>

{/* ✅ MEMBERS */}
{mode==="manual" && (
<View style={{flex:1}}>

<TextInput
placeholder="Search members..."
value={searchMember}
onChangeText={setSearchMember}
style={styles.input}
/>

<FlatList
style={{flex:1}}
contentContainerStyle={{paddingBottom:60}}
data={filtered}
extraData={attendance}
keyExtractor={(i)=>i.id}
renderItem={({item})=>{
const status = attendance[item.id]?.status;

return (
<View style={styles.card}>
<Text>{item.name}</Text>

<View style={{flexDirection:"row"}}>
<TouchableOpacity
style={[styles.btn, status==="present" && styles.present]}
onPress={()=>toggleAttendance(item,"present")}
>
<Text style={styles.white}>Present</Text>
</TouchableOpacity>

<TouchableOpacity
style={[styles.btn, status==="absent" && styles.absent]}
onPress={()=>toggleAttendance(item,"absent")}
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

{/* ✅ MODAL */}
<Modal visible={modalVisible} transparent>
<View style={styles.modal}>
<View style={styles.modalBox}>

<TextInput value={inputValue}
onChangeText={setInputValue}
style={styles.input}
/>

<View style={{flexDirection:"row"}}>
<TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
<Text style={styles.white}>Save</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
<Text style={styles.white}>Cancel</Text>
</TouchableOpacity>
</View>

{editingIndex !== null && (
<TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
<Text style={styles.white}>Delete</Text>
</TouchableOpacity>
)}

</View>
</View>
</Modal>

</View>
);
}

const styles = StyleSheet.create({
container:{flex:1,padding:15},
header:{fontSize:18},

box:{backgroundColor:"#fff",padding:10,marginVertical:5},
link:{color:"#4B3F72",marginTop:5},

presentText:{marginVertical:10,fontWeight:"600"},

modeRow:{flexDirection:"row",marginVertical:10},
modeBtn:{flex:1,backgroundColor:"#ddd",padding:10,marginRight:5,borderRadius:8,alignItems:"center"},
activeMode:{backgroundColor:"#4B3F72"},

cameraBox:{backgroundColor:"#fff",padding:10,marginVertical:10},

input:{backgroundColor:"#fff",padding:10,marginVertical:5},

card:{backgroundColor:"#fff",padding:10,marginVertical:5},

btn:{backgroundColor:"#bbb",padding:8,marginRight:5},
present:{backgroundColor:"#27ae60"},
absent:{backgroundColor:"#e74c3c"},
white:{color:"#fff"},

modal:{flex:1,justifyContent:"center",backgroundColor:"rgba(0,0,0,0.5)"},
modalBox:{backgroundColor:"#fff",margin:20,padding:15,borderRadius:10},

saveBtn:{backgroundColor:"#27ae60",padding:10,flex:1,marginRight:5,alignItems:"center"},
cancelBtn:{backgroundColor:"#888",padding:10,flex:1,alignItems:"center"},
deleteBtn:{backgroundColor:"#e74c3c",padding:10,marginTop:10,alignItems:"center"},
});
