import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet,
  TextInput, TouchableOpacity,
  FlatList, Modal, Alert
} from "react-native";

import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function MembersScreen() {

const defaultMember = {
  name:"",
  phone:"",
  address:"",
  occupation:"",
  ministry:"",
  baptismStatus:"",
  status:"",
  emergencyContact:"",
  membershipDuration:""
};

const [member,setMember] = useState(defaultMember);
const [members,setMembers] = useState([]);

const [showForm,setShowForm] = useState(false);
const [search,setSearch] = useState("");

/* ✅ LIST VALUES */
const [ministries,setMinistries] = useState(["Choir","Ushering","Youth"]);
const [baptismList,setBaptismList] = useState(["Baptised","Not Baptised"]);
const [statusList,setStatusList] = useState(["Regular","Visitor"]);

/* ✅ MODAL STATE */
const [modal,setModal] = useState({
  visible:false,type:null,input:"",index:null
});

useEffect(()=>{loadMembers();},[]);
const loadMembers = async ()=>{
  const snap = await getDocs(collection(db,"members"));
  setMembers(snap.docs.map(d=>({id:d.id,...d.data()})));
};

/* ✅ SAVE MEMBER */
const saveMember = async ()=>{
  if(!member.name || !member.phone){
    Alert.alert("Name & phone required");
    return;
  }

  await addDoc(collection(db,"members"), member);
  Alert.alert("✅ Saved");

  setMember(defaultMember);
  setShowForm(false);
  loadMembers();
};

/* ✅ MODAL FUNCTIONS */
const openModal=(type,index=null,list=[])=>{
  setModal({
    visible:true,
    type,
    input:index!==null ? list[index] : "",
    index
  });
};

const closeModal=()=>{
  setModal({visible:false,type:null,input:"",index:null});
};

const saveList=(list,setList)=>{
  if(!modal.input.trim()) return;

  if(modal.index!==null){
    const updated=[...list];
    updated[modal.index]=modal.input;
    setList(updated);
  }else{
    setList(prev=>[...prev,modal.input]);
  }
  closeModal();
};

/* ✅ FILTER */
const filtered = members.filter(m =>
  (m.name||"").toLowerCase().includes(search.toLowerCase())
);

return (
<View style={styles.container}>

{/* ✅ RED QUICK ACTION BUTTON */}
<TouchableOpacity style={styles.fab} onPress={()=>setShowForm(true)}>
  <Text style={styles.fabText}>+ Add Member</Text>
</TouchableOpacity>

<Text style={styles.header}>Members</Text>

<TextInput
placeholder="Search members..."
value={search}
onChangeText={setSearch}
style={styles.search}
/>

{/* ✅ MEMBER LIST */}
<FlatList
data={filtered}
keyExtractor={(item)=>item.id}
contentContainerStyle={{ paddingBottom:120 }}
renderItem={({item})=>(
<View style={styles.card}>
  <Text style={styles.name}>{item.name}</Text>
</View>
)}
/>

{/* ✅ FORM MODAL */}
<Modal visible={showForm} animationType="slide">
<View style={styles.modalContainer}>

<Text style={styles.modalHeader}>New Member</Text>

<Input label="Name" value={member.name}
onChange={t=>setMember({...member,name:t})}/>

<Input label="Phone" value={member.phone}
onChange={t=>setMember({...member,phone:t})}/>

<Input label="Address" value={member.address}
onChange={t=>setMember({...member,address:t})}/>

<Input label="Occupation" value={member.occupation}
onChange={t=>setMember({...member,occupation:t})}/>

<Input label="Emergency Contact" value={member.emergencyContact}
onChange={t=>setMember({...member,emergencyContact:t})}/>

<Input label="Membership Duration" value={member.membershipDuration}
onChange={t=>setMember({...member,membershipDuration:t})}/>

{/* ✅ MINISTRY */}
<ChipRow
label="Group / Ministry"
list={ministries}
value={member.ministry}
onSelect={v=>setMember({...member,ministry:v})}
onAdd={()=>openModal("ministry")}
onEdit={(i)=>openModal("ministry",i,ministries)}
/>

{/* ✅ BAPTISM */}
<ChipRow
label="Baptism"
list={baptismList}
value={member.baptismStatus}
onSelect={v=>setMember({...member,baptismStatus:v})}
onAdd={()=>openModal("baptism")}
onEdit={(i)=>openModal("baptism",i,baptismList)}
/>

{/* ✅ STATUS */}
<ChipRow
label="Status"
list={statusList}
value={member.status}
onSelect={v=>setMember({...member,status:v})}
onAdd={()=>openModal("status")}
onEdit={(i)=>openModal("status",i,statusList)}
/>

<TouchableOpacity style={styles.btn} onPress={saveMember}>
<Text style={styles.white}>Save Member</Text>
</TouchableOpacity>

<TouchableOpacity onPress={()=>setShowForm(false)}>
<Text style={{color:"red",marginTop:15}}>Cancel</Text>
</TouchableOpacity>

</View>
</Modal>

{/* ✅ LIST MODAL */}
<Modal visible={modal.visible} transparent>
<View style={styles.modalWrap}>
<View style={styles.modalBox}>

<Text style={{marginBottom:10}}>{modal.type}</Text>

<TextInput
value={modal.input}
onChangeText={(t)=>setModal({...modal,input:t})}
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
<Text style={{color:"red"}}>Cancel</Text>
</TouchableOpacity>

</View>
</View>
</Modal>

</View>
);
}

/* ✅ INPUT */
const Input = ({label,value,onChange})=>(
<>
<Text>{label}</Text>
<TextInput style={styles.input} value={value} onChangeText={onChange}/>
</>
);

/* ✅ CHIP SELECTOR */
const ChipRow = ({label,list,value,onSelect,onEdit,onAdd})=>(
<>
<Text>{label}</Text>
<View style={styles.chipRow}>
{list.map((m,i)=>(
<TouchableOpacity
key={i}
onPress={()=>onSelect(m)}
onLongPress={()=>onEdit(i)}
style={[styles.chip,value===m && styles.activeChip]}
>
<Text style={value===m&&styles.activeText}>{m}</Text>
</TouchableOpacity>
))}
</View>
<TouchableOpacity onPress={onAdd}>
<Text style={{color:"#1BA97F"}}>+ Add</Text>
</TouchableOpacity>
</>
);

/* ✅ STYLES */
const styles = StyleSheet.create({
container:{flex:1,padding:15,backgroundColor:"#f4f6fb"},

header:{fontSize:22,fontWeight:"600",marginBottom:10},

search:{backgroundColor:"#fff",padding:14,borderRadius:10,marginBottom:15},

card:{backgroundColor:"#fff",padding:15,marginBottom:12,borderRadius:10},
name:{fontWeight:"600"},

fab:{
position:"absolute",
bottom:90,
right:20,
backgroundColor:"red",   // ✅ RED BUTTON
paddingVertical:12,
paddingHorizontal:20,
borderRadius:30,
zIndex:9999,
elevation:20
},

fabText:{color:"#fff",fontWeight:"600"},

modalContainer:{flex:1,padding:20,backgroundColor:"#fff"},
modalHeader:{fontSize:22,fontWeight:"600",marginBottom:15},

input:{backgroundColor:"#f2f2f2",padding:12,borderRadius:10,marginVertical:5},

btn:{backgroundColor:"#4B3F72",padding:12,marginTop:10,alignItems:"center"},
white:{color:"#fff"},

chipRow:{flexDirection:"row",flexWrap:"wrap"},
chip:{backgroundColor:"#eee",padding:8,borderRadius:15,margin:4},
activeChip:{backgroundColor:"#4B3F72"},
activeText:{color:"#fff"},

modalWrap:{flex:1,justifyContent:"center",backgroundColor:"#0006"},
modalBox:{backgroundColor:"#fff",padding:20,margin:20,borderRadius:10}
});