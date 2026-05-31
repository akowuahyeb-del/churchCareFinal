import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  TextInput, TouchableOpacity,
  FlatList, Modal, Alert
} from "react-native";

import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  updateDoc, deleteDoc, doc
} from "firebase/firestore";

import QRCode from "react-native-qrcode-svg";
import * as ImagePicker from "expo-image-picker";

export default function MembersScreen() {

//////////////////////////////////////////////////////////////
/* ✅ ROLE CONTROL */
//////////////////////////////////////////////////////////////

const userRole = "admin"; // 🔁 change later

//////////////////////////////////////////////////////////////
/* ✅ STATE */
//////////////////////////////////////////////////////////////

const defaultMember = {
  name: "",
  phone: "",
  address: "",
  occupation: "",
  ministry: "",
  baptismStatus: "",
  status: "",
  emergencyContact: "",
  membershipDuration: ""
};

const [member, setMember] = useState(defaultMember);
const [members, setMembers] = useState([]);
const [search, setSearch] = useState("");

const [editingId, setEditingId] = useState(null);
const [showForm, setShowForm] = useState(true);
const [saving, setSaving] = useState(false);

const [selectedQR, setSelectedQR] = useState(null);
const [image, setImage] = useState(null);

//////////////////////////////////////////////////////////////
/* ✅ LIST DATA */
//////////////////////////////////////////////////////////////

const [ministries, setMinistries] = useState(["Choir","Ushering","Youth"]);
const [baptismList, setBaptismList] = useState(["Baptised","Not Baptised"]);
const [statusList, setStatusList] = useState(["Regular","Visitor"]);

//////////////////////////////////////////////////////////////
/* ✅ MODALS */
//////////////////////////////////////////////////////////////

const [ministryModal,setMinistryModal]=useState(false);
const [ministryInput,setMinistryInput]=useState("");
const [ministryIndex,setMinistryIndex]=useState(null);

const [baptismModal,setBaptismModal]=useState(false);
const [baptismInput,setBaptismInput]=useState("");
const [baptismIndex,setBaptismIndex]=useState(null);

const [statusModal,setStatusModal]=useState(false);
const [statusInput,setStatusInput]=useState("");
const [statusIndex,setStatusIndex]=useState(null);

//////////////////////////////////////////////////////////////
/* ✅ LOAD MEMBERS */
//////////////////////////////////////////////////////////////

useEffect(()=>{loadMembers();},[]);

const loadMembers=async()=>{
  const snap=await getDocs(collection(db,"members"));
  setMembers(snap.docs.map(d=>({id:d.id,...d.data()})));
};

//////////////////////////////////////////////////////////////
/* ✅ IMAGE PICK */
//////////////////////////////////////////////////////////////

const pickImage = async () => {
  const res = await ImagePicker.launchImageLibraryAsync({
    quality: 0.6
  });

  if (!res.canceled) {
    setImage(res.assets[0].uri);
  }
};

//////////////////////////////////////////////////////////////
/* ✅ SAVE MEMBER */
//////////////////////////////////////////////////////////////

const saveMember = async () => {

  if (saving) return;

  if (!member.name || !member.phone) {
    Alert.alert("Name & phone required");
    return;
  }

  setSaving(true);

  try {

    if (editingId) {
      await updateDoc(doc(db,"members",editingId), {
        ...member,
        image
      });
      Alert.alert("✅ Updated","Member updated");
    } else {
      await addDoc(collection(db,"members"),{
        ...member,
        image,
        createdAt:new Date()
      });
      Alert.alert("✅ Success","Member saved successfully");
    }

    setMember(defaultMember);
    setEditingId(null);
    setImage(null);

    loadMembers();
    setShowForm(false);

  } catch(e){
    Alert.alert("Error","Operation failed");
  }

  setSaving(false);
};

//////////////////////////////////////////////////////////////
/* ✅ DELETE */
//////////////////////////////////////////////////////////////

const deleteMember = (id) => {
  Alert.alert("Delete Member","Are you sure?",[
    {text:"Cancel"},
    {
      text:"Delete",
      style:"destructive",
      onPress: async ()=>{
        await deleteDoc(doc(db,"members",id));
        loadMembers();
      }
    }
  ]);
};

//////////////////////////////////////////////////////////////
/* ✅ FORM CONTROL */
//////////////////////////////////////////////////////////////

const clearForm = ()=>{
  setMember(defaultMember);
  setImage(null);
};

const cancelForm = ()=>{
  setMember(defaultMember);
  setEditingId(null);
  setShowForm(false);
};

//////////////////////////////////////////////////////////////
/* ✅ GENERIC SAVE */
//////////////////////////////////////////////////////////////

const saveList=(input,index,list,setList,close)=>{
  if(!input.trim())return;

  if(index!==null){
    const updated=[...list];
    updated[index]=input;
    setList(updated);
  } else {
    setList(prev=>[...prev,input]);
  }

  close();
};

//////////////////////////////////////////////////////////////
/* ✅ CLOSE MODALS */
//////////////////////////////////////////////////////////////

const closeMinistryModal=()=>{setMinistryModal(false);setMinistryInput("");setMinistryIndex(null);};
const closeBaptismModal=()=>{setBaptismModal(false);setBaptismInput("");setBaptismIndex(null);};
const closeStatusModal=()=>{setStatusModal(false);setStatusInput("");setStatusIndex(null);};

//////////////////////////////////////////////////////////////
/* ✅ FILTER */
//////////////////////////////////////////////////////////////

const filtered=members.filter(m =>
  (m.name || "").toLowerCase().includes(search.toLowerCase())
);

//////////////////////////////////////////////////////////////
/* ✅ UI */
//////////////////////////////////////////////////////////////

return (
<View style={styles.container}>

{/* ✅ COLLAPSIBLE HEADER */}
<TouchableOpacity onPress={()=>setShowForm(!showForm)}>
<Text style={styles.header}>
{showForm?"▼":"▶"} Member Registration
</Text>
</TouchableOpacity>

{/* ✅ FORM */}
{showForm && userRole==="admin" && (
<>
<Input label="Name" value={member.name} onChange={t=>setMember({...member,name:t})}/>
<Input label="Phone" value={member.phone} onChange={t=>setMember({...member,phone:t})}/>
<Input label="Address" value={member.address} onChange={t=>setMember({...member,address:t})}/>
<Input label="Occupation" value={member.occupation} onChange={t=>setMember({...member,occupation:t})}/>
<Input label="Emergency Contact" value={member.emergencyContact} onChange={t=>setMember({...member,emergencyContact:t})}/>

{/* ✅ IMAGE */}
<TouchableOpacity style={styles.btn} onPress={pickImage}>
<Text style={styles.white}>
{image ? "Change Photo" : "Upload Photo"}
</Text>
</TouchableOpacity>

{/* ✅ CHIPS */}
<Chips label="Ministry" list={ministries}
value={member.ministry}
onSelect={v=>setMember({...member,ministry:v})}
onEdit={(i)=>{setMinistryIndex(i);setMinistryInput(ministries[i]);setMinistryModal(true)}}
onAdd={()=>setMinistryModal(true)}/>

<Chips label="Baptism" list={baptismList}
value={member.baptismStatus}
onSelect={v=>setMember({...member,baptismStatus:v})}
onEdit={(i)=>{setBaptismIndex(i);setBaptismInput(baptismList[i]);setBaptismModal(true)}}
onAdd={()=>setBaptismModal(true)}/>

<Chips label="Status" list={statusList}
value={member.status}
onSelect={v=>setMember({...member,status:v})}
onEdit={(i)=>{setStatusIndex(i);setStatusInput(statusList[i]);setStatusModal(true)}}
onAdd={()=>setStatusModal(true)}/>

{/* ✅ BUTTONS */}
<TouchableOpacity style={styles.btn} onPress={saveMember} disabled={saving}>
<Text style={styles.white}>
{saving?"Saving...":editingId?"Update":"Save"}
</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.smallBtn} onPress={clearForm}>
<Text>Clear</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.smallBtn} onPress={cancelForm}>
<Text style={{color:"red"}}>Cancel</Text>
</TouchableOpacity>

</>
)}

{/* ✅ ADD BUTTON */}
{userRole==="admin" && (
<TouchableOpacity style={styles.addBtn} onPress={()=>{
setMember(defaultMember);
setEditingId(null);
setShowForm(true);
}}>
<Text style={styles.white}>+ Add Member</Text>
</TouchableOpacity>
)}

{/* ✅ SPACING */}
<View style={styles.divider} />

<Text style={styles.sectionHeader}>Member List</Text>

<View style={styles.listContainer}>
<FlatList
data={filtered}
keyExtractor={i=>i.id}
renderItem={({item})=>(
<View style={styles.card}>

<Text>{item.name}</Text>

<View style={styles.rowBetween}>

<TouchableOpacity onPress={()=>setSelectedQR(item.id)}>
<QRCode value={item.id} size={60}/>
</TouchableOpacity>

{userRole==="admin" && (
<View style={{flexDirection:"row"}}>

<TouchableOpacity style={styles.editBtn}
onPress={()=>{setMember(item);setEditingId(item.id);setShowForm(true);}}>
<Text style={styles.white}>Edit</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.deleteBtn}
onPress={()=>deleteMember(item.id)}>
<Text style={styles.white}>Delete</Text>
</TouchableOpacity>

</View>
)}

</View>

</View>
)}
/>
</View>

{/* ✅ QR MODAL */}
<Modal visible={!!selectedQR} transparent>
<View style={styles.modalWrap}>
<View style={styles.modalBox}>
<QRCode value={selectedQR} size={200}/>
<TouchableOpacity onPress={()=>setSelectedQR(null)}>
<Text>Close</Text>
</TouchableOpacity>
</View>
</View>
</Modal>

{/* ✅ MINISTRY MODAL */}
<Modal visible={ministryModal} transparent>
<ModalBox
title={ministryIndex!==null?"Edit Ministry":"Add Ministry"}
value={ministryInput}
onChange={setMinistryInput}
onSave={()=>saveList(ministryInput,ministryIndex,ministries,setMinistries,closeMinistryModal)}
onCancel={closeMinistryModal}
/>
</Modal>

{/* ✅ BAPTISM MODAL */}
<Modal visible={baptismModal} transparent>
<ModalBox
title={baptismIndex!==null?"Edit Baptism":"Add Baptism"}
value={baptismInput}
onChange={setBaptismInput}
onSave={()=>saveList(baptismInput,baptismIndex,baptismList,setBaptismList,closeBaptismModal)}
onCancel={closeBaptismModal}
/>
</Modal>

{/* ✅ STATUS MODAL */}
<Modal visible={statusModal} transparent>
<ModalBox
title={statusIndex!==null?"Edit Status":"Add Status"}
value={statusInput}
onChange={setStatusInput}
onSave={()=>saveList(statusInput,statusIndex,statusList,setStatusList,closeStatusModal)}
onCancel={closeStatusModal}
/>
</Modal>

</View>
);
}

//////////////////////////////////////////////////////////////
/* ✅ COMPONENTS */
//////////////////////////////////////////////////////////////

const Input=({label,value,onChange})=>(
<>
<Text style={styles.label}>{label}</Text>
<TextInput style={styles.input} value={value} onChangeText={onChange}/>
</>
);

const Chips=({label,list,value,onSelect,onEdit,onAdd})=>(
<>
<Text style={styles.label}>{label}</Text>
<View style={styles.chipRow}>
{list.map((m,i)=>(
<TouchableOpacity key={m}
style={[styles.chip,value===m&&styles.activeChip]}
onPress={()=>onSelect(m)}
onLongPress={()=>onEdit(i)}
>
<Text style={value===m&&styles.activeText}>{m}</Text>
</TouchableOpacity>
))}
</View>

<TouchableOpacity onPress={onAdd}>
<Text style={styles.addLink}>+ Add</Text>
</TouchableOpacity>
</>
);

const ModalBox=({title,value,onChange,onSave,onCancel})=>(
<View style={styles.modalWrap}>
<View style={styles.modalBox}>
<Text style={styles.modalTitle}>{title}</Text>
<TextInput style={styles.input} value={value} onChangeText={onChange}/>
<TouchableOpacity style={styles.saveBtn} onPress={onSave}>
<Text style={styles.white}>Save</Text>
</TouchableOpacity>
<TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
<Text style={styles.cancelText}>Cancel</Text>
</TouchableOpacity>
</View>
</View>
);

//////////////////////////////////////////////////////////////
/* ✅ STYLES */
//////////////////////////////////////////////////////////////

const styles=StyleSheet.create({
container:{flex:1,padding:15},
header:{fontSize:18,fontWeight:"600"},
sectionHeader:{fontSize:16,fontWeight:"600"},
input:{backgroundColor:"#fff",padding:10,marginVertical:5},
btn:{backgroundColor:"#4B3F72",padding:10,alignItems:"center"},
white:{color:"#fff"},
smallBtn:{marginTop:5,alignItems:"center"},
addBtn:{backgroundColor:"#1BA97F",padding:12,marginTop:15,alignItems:"center"},
divider:{height:1,backgroundColor:"#ddd",marginVertical:15},
card:{backgroundColor:"#fff",padding:10,marginVertical:5},
rowBetween:{flexDirection:"row",justifyContent:"space-between"},
editBtn:{backgroundColor:"#3498db",padding:6,marginRight:5},
deleteBtn:{backgroundColor:"#e74c3c",padding:6},
chipRow:{flexDirection:"row",flexWrap:"wrap"},
chip:{backgroundColor:"#eee",padding:8,margin:3},
activeChip:{backgroundColor:"#4B3F72"},
activeText:{color:"#fff"},
addLink:{color:"#1BA97F"},
modalWrap:{flex:1,justifyContent:"center",backgroundColor:"#0006"},
modalBox:{backgroundColor:"#fff",margin:20,padding:20},
modalTitle:{fontWeight:"600",marginBottom:10},
saveBtn:{backgroundColor:"#4B3F72",padding:10,marginTop:10},
cancelBtn:{marginTop:10,alignItems:"center"},
cancelText:{color:"red"}
});
``