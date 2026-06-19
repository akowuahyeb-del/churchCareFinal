import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Modal
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { SafeAreaView, StatusBar, Platform } from "react-native";

import AppHeader from "../components/AppHeader";



export default function AddMemberScreen({ navigation, route }) {

  const { memberData, editingId } = route.params || {};
  const { entityId, organizationId } = route.params || {};

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
      communicantInvalidSince: null
    }
  );

  const [commStatusModal, setCommStatusModal] = useState(false);
  const [commInvalidModal, setCommInvalidModal] = useState(false);
  const [commInvalidDate, setCommInvalidDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  


 // ✅ SAVE MEMBER (CLEAN + FIXED)
const handleSaveMember = async () => {
  if (!member.name) {
    Alert.alert("Required", "Name is required");
    return;
  }

  try {
    if (!entityId || !organizationId) {
      Alert.alert("Error", "No active church selected");
      return;
    }

    console.log("✅ Saving member:", {
      entityId,
      organizationId,
      member
    });

    await addDoc(collection(db, "members"), {
      ...member,
      entityId,
      organizationId,
      createdAt: new Date().toISOString()
    });

    Alert.alert("✅ Member saved");
    navigation.goBack();

  } catch (e) {
    console.log("❌ SAVE ERROR:", e);
    Alert.alert("Error", e.message);
  }
};


// ✅ COMMUNICANT SELECT
const handleCommunicantSelect = (val) => {
  setMember({ ...member, communicant: val });

  if (val === "yes") {
    setCommStatusModal(true);
  }
};


// ✅ COMMUNICANT STATUS
const handleCommStatus = (status) => {
  setMember({ ...member, communicantStatus: status });
  setCommStatusModal(false);

  if (status === "invalid") {
    setCommInvalidModal(true);
  }
};


// ✅ DATE CHANGE
const handleDateChange = (event, date) => {
  if (date) {
    setShowDatePicker(false);
    setCommInvalidDate(date);

    setMember({
      ...member,
      communicantInvalidSince: date.toISOString().split("T")[0],
    });
  }
};
return (
  <SafeAreaView style={styles.safe}>

    {/* ✅ HEADER */}
    <AppHeader
      title={editingId ? "Edit Member" : "Add Member"}
      subtitle="Register a church member"
      onBack={() => navigation.goBack()}
    />

    {/* ✅ SCROLLABLE FORM */}
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>
        {editingId ? "Edit Member" : "Register Member"}
      </Text>

      {/* INPUTS */}
      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={member.name}
        onChangeText={(t) => setMember({ ...member, name: t })}
      />

      <Text style={styles.label}>Phone *</Text>
      <TextInput
        style={styles.input}
        value={member.phone}
        onChangeText={(t) => setMember({ ...member, phone: t })}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={member.address}
        onChangeText={(t) => setMember({ ...member, address: t })}
      />

      <Text style={styles.label}>Occupation</Text>
      <TextInput
        style={styles.input}
        value={member.occupation}
        onChangeText={(t) => setMember({ ...member, occupation: t })}
      />

      <Text style={styles.label}>Emergency Contact</Text>
      <TextInput
        style={styles.input}
        value={member.emergencyContact}
        onChangeText={(t) =>
          setMember({ ...member, emergencyContact: t })
        }
      />

      <Text style={styles.label}>Membership Duration</Text>
      <TextInput
        style={styles.input}
        value={member.membershipDuration}
        onChangeText={(t) =>
          setMember({ ...member, membershipDuration: t })
        }
      />

      {/* COMMUNICANT */}
      <Text style={styles.label}>Communicant *</Text>

      <View style={styles.row}>
        {["yes", "no"].map((val) => (
          <TouchableOpacity
            key={val}
            onPress={() => handleCommunicantSelect(val)}
            style={[
              styles.communicantBtn,
              member.communicant === val && styles.activeBtn,
            ]}
          >
            <Text
              style={[
                styles.btnText,
                member.communicant === val && { color: "#fff" },
              ]}
            >
              {val.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* STATUS */}
      {member.communicant === "yes" && (
        <Text style={{ marginTop: 8, color: "#555" }}>
          Status: {member.communicantStatus === "invalid"
            ? `Invalid since ${member.communicantInvalidSince || "—"}`
            : "Active"}
        </Text>
      )}

      {/* BUTTONS */}
      <View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMember}>
          <Text style={styles.saveText}>Save Member</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>

    {/* ✅ MODALS */}
    <Modal visible={commStatusModal} transparent animationType="fade">
      <View style={styles.modalWrap}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Communicant Status</Text>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "green" }]}
            onPress={() => handleCommStatus("active")}
          >
            <Text style={styles.white}>Active — Eligible</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "red", marginTop: 10 }]}
            onPress={() => handleCommStatus("invalid")}
          >
            <Text style={styles.white}>Invalid — Not Eligible</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCommStatusModal(false)}>
            <Text style={{ textAlign: "center", marginTop: 10 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <Modal visible={commInvalidModal} transparent animationType="fade">
      <View style={styles.modalWrap}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Invalid Since</Text>

          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{commInvalidDate.toDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={commInvalidDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { marginTop: 10 }]}
            onPress={() => setCommInvalidModal(false)}
          >
            <Text style={styles.white}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f4f6fb",
  },
safe: {
  flex: 1,
  backgroundColor: "#f4f6fb",
  paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
},

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#222",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
    color: "#444",
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },

  row: {
    flexDirection: "row",
    marginTop: 8,
  },

  communicantBtn: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    backgroundColor: "#eee",
    borderRadius: 8,
    alignItems: "center",
  },

  activeBtn: {
    backgroundColor: "#4B3F72",
  },

  btnText: {
    color: "#333",
    fontWeight: "600",
  },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
  },

  cancelBtn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },

  cancelText: {
    color: "#333",
    fontWeight: "600",
  },

  modalWrap: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0007",
  },

  modalBox: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },

  actionBtn: {
    padding: 12,
    backgroundColor: "#4B3F72",
    borderRadius: 8,
    alignItems: "center",
  },

  white: {
    color: "#fff",
    fontWeight: "600",
  },
});