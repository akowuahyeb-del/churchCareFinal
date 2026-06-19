import React, { useState } from "react";
import {
  ScrollView, Text, View, TextInput, Alert,
  TouchableOpacity, StyleSheet, Modal, Platform, StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

import AppHeader from "../components/AppHeader";

export default function AddMemberScreen({ navigation, route }) {

  const { memberData, editingId, entityId, organizationId } = route.params || {};
  const [step, setStep] = useState(0);


  const [member, setMember] = useState(
    memberData || {
      name: "",
      phone: "",
      address: "",
      occupation: "",
      emergencyContact: "",
      membershipDuration: "",
      communicant: "",
      communicantStatus: "active",
      communicantInvalidSince: null,
    }
  );

  const [commStatusModal, setCommStatusModal]   = useState(false);
  const [commInvalidModal, setCommInvalidModal] = useState(false);
  const [commInvalidDate, setCommInvalidDate]   = useState(new Date());
  const [showDatePicker, setShowDatePicker]     = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("MembersMain");
    }
  };

  const handleSaveMember = async () => {
    if (!member.name) {
      Alert.alert("Required", "Name is required");
      return;
    }
    if (!entityId || !organizationId) {
      Alert.alert("Error", "No active church selected");
      return;
    }

    try {
      await addDoc(collection(db, "members"), {
        ...member,
        entityId,
        organizationId,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("✅ Member saved");
      handleBack();
    } catch (e) {
      console.log("❌ SAVE ERROR:", e);
      Alert.alert("Error", e.message);
    }
  };

  const handleCommunicantSelect = (val) => {
    setMember({ ...member, communicant: val });
    if (val === "yes") setCommStatusModal(true);
  };

  const handleCommStatus = (status) => {
    setMember({ ...member, communicantStatus: status });
    setCommStatusModal(false);
    if (status === "invalid") setCommInvalidModal(true);
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      setCommInvalidDate(date);
      setMember({
        ...member,
        communicantInvalidSince: date.toISOString().split("T")[0],
      });
    }
  };

const steps = [

  // ─── STEP 0: Basic Info ───────────────
  <ScrollView
  key={0}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.container}
>
  <View style={styles.card}>

    <Text style={styles.cardTitle}>PERSONAL DETAILS</Text>

    <Text style={styles.label}>FULL NAME *</Text>
    <TextInput
      style={styles.input}
      value={member.name}
      onChangeText={(t) => setMember({ ...member, name: t })}
    />

    <Text style={styles.label}>PHONE *</Text>
    <TextInput
      style={styles.input}
      value={member.phone}
      onChangeText={(t) => setMember({ ...member, phone: t })}
    />

    <Text style={styles.label}>ADDRESS</Text>
    <TextInput
      style={styles.input}
      value={member.address}
      onChangeText={(t) => setMember({ ...member, address: t })}
    />

  </View>

  <TouchableOpacity
    style={styles.saveBtn}
    onPress={() => {
      if (!member.name || !member.phone) {
        Alert.alert("Required", "Name and phone required");
        return;
      }
      setStep(1);
    }}
  >
    <Text style={styles.saveText}>Next</Text>
  </TouchableOpacity>

</ScrollView>,

  // ─── STEP 1: Extra Info ───────────────
  // ─── STEP 0: Personal Details ───────────────
<ScrollView
  key={0}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.container}
>

  {/* ✅ CARD */}
  <View style={styles.card}>

    <Text style={styles.cardTitle}>PERSONAL DETAILS</Text>

    {/* FULL NAME */}
    <Text style={styles.label}>FULL NAME *</Text>
    <TextInput
      style={styles.input}
      placeholder="Enter full name"
      value={member.name}
      onChangeText={(t) => setMember({ ...member, name: t })}
    />

    {/* PHONE */}
    <Text style={styles.label}>PHONE *</Text>
    <TextInput
      style={styles.input}
      placeholder="+233..."
      value={member.phone}
      onChangeText={(t) => setMember({ ...member, phone: t })}
      keyboardType="phone-pad"
    />

    {/* ADDRESS */}
    <Text style={styles.label}>ADDRESS</Text>
    <TextInput
      style={styles.input}
      placeholder="Enter address"
      value={member.address}
      onChangeText={(t) => setMember({ ...member, address: t })}
    />

  </View>

  {/* ✅ BUTTON */}
  <TouchableOpacity
    style={styles.saveBtn}
    onPress={() => {
      if (!member.name || !member.phone) {
        Alert.alert("Required", "Name and phone required");
        return;
      }
      setStep(1);
    }}
  >
    <Text style={styles.saveText}>Next</Text>
  </TouchableOpacity>

</ScrollView>
];

return (
  <SafeAreaView style={styles.safe} edges={["top"]}>

    <StatusBar
      translucent={false}
      backgroundColor="#4B3F72"
      barStyle="light-content"
    />

    <AppHeader
      title={editingId ? "Edit Member" : "Add Member"}
      subtitle="Register a church member"
      onBack={() => navigation.goBack()}
    />

    {/* ✅ STEP ENGINE */}
    {steps[step]}

  </SafeAreaView>
);

  
}

const styles = StyleSheet.create({
  // ✅ No manual paddingTop here — SafeAreaView + edges=["top"] handles it.
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  body: { flex: 1, backgroundColor: "#f4f6fb" },

  
container: {
  padding: 16,
  paddingBottom: 40,
},


  title: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#222" },

  label: { fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 4, color: "#444" },

  
input: {
  backgroundColor: "#ffffff",
  padding: 14,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: "#d1d5db",  
  fontSize: 14,
  color: "#222",           
},



  row: { flexDirection: "row", marginTop: 8 },

  communicantBtn: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    backgroundColor: "#eee",
    borderRadius: 8,
    alignItems: "center",
  },
  activeBtn: { backgroundColor: "#4B3F72" },
  btnText: { color: "#333", fontWeight: "600" },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },

  cancelBtn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  cancelText: { color: "#333", fontWeight: "600" },

  modalWrap: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  modalBox: { backgroundColor: "#fff", margin: 20, padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 10 },

  actionBtn: { padding: 12, backgroundColor: "#4B3F72", borderRadius: 8, alignItems: "center" },
  white: { color: "#fff", fontWeight: "600" },


card: {
  backgroundColor: "#ffffff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 20,
  elevation: 4,
  borderWidth: 1,
  borderColor: "#eee",
},



cardTitle: {
  fontSize: 14,
  fontWeight: "800",
  color: "#4B3F72",
  marginBottom: 10,
},



label: {
  fontSize: 12,
  fontWeight: "700",
  color: "#555",          // ✅ visible now
  marginTop: 12,
  marginBottom: 6,
},



});

