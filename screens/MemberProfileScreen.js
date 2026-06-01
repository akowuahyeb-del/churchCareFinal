import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function MemberProfileScreen({ route, navigation }) {

const { member } = route.params;

return (
<View style={styles.container}>

{/* BACK BUTTON */}
<TouchableOpacity onPress={() => navigation.goBack()}>
  <Text style={styles.back}>← Back</Text>
</TouchableOpacity>

<ScrollView>

<Text style={styles.title}>{member.name}</Text>

<View style={styles.card}>
<Text>Phone: {member.phone}</Text>
<Text>Address: {member.address}</Text>
<Text>Occupation: {member.occupation}</Text>
<Text>Group: {member.ministry}</Text>
<Text>Baptism: {member.baptismStatus}</Text>
<Text>Status: {member.status}</Text>
<Text>Emergency Contact: {member.emergencyContact}</Text>
<Text>Membership Duration: {member.membershipDuration}</Text>
</View>

{/* QR SECTION */}
<View style={styles.qrBox}>
<QRCode value={member.id} size={180} />
</View>

</ScrollView>

</View>
);
}

const styles = StyleSheet.create({
container:{flex:1,padding:20,backgroundColor:"#f4f6fb"},
back:{color:"red",marginBottom:10},
title:{fontSize:24,fontWeight:"700",marginBottom:15},

card:{
  backgroundColor:"#fff",
  padding:15,
  borderRadius:10,
  marginBottom:20
},

qrBox:{
  alignItems:"center",
  marginTop:20
}
});
``