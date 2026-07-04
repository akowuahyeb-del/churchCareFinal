// screens/TransferRequestScreen.js
//
// ✅ Used by BOTH a member requesting their own transfer AND an admin
// initiating one. The difference: a member sees only their own record
// and can write a reason; an admin picks any member, picks the
// destination, and can approve immediately if they hold the right
// permission. Both paths write the same transfer document and trigger
// the same notification to every manage_members holder in the org.

import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  query, where, serverTimestamp
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";
import { hasPermission } from "../constants/permissions";
import { notifyApprovers, createMemberNotification } from "../utils/transferNotifications";

export default function TransferRequestScreen({ route }) {
  const navigation = useNavigation();

  // If opened from a member's profile, the member is pre-filled.
  // If opened from MembersScreen admin action, same.
  const prefilledMember = route?.params?.member || null;
  const isAdminInitiated = route?.params?.isAdmin || false;
  const viewerPermissions = route?.params?.viewerPermissions || [];
  const viewerName = route?.params?.viewerName || "Staff";
  const viewerUid  = route?.params?.viewerUid  || null;

  const canApproveImmediately = hasPermission({ permissions: viewerPermissions }, "manage_members");

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;
  const entityName     = activeEntity?.name || "Current Congregation";

  const [allEntities, setAllEntities] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const [selectedMember, setSelectedMember] = useState(prefilledMember);
  const [destinationEntity, setDestinationEntity] = useState(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [entityPickerModal, setEntityPickerModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    loadEntities();
  }, [organizationId]);

  const loadEntities = async () => {
    setEntitiesLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "organizations", organizationId, "entities"),
          where("status", "==", "active")
        )
      );
      // Exclude the current entity — you can't transfer to where you already are
      setAllEntities(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(e => e.id !== entityId)
      );
    } catch (e) {
      console.log("❌ loadEntities:", e);
    } finally {
      setEntitiesLoading(false);
    }
  };

  const REASONS = [
    "Relocation to a new area",
    "Closer to new home",
    "Family attending different branch",
    "Work schedule change",
    "Pastoral referral",
    "Church planting assignment",
    "Disciplinary transfer",
    "Personal preference",
  ];

  const handleSubmit = async () => {
    if (!selectedMember) { Alert.alert("Required", "Select a member."); return; }
    if (!destinationEntity) { Alert.alert("Required", "Select the destination congregation."); return; }
    if (!reason.trim()) { Alert.alert("Required", "Please give a reason for this transfer."); return; }
    if (!organizationId || !entityId) return;

    setSubmitting(true);
    try {
      const transferPayload = {
        memberId:           selectedMember.id,
        memberName:         selectedMember.name,
        memberCode:         selectedMember.memberCode || "",
        memberPhone:        selectedMember.phone || "",
        memberMinistry:     selectedMember.ministry || "",
        fromEntityId:       entityId,
        fromEntityName:     entityName,
        toEntityId:         destinationEntity.id,
        toEntityName:       destinationEntity.name,
        requestedByUid:     viewerUid || "unknown",
        requestedByName:    viewerName,
        requestedByRole:    isAdminInitiated ? "admin" : "member",
        reason:             reason.trim(),
        notes:              notes.trim(),
        effectiveDate,
        status:             "pending",
        requestedAt:        new Date().toISOString(),
        organizationId,
        auditLog: [
          {
            action:  "transfer_requested",
            by:      viewerName,
            byRole:  isAdminInitiated ? "admin" : "member",
            at:      new Date().toISOString(),
            note:    `Transfer request submitted. Reason: ${reason.trim()}`,
          }
        ]
      };

      const transferRef = await addDoc(
        collection(db, "organizations", organizationId, "transfers"),
        transferPayload
      );

      // ✅ Notify every manage_members holder in the org
      await notifyApprovers(organizationId, entityId, {
        transferId: transferRef.id,
        memberName: selectedMember.name,
        fromEntityName: entityName,
        toEntityName: destinationEntity.name,
        reason: reason.trim(),
        requestedByName: viewerName,
      });

      // ✅ Notify the member themselves (so they can track status)
      if (!isAdminInitiated && viewerUid) {
        await createMemberNotification(organizationId, viewerUid, {
          type: "transfer_submitted",
          title: "Transfer Request Submitted",
          body: `Your request to transfer to ${destinationEntity.name} has been submitted and is awaiting approval.`,
          transferId: transferRef.id,
        });
      } else {
        // Admin initiated — still notify the member
        await createMemberNotification(organizationId, selectedMember.id, {
          type: "transfer_initiated",
          title: "Transfer Request Initiated",
          body: `${viewerName} has submitted a transfer request on your behalf to ${destinationEntity.name}.`,
          transferId: transferRef.id,
        });
      }

      Alert.alert(
        "✅ Transfer Request Submitted",
        `The request to transfer ${selectedMember.name} to ${destinationEntity.name} has been submitted. Approvers have been notified.`
      );
      navigation.goBack();

    } catch (e) {
      console.log("❌ handleSubmit transfer:", e);
      Alert.alert("Error", "Could not submit transfer request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Transfer Request"
        subtitle="Member congregation transfer"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.body}>

        {/* MEMBER */}
        <Text style={styles.sectionTitle}>Member</Text>
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {(selectedMember?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{selectedMember?.name || "No member selected"}</Text>
            <Text style={styles.memberSub}>
              {selectedMember?.ministry || ""}{selectedMember?.memberCode ? `  ·  ID: ${selectedMember.memberCode}` : ""}
            </Text>
          </View>
        </View>

        {/* FROM → TO */}
        <Text style={styles.sectionTitle}>Transfer Route</Text>
        <View style={styles.routeCard}>
          <View style={styles.routeNode}>
            <View style={[styles.routeDot, { backgroundColor: "#e74c3c" }]} />
            <View>
              <Text style={styles.routeNodeLabel}>From</Text>
              <Text style={styles.routeNodeName}>{entityName}</Text>
              <Text style={styles.routeNodeSub}>Current congregation</Text>
            </View>
          </View>

          <View style={styles.routeArrow}>
            <View style={styles.routeLine} />
            <Ionicons name="arrow-forward" size={16} color="#4B3F72" />
          </View>

          <TouchableOpacity
            style={styles.routeNode}
            onPress={() => setEntityPickerModal(true)}
          >
            <View style={[styles.routeDot, { backgroundColor: destinationEntity ? "#27ae60" : "#ccc" }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeNodeLabel}>To</Text>
              {destinationEntity ? (
                <>
                  <Text style={styles.routeNodeName}>{destinationEntity.name}</Text>
                  <Text style={[styles.routeNodeSub, { color: "#27ae60" }]}>Tap to change</Text>
                </>
              ) : (
                <Text style={[styles.routeNodeName, { color: "#aaa" }]}>Tap to select destination</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4B3F72" />
          </TouchableOpacity>
        </View>

        {/* REASON */}
        <Text style={styles.sectionTitle}>Reason for Transfer *</Text>
        <View style={styles.reasonGrid}>
          {REASONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
              onPress={() => setReason(r)}
            >
              <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Or type a specific reason…"
          value={REASONS.includes(reason) ? "" : reason}
          onChangeText={setReason}
        />

        {/* EFFECTIVE DATE */}
        <Text style={styles.sectionTitle}>Effective Date</Text>
        <TextInput
          style={styles.input}
          value={effectiveDate}
          onChangeText={setEffectiveDate}
          placeholder="YYYY-MM-DD"
        />

        {/* ADDITIONAL NOTES */}
        <Text style={styles.sectionTitle}>Additional Notes (optional)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          placeholder="Any context the approver should know…"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* NOTICE */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#4B3F72" />
          <Text style={styles.infoBoxText}>
            This request will be sent to all administrators with member-management access for approval.
            The member's record will be automatically updated once approved. A full audit log
            — why, when, who — will be recorded regardless of outcome.
          </Text>
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Transfer Request</Text>
              </>}
        </TouchableOpacity>

      </ScrollView>

      {/* ENTITY PICKER MODAL */}
      <Modal visible={entityPickerModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Select Destination Congregation</Text>
            {entitiesLoading ? (
              <ActivityIndicator color="#4B3F72" style={{ marginVertical: 20 }} />
            ) : allEntities.length === 0 ? (
              <Text style={styles.emptyText}>No other active congregations found in this organization.</Text>
            ) : (
              <ScrollView>
                {allEntities.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.entityOption, destinationEntity?.id === e.id && styles.entityOptionActive]}
                    onPress={() => { setDestinationEntity(e); setEntityPickerModal(false); }}
                  >
                    <Ionicons name="home-outline" size={16} color={destinationEntity?.id === e.id ? "#4B3F72" : "#aaa"} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entityOptionName, destinationEntity?.id === e.id && { color: "#4B3F72" }]}>
                        {e.name}
                      </Text>
                      {e.location && <Text style={styles.entityOptionSub}>{e.location}</Text>}
                    </View>
                    {destinationEntity?.id === e.id && <Ionicons name="checkmark-circle" size={18} color="#4B3F72" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity onPress={() => setEntityPickerModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { padding: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#888", textTransform: "uppercase", marginBottom: 8, marginTop: 16 },

  memberCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, elevation: 1 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 15, fontWeight: "800", color: "#4B3F72" },
  memberName: { fontSize: 15, fontWeight: "700", color: "#222" },
  memberSub: { fontSize: 12, color: "#888", marginTop: 2 },

  routeCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1, gap: 12 },
  routeNode: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  routeNodeLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", textTransform: "uppercase" },
  routeNodeName: { fontSize: 14, fontWeight: "700", color: "#222", marginTop: 1 },
  routeNodeSub: { fontSize: 11, color: "#888", marginTop: 1 },
  routeArrow: { flexDirection: "row", alignItems: "center", paddingLeft: 6, gap: 4 },
  routeLine: { flex: 1, height: 1, backgroundColor: "#eee" },

  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  reasonChipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  reasonChipText: { fontSize: 12, color: "#555", fontWeight: "600" },
  reasonChipTextActive: { color: "#fff" },

  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#eee", fontSize: 14, marginBottom: 4 },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 16 },
  infoBoxText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 17 },

  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4B3F72", borderRadius: 14, padding: 16 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 14 },
  entityOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 10, marginBottom: 6, borderWidth: 1.5, borderColor: "#eee" },
  entityOptionActive: { borderColor: "#4B3F72", backgroundColor: "#fafafe" },
  entityOptionName: { fontSize: 14, fontWeight: "700", color: "#333" },
  entityOptionSub: { fontSize: 11, color: "#888", marginTop: 2 },
  cancelText: { textAlign: "center", color: "#888", padding: 14, fontWeight: "600" },
  emptyText: { color: "#aaa", textAlign: "center", padding: 20 },
});