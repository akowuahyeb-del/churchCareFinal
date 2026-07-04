// screens/TransferManagementScreen.js
//
// ✅ The approver's view. Accessible from the notification badge in the
// header or from Settings. Shows pending, approved, and rejected
// transfers with full audit history. Approving automatically:
//   1. Copies the member doc to the new entity's members collection
//   2. Deletes (or flags) the old member doc
//   3. Writes an audit log entry on the transfer doc
//   4. Creates an in-app notification for the member

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
  collection, getDocs, doc, getDoc, updateDoc,
  query, where, orderBy, addDoc, deleteDoc, setDoc
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";
import { createMemberNotification } from "../utils/transferNotifications";

const STATUS_CONFIG = {
  pending:   { color: "#F39C12", icon: "hourglass-outline",    label: "Pending"  },
  approved:  { color: "#27ae60", icon: "checkmark-circle",     label: "Approved" },
  rejected:  { color: "#e74c3c", icon: "close-circle",         label: "Rejected" },
  completed: { color: "#4B3F72", icon: "checkmark-done-circle", label: "Completed" },
};

export default function TransferManagementScreen({ route }) {
  const navigation = useNavigation();
  const viewerName = route?.params?.viewerName || "Admin";
  const viewerUid  = route?.params?.viewerUid  || null;

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    loadTransfers();
  }, [organizationId, filter]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "organizations", organizationId, "transfers"),
        where("status", "==", filter)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
      setTransfers(list);
    } catch (e) {
      console.log("❌ loadTransfers:", e);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // APPROVE TRANSFER
  // ✅ The actual work: copy member to new entity, update the transfer
  // doc, notify the member, write the audit trail.
  // ─────────────────────────────────────────────────────────────────
  const approveTransfer = async (transfer) => {
    setProcessing(true);
    try {
      const now = new Date().toISOString();

      // 1. Load the member's full record from the source entity
      const memberRef = doc(
        db, "organizations", organizationId,
        "entities", transfer.fromEntityId,
        "members", transfer.memberId
      );
      const memberSnap = await getDoc(memberRef);

      if (!memberSnap.exists()) {
        Alert.alert(
          "Member Not Found",
          "The member's record could not be found in the source congregation. They may have already been transferred or deleted."
        );
        return;
      }

      const memberData = { id: memberSnap.id, ...memberSnap.data() };

      // 2. Create the member record in the destination entity
      // ✅ Use setDoc with the same memberId so there's one consistent
      // ID for this person across the organization, even as they move.
      await setDoc(
        doc(db, "organizations", organizationId, "entities", transfer.toEntityId, "members", transfer.memberId),
        {
          ...memberData,
          entityId:             transfer.toEntityId,
          entityName:           transfer.toEntityName,
          previousEntityId:     transfer.fromEntityId,
          previousEntityName:   transfer.fromEntityName,
          transferredAt:        now,
          transferredBy:        viewerName,
          transferReason:       transfer.reason,
          transferId:           transfer.id,
          updatedAt:            now,
        }
      );

      // 3. Mark the old member record as transferred (don't delete —
      // keeps historical attendance/contribution records linkable)
      await updateDoc(memberRef, {
        status:         "transferred",
        transferredTo:  transfer.toEntityId,
        transferredAt:  now,
        transferId:     transfer.id,
      });

      // 4. Update the transfer doc
      const auditEntry = {
        action:  "transfer_approved",
        by:      viewerName,
        byRole:  "admin",
        at:      now,
        note:    `Approved by ${viewerName}. Member record copied to ${transfer.toEntityName}.`,
      };

      await updateDoc(
        doc(db, "organizations", organizationId, "transfers", transfer.id),
        {
          status:       "approved",
          reviewedAt:   now,
          reviewedByName: viewerName,
          completedAt:  now,
          auditLog:     [...(transfer.auditLog || []), auditEntry],
        }
      );

      // 5. ✅ Notify the member
      await createMemberNotification(organizationId, transfer.memberId, {
        type:       "transfer_approved",
        title:      "Transfer Approved ✅",
        body:       `Your transfer to ${transfer.toEntityName} has been approved by ${viewerName}. Your profile has been updated automatically.`,
        transferId: transfer.id,
      });

      // 6. Log to platform activity
      await addDoc(collection(db, "platformActivity"), {
        type:    "member_transferred",
        orgId:   organizationId,
        message: `${transfer.memberName} transferred from ${transfer.fromEntityName} to ${transfer.toEntityName}`,
        createdAt: now,
      });

      setDetailModal(false);
      await loadTransfers();
      Alert.alert(
        "✅ Transfer Approved",
        `${transfer.memberName} has been moved to ${transfer.toEntityName}. Their profile has been updated automatically and they have been notified.`
      );

    } catch (e) {
      console.log("❌ approveTransfer:", e);
      Alert.alert("Error", "Could not complete the transfer: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // REJECT TRANSFER
  // ─────────────────────────────────────────────────────────────────
  const rejectTransfer = async (transfer) => {
    if (!rejectReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection.");
      return;
    }
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const auditEntry = {
        action:  "transfer_rejected",
        by:      viewerName,
        byRole:  "admin",
        at:      now,
        note:    `Rejected: ${rejectReason.trim()}`,
      };

      await updateDoc(
        doc(db, "organizations", organizationId, "transfers", transfer.id),
        {
          status:          "rejected",
          reviewedAt:      now,
          reviewedByName:  viewerName,
          rejectionReason: rejectReason.trim(),
          auditLog:        [...(transfer.auditLog || []), auditEntry],
        }
      );

      // ✅ Notify the member of the rejection with the reason
      await createMemberNotification(organizationId, transfer.memberId, {
        type:       "transfer_rejected",
        title:      "Transfer Request Not Approved",
        body:       `Your transfer request to ${transfer.toEntityName} was not approved. Reason: ${rejectReason.trim()}. Please speak to your church administrator for more information.`,
        transferId: transfer.id,
      });

      setDetailModal(false);
      setRejectReason("");
      await loadTransfers();
      Alert.alert("Transfer Rejected", `${transfer.memberName}'s transfer has been rejected and they have been notified.`);

    } catch (e) {
      console.log("❌ rejectTransfer:", e);
      Alert.alert("Error", "Could not reject the transfer.");
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = transfers.filter(t => t.status === "pending").length;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Transfer Requests"
        subtitle="Member congregation transfers"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* FILTER TABS */}
      <View style={styles.filterRow}>
        {["pending", "approved", "rejected"].map(f => {
          const cfg = STATUS_CONFIG[f];
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && { backgroundColor: cfg.color }]}
              onPress={() => setFilter(f)}
            >
              <Ionicons name={cfg.icon} size={12} color={filter === f ? "#fff" : "#888"} />
              <Text style={[styles.filterChipText, filter === f && { color: "#fff" }]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color="#4B3F72" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {transfers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="swap-horizontal-outline" size={42} color="#ddd" />
              <Text style={styles.emptyText}>No {filter} transfers</Text>
            </View>
          ) : (
            transfers.map(t => {
              const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.transferCard}
                  onPress={() => { setSelectedTransfer(t); setDetailModal(true); setRejectReason(""); }}
                >
                  {/* STATUS STRIPE */}
                  <View style={[styles.transferStripe, { backgroundColor: cfg.color }]} />

                  <View style={styles.transferCardBody}>
                    <View style={styles.transferCardHeader}>
                      <View>
                        <Text style={styles.transferMemberName}>{t.memberName}</Text>
                        <Text style={styles.transferMemberCode}>{t.memberCode || ""}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: cfg.color + "22" }]}>
                        <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                        <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>

                    {/* ROUTE */}
                    <View style={styles.routeSummary}>
                      <Text style={styles.routeFrom}>{t.fromEntityName}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#4B3F72" style={{ marginHorizontal: 6 }} />
                      <Text style={styles.routeTo}>{t.toEntityName}</Text>
                    </View>

                    <Text style={styles.transferReason} numberOfLines={1}>
                      Reason: {t.reason}
                    </Text>

                    <View style={styles.transferMeta}>
                      <Text style={styles.transferMetaText}>
                        By {t.requestedByName} · {t.requestedAt?.slice(0, 10) || "—"}
                      </Text>
                      {t.reviewedAt && (
                        <Text style={styles.transferMetaText}>
                          Reviewed {t.reviewedAt?.slice(0, 10)} by {t.reviewedByName}
                        </Text>
                      )}
                    </View>

                    {t.status === "pending" && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => approveTransfer(t)}
                          disabled={processing}
                        >
                          {processing
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                                <Text style={styles.approveBtnText}>Approve</Text>
                              </>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => { setSelectedTransfer(t); setDetailModal(true); }}
                        >
                          <Ionicons name="close-circle-outline" size={14} color="#fff" />
                          <Text style={styles.rejectBtnText}>Review</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* DETAIL MODAL */}
      <Modal visible={detailModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: "90%" }]}>
            {selectedTransfer && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedTransfer.memberName}</Text>
                <Text style={styles.modalSub}>Transfer Request Details</Text>

                {/* ROUTE */}
                <View style={styles.detailRouteCard}>
                  <DetailRow label="From" value={selectedTransfer.fromEntityName} />
                  <DetailRow label="To" value={selectedTransfer.toEntityName} />
                  <DetailRow label="Effective Date" value={selectedTransfer.effectiveDate || "—"} />
                  <DetailRow label="Reason" value={selectedTransfer.reason} />
                  {selectedTransfer.notes && <DetailRow label="Notes" value={selectedTransfer.notes} />}
                  <DetailRow label="Requested By" value={`${selectedTransfer.requestedByName} (${selectedTransfer.requestedByRole})`} />
                  <DetailRow label="Requested At" value={selectedTransfer.requestedAt?.slice(0, 16).replace("T", " ") || "—"} />
                  {selectedTransfer.reviewedByName && <DetailRow label="Reviewed By" value={selectedTransfer.reviewedByName} />}
                  {selectedTransfer.rejectionReason && (
                    <DetailRow label="Rejection Reason" value={selectedTransfer.rejectionReason} highlight="#e74c3c" />
                  )}
                </View>

                {/* AUDIT LOG */}
                {selectedTransfer.auditLog?.length > 0 && (
                  <>
                    <Text style={styles.auditTitle}>Audit Trail</Text>
                    {selectedTransfer.auditLog.map((entry, i) => (
                      <View key={i} style={styles.auditRow}>
                        <View style={styles.auditDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.auditAction}>{entry.note}</Text>
                          <Text style={styles.auditMeta}>
                            {entry.by} · {entry.at?.slice(0, 16).replace("T", " ") || "—"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* APPROVAL ACTIONS */}
                {selectedTransfer.status === "pending" && (
                  <>
                    <TouchableOpacity
                      style={[styles.approveModalBtn, processing && { opacity: 0.6 }]}
                      onPress={() => approveTransfer(selectedTransfer)}
                      disabled={processing}
                    >
                      {processing
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve & Execute Transfer</Text>
                          </>}
                    </TouchableOpacity>

                    <Text style={styles.fieldLabel}>Rejection Reason (required to reject)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Why is this transfer being declined?"
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.rejectModalBtn, !rejectReason.trim() && { opacity: 0.4 }]}
                      onPress={() => rejectTransfer(selectedTransfer)}
                      disabled={!rejectReason.trim() || processing}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#fff" />
                      <Text style={styles.rejectBtnText}>Reject Transfer</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={() => { setDetailModal(false); setRejectReason(""); }}>
                  <Text style={styles.cancelText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && { color: highlight }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { padding: 14, paddingBottom: 60 },

  filterRow: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  filterChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f0f0f0" },
  filterChipText: { fontSize: 11, color: "#888", fontWeight: "700" },

  transferCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", elevation: 1 },
  transferStripe: { width: 4 },
  transferCardBody: { flex: 1, padding: 14 },
  transferCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 },
  transferMemberName: { fontSize: 15, fontWeight: "800", color: "#222" },
  transferMemberCode: { fontSize: 11, color: "#aaa", marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  routeSummary: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8f8f8", borderRadius: 8, padding: 8, marginBottom: 8 },
  routeFrom: { fontSize: 12, fontWeight: "700", color: "#555" },
  routeTo: { fontSize: 12, fontWeight: "700", color: "#4B3F72" },
  transferReason: { fontSize: 12, color: "#888", marginBottom: 8 },
  transferMeta: { gap: 2 },
  transferMetaText: { fontSize: 10, color: "#bbb" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#27ae60", borderRadius: 8, padding: 9 },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#e74c3c", borderRadius: 8, padding: 9 },
  rejectBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#222" },
  modalSub: { fontSize: 12, color: "#888", marginBottom: 14 },

  detailRouteCard: { backgroundColor: "#f8f8f8", borderRadius: 12, padding: 14, marginBottom: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
  detailLabel: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  detailValue: { fontSize: 12, color: "#333", fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 10 },

  auditTitle: { fontSize: 11, fontWeight: "800", color: "#aaa", textTransform: "uppercase", marginBottom: 8 },
  auditRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4B3F72", marginTop: 4 },
  auditAction: { fontSize: 12, color: "#333", fontWeight: "600" },
  auditMeta: { fontSize: 10, color: "#aaa", marginTop: 2 },

  approveModalBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#27ae60", borderRadius: 12, padding: 14, marginBottom: 12 },
  rejectModalBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#e74c3c", borderRadius: 12, padding: 14, marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 8 },
  cancelText: { textAlign: "center", color: "#888", padding: 14, fontWeight: "600" },
});