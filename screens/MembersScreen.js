import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet,
  TextInput, TouchableOpacity,
  FlatList, Modal, Alert, Image
} from "react-native";

import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  updateDoc, deleteDoc, doc
} from "firebase/firestore";

import QRCode from "react-native-qrcode-svg";
import * as ImagePicker from "expo-image-picker";

/* ✅ QR SHARE / DOWNLOAD */
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";

export default function MembersScreen(){

//////////////// ROLE //////////////////
const userRole = "admin";

//////////////// STATE //////////////////
const defaultMember = {
  name:"", phone:"", address:"",
  occupation:"", ministry:"",
  baptismStatus:"", status:"",
  emergencyContact:"",
  membershipDuration:""
};

const [member,setMember]=useState(defaultMember);
const [members,setMembers]=useState([]);

const [showForm,setShowForm]=useState(true);
const [editingId,setEditingId]=useState(null);
const [saving,setSaving]=useState(false);

const [image,setImage]=useState(null);
const [search,setSearch]=useState("");

const [selectedQR,setSelectedQR]=useState(null);
const qrRef = useRef();

//////////////// LISTS //////////////////
const [ministries,setMinistries]=useState(["Choir","Ushering","Youth"]);
const [baptismList,setBaptismList]=useState(["Baptised","Not Baptised"]);
const [statusList,setStatusList]=useState(["Regular","Visitor"]);

//////////////// MODAL //////////////////
const [modal,setModal]=useState({
  visible:false,type:null,input:"",index:null
});

//////////////// LOAD //////////////////
useEffect(()=>{loadMembers();},[]);
const loadMembers=async()=>{
  const snap=await getDocs(collection(db,"members"));
  setMembers(snap.docs.map(d=>({id:d.id,...d.data()})));
};

//////////////// IMAGE //////////////////
const pickImage=async()=>{
  const res=await ImagePicker.launchImageLibraryAsync({});
  if(!res.canceled) setImage(res.assets[0].uri);
};

//////////////// SAVE //////////////////
const saveMember=async()=>{

  if(saving) return;

  if(!member.name||!member.phone){
    Alert.alert("Name & phone required");
    return;
  }

  setSaving(true);

  try{
    if(editingId){
      await updateDoc(doc(db,"members",editingId),{...member,image});
    }else{
      await addDoc(collection(db,"members"),{...member,image});
    }

    Alert.alert("✅ Saved");

    setMember(defaultMember);
    setImage(null);
    setEditingId(null);
    setShowForm(false);

    loadMembers();
  }catch{
    Alert.alert("Error");
  }

  setSaving(false);
};

//////////////// CLEAR / CANCEL //////////////////
const clearForm=()=>{
  setMember(defaultMember);
  setImage(null);
};

const cancelForm=()=>{
  clearForm();
  setEditingId(null);
  setShowForm(false);
};

//////////////// DELETE //////////////////
const deleteMember=(id)=>{
  Alert.alert("Delete member?", "", [
    {text:"Cancel"},
    {text:"Delete",onPress:async()=>{
      await deleteDoc(doc(db,"members",id));
      loadMembers();
    }}
  ]);
};

//////////////// ADMIN ACTIONS //////////////////
const suspendMember=(m)=>Alert.alert("Suspend",m.name);
const reprimandMember=(m)=>Alert.alert("Reprimand",m.name);
const demoteMember=(m)=>Alert.alert("Demote",m.name);

//////////////// MODAL FUNCTIONS //////////////////
const openModal=(type,index=null,list=[])=>{
  setModal({
    visible:true,
    type,
    input:index!=null?list[index]:"",
    index
  });
};

const closeModal=()=>{
  setModal({visible:false,type:null,input:"",index:null});
};

const saveList=(list,setList)=>{
  if(!modal.input.trim()) return;

  if(modal.index!=null){
    const updated=[...list];
    updated[modal.index]=modal.input;
    setList(updated);
  }else{
    setList(prev=>[...prev,modal.input]);
  }

  closeModal();
};

//////////////// FILTER //////////////////
const filtered=members.filter(m=>
  (m.name||"").toLowerCase().includes(search.toLowerCase())
);

//////////////// QR SHARE //////////////////
const shareQR = async () => {
  try {
    const uri = await captureRef(qrRef, { format: "png", quality: 1 });
    await Sharing.shareAsync(uri);
  } catch {
    Alert.alert("Error sharing QR");
  }
};

//////////////// QR DOWNLOAD //////////////////
const downloadQR = async () => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission required");
      return;
    }

    const uri = await captureRef(qrRef, { format: "png", quality: 1 });

    await MediaLibrary.saveToLibraryAsync(uri);

    Alert.alert("✅ Saved to gallery");

  } catch {
    Alert.alert("Error saving QR");
  }
};

//////////////// UI //////////////////
return (
<View style={styles.container}>

{/* ✅ FLOAT BUTTON */}
<TouchableOpacity style={styles.fab} onPress={()=>setShowForm(p=>!p)}>
<Text style={styles.fabText}>{showForm?"−":"+"}</Text>
</TouchableOpacity>

{!showForm && <Text style={styles.fabLabel}>Add Member</Text>}

{/* ✅ FORM */}
{showForm && (
<View style={styles.formCard}>

<Input label="Name" value={member.name} onChange={t=>setMember({...member,name:t})}/>
<Input label="Phone" value={member.phone} onChange={t=>setMember({...member,phone:t})}/>
<Input label="Address" value={member.address} onChange={t=>setMember({...member,address:t})}/>
<Input label="Occupation" value={member.occupation} onChange={t=>setMember({...member,occupation:t})}/>
<Input label="Emergency Contact" value={member.emergencyContact}
onChange={t=>setMember({...member,emergencyContact:t})}/>
<Input label="Membership Duration" value={member.membershipDuration}
onChange={t=>setMember({...member,membershipDuration:t})}/>

<TouchableOpacity style={styles.btn} onPress={pickImage}>
<Text style={styles.white}>{image?"Change Photo":"Upload Photo"}</Text>
</TouchableOpacity>

{/* CHIPS */}
<ChipRow label="Ministry" list={ministries}
value={member.ministry}
onSelect={v=>setMember({...member,ministry:v})}
onEdit={(i)=>openModal("ministry",i,ministries)}
onAdd={()=>openModal("ministry")}
/>

<ChipRow label="Baptism" list={baptismList}
value={member.baptismStatus}
onSelect={v=>setMember({...member,baptismStatus:v})}
onEdit={(i)=>openModal("baptism",i,baptismList)}
onAdd={()=>openModal("baptism")}
/>

<ChipRow label="Status" list={statusList}
value={member.status}
onSelect={v=>setMember({...member,status:v})}
onEdit={(i)=>openModal("status",i,statusList)}
onAdd={()=>openModal("status")}
/>

<TouchableOpacity style={styles.btn} onPress={saveMember}>
<Text style={styles.white}>{saving?"Saving...":"Save"}</Text>
</TouchableOpacity>

<TouchableOpacity onPress={clearForm}><Text>Clear</Text></TouchableOpacity>
<TouchableOpacity onPress={cancelForm}><Text style={{color:"red"}}>Cancel</Text></TouchableOpacity>

</View>
)}

{/* ✅ SEARCH */}
<TextInput
placeholder="Search members..."
value={search}
onChangeText={setSearch}
style={styles.search}
/>

{/* ✅ LIST */}
<FlatList
data={filtered}
keyExtractor={i=>i.id}
renderItem={({item})=>(
<View style={styles.card}>

<Text style={styles.name}>{item.name}</Text>

<TouchableOpacity onPress={()=>setSelectedQR(item.id)}>
<QRCode value={item.id} size={80}/>
</TouchableOpacity>

{userRole==="admin" && (
<View>

<View style={styles.row}>
<TouchableOpacity style={styles.editBtn}
onPress={()=>{setMember(item);setEditingId(item.id);setShowForm(true);}}>
<Text style={styles.white}>Edit</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.deleteBtn}
onPress={()=>deleteMember(item.id)}>
<Text style={styles.white}>Delete</Text>
</TouchableOpacity>
</View>

<View style={styles.row}>
<TouchableOpacity style={styles.suspendBtn}><Text style={styles.white}>Suspend</Text></TouchableOpacity>
<TouchableOpacity style={styles.warnBtn}><Text style={styles.white}>Reprimand</Text></TouchableOpacity>
<TouchableOpacity style={styles.demoteBtn}><Text style={styles.white}>Demote</Text></TouchableOpacity>
</View>

</View>
)}

</View>
)}
/>

{/* ✅ QR MODAL WITH DOWNLOAD + SHARE */}
<Modal visible={!!selectedQR} transparent>
<View style={styles.modalWrap}>
<View style={styles.modalBox}>

<View ref={qrRef} collapsable={false}>
<QRCode value={selectedQR} size={220}/>
</View>

<TouchableOpacity style={styles.btn} onPress={shareQR}>
<Text style={styles.white}>Share</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.btn} onPress={downloadQR}>
<Text style={styles.white}>Download</Text>
</TouchableOpacity>

<TouchableOpacity onPress={()=>setSelectedQR(null)}>
<Text style={{color:"red",marginTop:10}}>Close</Text>
</TouchableOpacity>

</View>
</View>
</Modal>

{/* LIST MODAL */}
<Modal visible={modal.visible} transparent>
<View style={styles.modalWrap}>
<View style={styles.modalBox}>

<Text>{modal.type}</Text>

<TextInput
value={modal.input}
onChangeText={t=>setModal({...modal,input:t})}
style={styles.input}
/>

<TouchableOpacity style={styles.btn}
onPress={()=>{
if(modal.type==="ministry")saveList(ministries,setMinistries);
if(modal.type==="baptism")saveList(baptismList,setBaptismList);
if(modal.type==="status")saveList(statusList,setStatusList);
}}>
<Text style={styles.white}>Save</Text>
</TouchableOpacity>

<TouchableOpacity onPress={closeModal}>
<Text style={{color:"red",marginTop:10}}>Cancel</Text>
</TouchableOpacity>

</View>
</View>
</Modal>

</View>
);
}

//////////////// COMPONENTS //////////////////
const Input=({label,value,onChange})=>(
<>
<Text>{label}</Text>
<TextInput style={styles.input} value={value} onChangeText={onChange}/>
</>
);

const ChipRow=({label,list,value,onSelect,onEdit,onAdd})=>(
<>
<Text>{label}</Text>
<View style={styles.chipRow}>
{list.map((m,i)=>(
<TouchableOpacity key={m}
style={[styles.chip,value===m&&styles.activeChip]}
onPress={()=>onSelect(m)}
onLongPress={()=>onEdit(i)}>
<Text style={value===m&&styles.activeText}>{m}</Text>
</TouchableOpacity>
))}
</View>
<TouchableOpacity onPress={onAdd}>
<Text style={{color:"#1BA97F"}}>+ Add</Text>
</TouchableOpacity>
</>
);

//////////////// STYLES //////////////////
const styles=StyleSheet.create({
container:{flex:1,padding:15,backgroundColor:"#f4f6fb"},
formCard:{backgroundColor:"#fff",padding:15,borderRadius:12,marginBottom:20},

input:{backgroundColor:"#f2f2f2",padding:12,borderRadius:10,marginVertical:5},
search:{backgroundColor:"#eee",padding:14,borderRadius:10,marginBottom:15},

btn:{backgroundColor:"#4B3F72",padding:12,alignItems:"center",marginTop:10},
white:{color:"#fff"},

card:{backgroundColor:"#fff",padding:15,marginBottom:12,borderRadius:10},
name:{fontWeight:"600",marginBottom:10},

row:{flexDirection:"row",marginTop:5},

editBtn:{backgroundColor:"#3498db",padding:6,marginRight:5},
deleteBtn:{backgroundColor:"#e74c3c",padding:6},

suspendBtn:{backgroundColor:"#f39c12",padding:6,marginRight:5},
warnBtn:{backgroundColor:"#e67e22",padding:6,marginRight:5},
demoteBtn:{backgroundColor:"#8e44ad",padding:6},

chipRow:{flexDirection:"row",flexWrap:"wrap"},
chip:{backgroundColor:"#eee",padding:6,margin:3,borderRadius:15},
activeChip:{backgroundColor:"#4B3F72"},
activeText:{color:"#fff"},

fab:{
position:"absolute",
bottom:80,
right:20,
width:70,
height:70,
borderRadius:35,
backgroundColor:"#4B3F72",
justifyContent:"center",
alignItems:"center"
},

fabText:{color:"#fff",fontSize:28},

fabLabel:{
position:"absolute",
bottom:150,
right:20,
backgroundColor:"#000",
color:"#fff",
padding:6,
borderRadius:6
},

modalWrap:{flex:1,justifyContent:"center",backgroundColor:"#0006"},
modalBox:{backgroundColor:"#fff",padding:20,margin:20}
});
``