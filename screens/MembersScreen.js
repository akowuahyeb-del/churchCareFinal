import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet,
  TextInput, TouchableOpacity,
  FlatList, Modal, Alert
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  updateDoc, deleteDoc, doc
} from "firebase/firestore";

import QRCode from "react-native-qrcode-svg";

export default function MembersScreen() {

//////////////// STATE //////////////////
const defaultMember = {
  name:"", phone:"", address:"",
  occupation:"", ministry:"",
  baptismStatus:"", status:"",
  emergencyContact:"",
  membershipDuration:""
};

const [member,setMember] = useState(defaultMember);
const [members,setMembers] = useState([]);

const [showForm,setShowForm] = useState(false);
const [editingId,setEditingId] = useState(null);

const [search,setSearch] = useState("");
const [showActions,setShowActions] = useState(true);

const [selectedQR,setSelectedQR] = useState(null);

const [modal,setModal] = useState({
  visible:false,type:null,input:"",index:null
});

//////////////// OPTIONS //////////////////
const [ministries,setMinistries] = useState(["Choir","Ushering","Youth"]);
const [baptismList,setBaptismList] = useState(["Baptised","Not Baptised"]);
const [statusList,setStatusList] = useState(["Regular","Visitor"]);

//////////////// LOAD //////////////////
useEffect(()=>{loadMembers();},[]);

const loadMembers = async ()=>{
  const snap = await getDocs(collection(db,"members"));
  setMembers(snap.docs.map(d=>({id:d.id,...d.data()})));
};

//////////////// TOGGLE //////////////////
useEffect(()=>{
  const load = async ()=>{
    const saved = await AsyncStorage.getItem("showActions");
    if(saved!==null) setShowActions(JSON.parse(saved));
  };
  load();
},[]);

const toggleActions = async ()=>{
  const newState = !showActions;
  setShowActions(newState);
  await AsyncStorage.setItem("showActions", JSON.stringify(newState));
};

//////////////// CRUD //////////////////
const saveMember = async ()=>{
  if(!member.name || !member.phone){
    Alert.alert("Name & phone required");
    return;
  }

  if(editingId){
    await updateDoc(doc(db,"members",editingId),member);
    Alert.alert("✅ Updated");
  } else {
    await addDoc(collection(db,"members"),member);
    Alert.alert("✅ Saved");
  }

  setMember(defaultMember);
  setEditingId(null);
  setShowForm(false);
  loadMembers();
};

const editMember = (item)=>{
  setMember(item);
  setEditingId(item.id);
  setShowForm(true);
};

const deleteMember = (id)=>{
  Alert.alert("Delete member?", "", [
    {text:"Cancel"},
    {
      text:"Delete",
      onPress: async ()=>{
        await deleteDoc(doc(db,"members",id));
        loadMembers();
      }
    }
  ]);
};

//////////////// MODAL //////////////////
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
  } else {
    setList(prev=>[...prev,modal.input]);
  }
  closeModal();
};

//////////////// FILTER //////////////////
const filtered = members.filter(m =>
  (m.name||"").toLowerCase().includes(search.toLowerCase())
);

//////////////// UI //////////////////
return (
<View style={styles.container}>

{/* ADD MEMBER */}
<TouchableOpacity style={styles.fab} onPress={()=>setShowForm(true)}>
  <Text style={styles.fabText}>+ Add Member</Text>
</TouchableOpacity>

{/* TOGGLE */}
<TouchableOpacity style={styles.toggleBtn} onPress={toggleActions}>
<Text style={styles.white}>
{showActions ? "Hide Details" : "Show Details"}
</Text>
</TouchableOpacity>

<Text style={styles.header}>Members</Text>

<TextInput
placeholder="Search members..."
value={search}
onChangeText={setSearch}
style={styles.search}
/>

{/* LIST */}
<FlatList
data={filtered}
keyExtractor={(item)=>item.id}
contentContainerStyle={{paddingBottom:120}}

renderItem={({ item }) => (
<View style={styles.card}>

<Text style={styles.name}>{item.name}</Text>

{showActions && (
<>
<TouchableOpacity
onPress={()=>setSelectedQR(item.id)}
style={{marginTop:10}}
>
<QRCode value={item.id} size={80}/>
</TouchableOpacity>

<View style={{marginTop:10}}>

<View style={styles.row}>
<TouchableOpacity style={styles.editBtn}
onPress={()=>editMember(item)}>
<Text style={styles.white}>Edit</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.deleteBtn}
onPress={()=>deleteMember(item.id)}>
<Text style={styles.white}>Delete</Text>
</TouchableOpacity>
</View>

<View style={styles.row}>
<TouchableOpacity style={styles.suspendBtn}>
<Text style={styles.white}>Suspend</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.warnBtn}>
<Text style={styles.white}>Reprimand</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.demoteBtn}>
<Text style={styles.white}>Demote</Text>
</TouchableOpacity>
</View>

</View>
</>
)}

</View>
)}
/>

{/* QR MODAL */}
<Modal visible={!!selectedQR} transparent>
<View style={styles.modalWrap}>
<View style={styles.modalBox}>

<QRCode value={selectedQR} size={220}/>

<TouchableOpacity onPress={()=>setSelectedQR(null)}>
<Text style={{color:"red",marginTop:10}}>Close</Text>
</TouchableOpacity>

</View>
</View>
</Modal>

{/* FORM MODAL */}
<Modal visible={showForm} animationType="slide">
<View style={styles.modalContainer}>

<Text style={styles.header}>
{editingId ? "Edit Member" : "Register Member"}
</Text>

<Input label="Name" value={member.name} onChange={t=>setMember({...member,name:t})}/>
<Input label="Phone" value={member.phone} onChange={t=>setMember({...member,phone:t})}/>
<Input label="Address" value={member.address} onChange={t=>setMember({...member,address:t})}/>
<Input label="Occupation" value={member.occupation} onChange={t=>setMember({...member,occupation:t})}/>
<Input label="Emergency Contact" value={member.emergencyContact} onChange={t=>setMember({...member,emergencyContact:t})}/>
<Input label="Membership Duration" value={member.membershipDuration} onChange={t=>setMember({...member,membershipDuration:t})}/>

<ChipRow label="Ministry" list={ministries}
value={member.ministry}
onSelect={v=>setMember({...member,ministry:v})}
onAdd={()=>openModal("ministry")}
onEdit={(i)=>openModal("ministry",i,ministries)}/>

<ChipRow label="Baptism" list={baptismList}
value={member.baptismStatus}
onSelect={v=>setMember({...member,baptismStatus:v})}
onAdd={()=>openModal("baptism")}
onEdit={(i)=>openModal("baptism",i,baptismList)}/>

<ChipRow label="Status" list={statusList}
value={member.status}
onSelect={v=>setMember({...member,status:v})}
onAdd={()=>openModal("status")}
onEdit={(i)=>openModal("status",i,statusList)}/>

<TouchableOpacity style={styles.btn} onPress={saveMember}>
<Text style={styles.white}>Save</Text>
</TouchableOpacity>

<TouchableOpacity onPress={()=>setShowForm(false)}>
<Text style={{color:"red"}}>Cancel</Text>
</TouchableOpacity>

</View>
</Modal>

{/* LIST MODAL */}
<Modal visible={modal.visible} transparent>
<View style={styles.modalWrap}>
<View style={styles.modalBox}>

<Text>{modal.type}</Text>

<TextInput
value={modal.input}
onChangeText={(t)=>setModal({...modal,input:t})}
style={styles.input}
/>

<TouchableOpacity style={styles.btn}
onPress={()=>saveList(
modal.type==="ministry"?ministries:
modal.type==="baptism"?baptismList:statusList,
modal.type==="ministry"?setMinistries:
modal.type==="baptism"?setBaptismList:setStatusList
)}>
<Text style={styles.white}>Save</Text>
</TouchableOpacity>

<TouchableOpacity onPress={closeModal}>
<Text style={{color:"red"}}>Cancel</Text>
</TouchableOpacity>

</View>
</View>
</Modal>

</View>
);
}

//////////////// COMPONENTS //////////////////
const Input = ({label,value,onChange})=>(
<>
<Text>{label}</Text>
<TextInput style={styles.input} value={value} onChangeText={onChange}/>
</>
);

const ChipRow = ({label,list,value,onSelect,onAdd,onEdit})=>(
<>
<Text>{label}</Text>
<View style={styles.chipRow}>
{list.map((m,i)=>(
<TouchableOpacity key={i}
onPress={()=>onSelect(m)}
onLongPress={()=>onEdit(i)}
style={[styles.chip,value===m&&styles.activeChip]}>
<Text>{m}</Text>
</TouchableOpacity>
))}
</View>
<TouchableOpacity onPress={onAdd}>
<Text style={{color:"green"}}>+ Add</Text>
</TouchableOpacity>
</>
);

//////////////// STYLES //////////////////
const styles = StyleSheet.create({
container:{flex:1,padding:15,backgroundColor:"#f4f6fb"},
header:{fontSize:20,fontWeight:"600"},
search:{backgroundColor:"#fff",padding:14,borderRadius:10,marginVertical:10},

card:{backgroundColor:"#fff",padding:15,marginBottom:12,borderRadius:10},
name:{fontWeight:"600"},

row:{flexDirection:"row",justifyContent:"space-between",marginTop:5},

editBtn:{flex:1,backgroundColor:"#3498db",padding:8,marginRight:5,alignItems:"center"},
deleteBtn:{flex:1,backgroundColor:"#e74c3c",padding:8,alignItems:"center"},

suspendBtn:{flex:1,backgroundColor:"#f39c12",padding:8,marginRight:5,alignItems:"center"},
warnBtn:{flex:1,backgroundColor:"#e67e22",padding:8,marginRight:5,alignItems:"center"},
demoteBtn:{flex:1,backgroundColor:"#8e44ad",padding:8,alignItems:"center"},

fab:{position:"absolute",bottom:90,right:20,backgroundColor:"red",padding:12,borderRadius:30},
fabText:{color:"#fff"},
toggleBtn:{position:"absolute",top:10,right:20,backgroundColor:"#4B3F72",padding:10,borderRadius:8},

modalWrap:{flex:1,justifyContent:"center",backgroundColor:"#0006"},
modalBox:{backgroundColor:"#fff",padding:20,margin:20,borderRadius:10},

modalContainer:{flex:1,padding:20,backgroundColor:"#fff"},
input:{backgroundColor:"#eee",padding:10,borderRadius:10},

btn:{backgroundColor:"#4B3F72",padding:12,marginTop:10,alignItems:"center"},
white:{color:"#fff"},

chipRow:{flexDirection:"row",flexWrap:"wrap"},
chip:{backgroundColor:"#eee",padding:6,borderRadius:15,margin:4},
activeChip:{backgroundColor:"#ccc"}
});
