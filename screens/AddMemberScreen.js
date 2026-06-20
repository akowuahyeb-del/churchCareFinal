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
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";

export default function AddMemberScreen({ navigation, route }) {

  const { memberData, editingId, entityId, organizationId } = route.params || {};

  /* ── step engine ── */
  const [step, setStep] = useState(0);

  /* ── member form ── */
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
      communicantNote: "",
      ministry: "",
      status: "",
    }
  );

  /* ── ministry list (chips) ── */
  const [ministries, setMinistries] = useState(["YPG", "Prayer Tower"]);
  const [ministryModal, setMinistryModal] = useState(false);
  const [newMinistry, setNewMinistry] = useState("");
  const [editMinistryModal, setEditMinistryModal] = useState(false);
  const [selectedMinistryIndex, setSelectedMinistryIndex] = useState(null);
  const [editMinistryValue, setEditMinistryValue] = useState("");

  /* ── status list (chips) ── */
  const [statusList, setStatusList] = useState(["Regular", "Visiting", "Inactive"]);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  /* ── communicant flow ── */
  const [commStatusModal, setCommStatusModal]   = useState(false);
  const [commInvalidModal, setCommInvalidModal] = useState(false);
  const [commInvalidDate, setCommInvalidDate]   = useState(new Date());
  const [showDatePicker, setShowDatePicker]     = useState(false);

const goNext = () => {
  if (!member.name || !member.phone) {
    Alert.alert("Required", "Name and phone required");
    return;
  }
  setStep(1);
};

  /* ── navigation ── */
  const handleBack = () => {
    if (step > 0) { setStep(0); return; }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("MembersMain");
  };

 /* ── save ── */
const handleSaveMember = async () => {

  if (!member.name || !member.phone) {
    Alert.alert("Required", "Name and phone are required");
    return;
  }

  if (!entityId || !organizationId) {
    Alert.alert("Error", "No active church selected");
    return;
  }

  console.log("🔥 DEBUG SAVE:", {
    organizationId,
    entityId,
    member
  });

  try {
console.log("🔥 FULL PATH DEBUG:", {
  orgPath: `organizations/${organizationId}`,
  entityPath: `organizations/${organizationId}/entities/${entityId}`,
  collection: "members"
});
const memberCode = `${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

console.log("🆔 GENERATED MEMBER CODE:", memberCode);

   await addDoc(
  collection(
    db,
    "organizations",
    organizationId,
    "entities",
    entityId,
    "members"
  ),
  {
    ...member,
    memberCode,   // ✅ keep this
    organizationId,
    entityId,
    createdAt: new Date().toISOString(),
  }
);


    console.log("✅ SAVE SUCCESS");

    Alert.alert(
      "Success ✅",
      "Member saved successfully",
      [
        {
          text: "OK",
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("MembersMain");
            }
          },
        },
      ]
    );

  } catch (e) {

    console.log("❌ SAVE ERROR FULL:", e);
    console.log("❌ CODE:", e.code);
    console.log("❌ MESSAGE:", e.message);

    Alert.alert("Save Failed ❌", e.message);
  }
};

/*useEffect*/


useEffect(() => {
  const loadLists = async () => {
    if (!organizationId) return;

    try {
      const ref = doc(db, "organizations", organizationId, "settings", "lists");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        if (data.ministries) setMinistries(data.ministries);
        if (data.statuses) setStatusList(data.statuses);
      }

    } catch (e) {
      console.log("❌ LOAD LIST ERROR:", e);
    }
  };

  loadLists();
}, [organizationId]);




  /* ── communicant handlers ── */
  const handleCommunicantSelect = (val) => {
    setMember(prev => ({ ...prev, communicant: val }));
    if (val === "yes") setCommStatusModal(true);
  };

  const handleCommStatus = (status) => {
    setMember(prev => ({ ...prev, communicantStatus: status }));
    setCommStatusModal(false);
    if (status === "invalid") setCommInvalidModal(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      setCommInvalidDate(selectedDate);
      setMember(prev => ({
        ...prev,
        communicantInvalidSince: selectedDate.toISOString().split("T")[0],
      }));
    }
  };

  /* ── ministry helpers ── */
  const saveNewMinistry = async () => {
  const trimmed = newMinistry.trim();
  if (!trimmed) return;

  const formatted =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

  if (ministries.includes(formatted)) {
    Alert.alert("Duplicate", "Ministry already exists");
    return;
  }

  const updated = [...ministries, formatted];

  setMinistries(updated);

  setMember(prev => ({
    ...prev,
    ministry: formatted,
  }));

  setNewMinistry("");
  setMinistryModal(false);

  // ✅ SAVE TO FIRESTORE
  try {
    const ref = doc(db, "organizations", organizationId, "settings", "lists");

    await setDoc(ref, {
      ministries: updated,
    }, { merge: true });

  } catch (e) {
    console.log("❌ SAVE MINISTRY ERROR:", e);
  }
};


 const saveEditedMinistry = () => {
  const trimmed = editMinistryValue.trim();
  if (!trimmed || selectedMinistryIndex == null) return;

  setMinistries(prev =>
    prev.map((m, i) => (i === selectedMinistryIndex ? trimmed : m))
  );

  // ✅ IMPORTANT: update selected member ministry too
  setMember(prev => ({
    ...prev,
    ministry: trimmed,
  }));

  setEditMinistryModal(false);
};

  /* ── status helpers ── */
  const saveNewStatus = async () => {
  const trimmed = newStatus.trim();
  if (!trimmed) return;

  const formatted =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

  if (statusList.includes(formatted)) {
    Alert.alert("Duplicate", "Status already exists");
    return;
  }

  const updated = [...statusList, formatted];

  setStatusList(updated);

  setMember(prev => ({
    ...prev,
    status: formatted,
  }));

  setNewStatus("");
  setStatusModal(false);

  // ✅ SAVE TO FIRESTORE
  try {
    const ref = doc(db, "organizations", organizationId, "settings", "lists");

    await setDoc(ref, {
      statuses: updated,
    }, { merge: true });

  } catch (e) {
    console.log("❌ SAVE STATUS ERROR:", e);
  }
};


  /* ══════════════════════════ STEP CONTENT ══════════════════════════ */

  const StepOne = (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
    
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
        keyboardType="phone-pad"
        onChangeText={(t) => setMember({ ...member, phone: t })}
      />

      <Text style={styles.label}>ADDRESS</Text>
      <TextInput
        style={styles.input}
        value={member.address}
        onChangeText={(t) => setMember({ ...member, address: t })}
      />
    </View>

    {/* ✅ FIXED NEXT BUTTON */}
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
);

  const StepTwo = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MORE DETAILS</Text>

        <Text style={styles.label}>OCCUPATION</Text>
        <TextInput style={styles.input} placeholder="Enter occupation" value={member.occupation}
          onChangeText={(t) => setMember({ ...member, occupation: t })} />

        <Text style={styles.label}>EMERGENCY CONTACT</Text>
        <TextInput style={styles.input} placeholder="+233..." keyboardType="phone-pad"
          value={member.emergencyContact}
          onChangeText={(t) => setMember({ ...member, emergencyContact: t })} />

        <Text style={styles.label}>MEMBERSHIP DURATION</Text>
        <TextInput style={styles.input} placeholder="e.g. 2 years" value={member.membershipDuration}
          onChangeText={(t) => setMember({ ...member, membershipDuration: t })} />

        <Text style={styles.label}>COMMUNICANT *</Text>
        <View style={styles.row}>
          {["yes", "no"].map((val) => (
            <TouchableOpacity key={val}
              onPress={() => handleCommunicantSelect(val)}
              style={[styles.communicantBtn, member.communicant === val && styles.activeBtn]}>
              <Text style={[styles.btnText, member.communicant === val && { color: "#fff" }]}>
                {val.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {member.communicant === "yes" && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Status: {member.communicantStatus === "invalid"
                ? `Invalid since ${member.communicantInvalidSince || "—"}`
                : "Active"}
            </Text>
            <TouchableOpacity onPress={() => setCommStatusModal(true)}>
              <Text style={styles.changeBtn}>Change</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>CHURCH DETAILS</Text>

        {/* ── MINISTRY — fixed: wraps instead of horizontal scroll ── */}
        <Text style={styles.label}>MINISTRY</Text>
        <View style={styles.chipWrap}>
          {ministries.map((item, index) => (
            <TouchableOpacity key={item}
              onPress={() => setMember(prev => ({ ...prev, ministry: item }))}
              onLongPress={() => {
                setSelectedMinistryIndex(index);
                setEditMinistryValue(item);
                setEditMinistryModal(true);
              }}
              style={[styles.chip, member.ministry === item && styles.chipActive]}>
              <Text style={member.ministry === item ? styles.chipTextActive : styles.chipText}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setMinistryModal(true)} style={{ marginTop: 6 }}>
          <Text style={styles.addOptionText}>+ Add option</Text>
        </TouchableOpacity>

        {/* ── STATUS — fixed: wraps instead of horizontal scroll ── */}
        <Text style={[styles.label, { marginTop: 18 }]}>STATUS</Text>
        <View style={styles.chipWrap}>
          {statusList.map((item) => (
            <TouchableOpacity key={item}
              onPress={() => setMember(prev => ({ ...prev, status: item }))}
              style={[styles.chip, member.status === item && styles.chipActive]}>
              <Text style={member.status === item ? styles.chipTextActive : styles.chipText}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setStatusModal(true)} style={{ marginTop: 6 }}>
          <Text style={styles.addOptionText}>+ Add option</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMember}>
        <Text style={styles.saveText}>Save Member</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(0)}>
        <Text style={styles.cancelText}>Back</Text>
      </TouchableOpacity>

    </ScrollView>
  );

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar translucent={false} backgroundColor="#4B3F72" barStyle="light-content" />

      <AppHeader
        title={editingId ? "Edit Member" : "Add Member"}
        subtitle="Register a church member"
        onBack={handleBack}
      />

      {/* Step progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          <View style={[styles.stepCircle, step >= 0 && styles.stepActive]}>
            <Text style={styles.stepText}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 1 && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step >= 1 && styles.stepActive]}>
            <Text style={styles.stepText}>2</Text>
          </View>
        </View>
        <Text style={styles.progressLabel}>Step {step + 1} of 2</Text>
      </View>

      {/* Step content */}
      <View style={{ flex: 1, backgroundColor: "#f4f6fb" }}>
        {step === 0 ? StepOne : StepTwo}
      </View>

      {/* ══ COMMUNICANT STATUS MODAL ══ */}
      <Modal visible={commStatusModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Communicant Status</Text>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#22c55e" }]}
              onPress={() => handleCommStatus("active")}>
              <Text style={styles.white}>Active (Eligible)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ef4444", marginTop: 10 }]}
              onPress={() => handleCommStatus("invalid")}>
              <Text style={styles.white}>Invalid (Sick / Restricted)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCommStatusModal(false)} style={{ marginTop: 10 }}>
              <Text style={{ textAlign: "center", color: "#888" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ COMMUNICANT INVALID DETAILS MODAL ══ */}
      <Modal visible={commInvalidModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Invalid Communicant</Text>

            <Text style={styles.label}>Invalid Since</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text>{commInvalidDate.toDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={commInvalidDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
              />
            )}

            <Text style={styles.label}>Reason / Note</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              multiline
              placeholder="Describe situation…"
              value={member.communicantNote}
              onChangeText={(t) => setMember(prev => ({ ...prev, communicantNote: t }))}
            />

            <TouchableOpacity style={[styles.actionBtn, { marginTop: 12 }]}
              onPress={() => setCommInvalidModal(false)}>
              <Text style={styles.white}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ ADD MINISTRY MODAL ══ */}
      <Modal visible={ministryModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Ministry</Text>
            <TextInput style={styles.input} placeholder="Enter ministry name"
              value={newMinistry} onChangeText={setNewMinistry} autoFocus />
            <TouchableOpacity style={[styles.actionBtn, { marginTop: 12 }]} onPress={saveNewMinistry}>
              <Text style={styles.white}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMinistryModal(false)}>
              <Text style={{ textAlign: "center", marginTop: 10, color: "#888" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ EDIT MINISTRY MODAL (long-press) ══ */}
      <Modal visible={editMinistryModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Ministry</Text>
            <TextInput style={styles.input} value={editMinistryValue}
              onChangeText={setEditMinistryValue} autoFocus />
            <TouchableOpacity style={[styles.actionBtn, { marginTop: 12 }]} onPress={saveEditedMinistry}>
              <Text style={styles.white}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditMinistryModal(false)}>
              <Text style={{ textAlign: "center", marginTop: 10, color: "#888" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ ADD STATUS MODAL ══ */}
      <Modal visible={statusModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Status</Text>
            <TextInput style={styles.input} placeholder="Enter status name"
              value={newStatus} onChangeText={setNewStatus} autoFocus />
            <TouchableOpacity style={[styles.actionBtn, { marginTop: 12 }]} onPress={saveNewStatus}>
              <Text style={styles.white}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStatusModal(false)}>
              <Text style={{ textAlign: "center", marginTop: 10, color: "#888" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  body: { flex: 1, backgroundColor: "#f4f6fb" },

  container: { padding: 16, paddingBottom: 40 },

  label: { fontSize: 12, fontWeight: "700", color: "#555", marginTop: 12, marginBottom: 6 },

  input: {
    backgroundColor: "#fff",
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
    marginTop: 10,
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#4B3F72", marginBottom: 10 },

  progressWrap: { backgroundColor: "#4B3F72", paddingVertical: 14, alignItems: "center" },
  progressRow: { flexDirection: "row", alignItems: "center" },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#bbb", alignItems: "center", justifyContent: "center" },
  stepActive: { backgroundColor: "#22c55e" },
  stepText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  stepLine: { width: 40, height: 3, backgroundColor: "#bbb" },
  stepLineActive: { backgroundColor: "#22c55e" },
  progressLabel: { marginTop: 6, color: "#eee", fontSize: 12 },

  // ✅ FIX: chips now wrap onto multiple lines within the card's
  // width instead of being forced into a horizontal ScrollView that
  // overflowed the screen edge.
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#EDEDED",
    borderRadius: 20,
  },
  chipActive: { backgroundColor: "#4B3F72" },
  chipText: { color: "#555", fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "700", fontSize: 13 },
  addOptionText: { color: "#4B3F72", fontWeight: "700", fontSize: 13 },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EEF0FA",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  infoText: { fontSize: 12, color: "#4B3F72", flex: 1 },
  changeBtn: { fontSize: 12, fontWeight: "800", color: "#4B3F72" },
});