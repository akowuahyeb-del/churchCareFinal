import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal,
  Image, Alert, Dimensions, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { db } from "../firebase";
import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, serverTimestamp
} from "firebase/firestore";

// ─────────────────────────────────────────────────
// ROLE LEVELS (hierarchy for approval chain)
// admin > pastor > elder > deacon > member
// ─────────────────────────────────────────────────
const ROLE_LEVEL = { admin: 5, pastor: 4, elder: 3, deacon: 2, member: 1 };

const REQUIRED_APPROVALS = {
  suspend:    ["pastor", "elder"],   // needs pastor + elder
  reprimand:  ["elder"],             // needs at least elder
  demote:     ["pastor", "admin"],   // needs pastor + admin
};

export default function MemberProfileScreen({ route, navigation }) {

  // memberId + current user's role passed from MembersScreen
  const memberId  = route?.params?.memberId  || "demo_member";
  const viewerRole= route?.params?.role      || "member"; // "admin"|"pastor"|"elder"|"deacon"|"member"

  const isAdmin   = ROLE_LEVEL[viewerRole] >= ROLE_LEVEL["admin"];
  const isPastor  = ROLE_LEVEL[viewerRole] >= ROLE_LEVEL["pastor"];
  const isElder   = ROLE_LEVEL[viewerRole] >= ROLE_LEVEL["elder"];
  const isDeacon  = ROLE_LEVEL[viewerRole] >= ROLE_LEVEL["deacon"];
  const isMember  = viewerRole === "member";

  /* ── MEMBER STATE ── */
  const [member, setMember] = useState({
    id: memberId,
    name: "John Doe",
    phone: "0240000000",
    address: "Accra, Ghana",
    occupation: "Teacher",
    ministry: "Choir",
    baptism: "Not Baptised",
    emergency: "Mother — 0200000000",
    duration: "2 years",
    joinDate: "2022-01-15",
    status: "active",   // active | suspended | deceased | inactive
    profileImage: null,
    dateOfDeath: null,
  });

  /* ── PENDING APPROVALS ── */
  // { suspend: ["elder"], reprimand: [], demote: ["pastor"] }
  const [approvals, setApprovals] = useState({ suspend: [], reprimand: [], demote: [] });

  /* ── RECORDS ── */
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [contributions, setContributions]         = useState([]);

  /* ── ACTIVE TAB ── */
  const [tab, setTab] = useState("profile"); // profile | attendance | contributions | status

  /* ── EDIT MODAL ── */
  const [editModal, setEditModal]   = useState(false);
  const [editField, setEditField]   = useState("");
  const [editLabel, setEditLabel]   = useState("");
  const [editInput, setEditInput]   = useState("");

  /* ── DECEASED MODAL ── */
  const [deceasedModal, setDeceasedModal] = useState(false);
  const [dateOfDeath, setDateOfDeath]     = useState("");

  /* ── APPROVAL REQUEST MODAL ── */
  const [approvalModal, setApprovalModal]   = useState(false);
  const [approvalAction, setApprovalAction] = useState("");

  /* ── PENDING REQUEST MODAL (for non-admins) ── */
  const [requestModal, setRequestModal]     = useState(false);
  const [requestAction, setRequestAction]   = useState("");

  /* ────────────── LOAD DATA ────────────── */
  useEffect(() => { loadAttendance(); loadContributions(); }, []);

  const loadAttendance = async () => {
    try {
      const q = query(collection(db, "attendance"), where("memberId", "==", memberId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.date?.localeCompare(a.date));
      setAttendanceHistory(data);
    } catch (e) { console.log(e); }
  };

  const loadContributions = async () => {
    try {
      const q = query(collection(db, "contributions"), where("memberId", "==", memberId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.date?.localeCompare(a.date));
      setContributions(data);
    } catch (e) { console.log(e); }
  };

  /* ────────────── PROFILE PHOTO ────────────── */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to upload a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7
    });
    if (!result.canceled) {
      setMember(prev => ({ ...prev, profileImage: result.assets[0].uri }));
      // TODO: upload to Firebase Storage and save URL to Firestore
    }
  };

  /* ────────────── EDIT FIELD ────────────── */
  const openEdit = (field, label, value) => {
    setEditField(field); setEditLabel(label); setEditInput(value);
    setEditModal(true);
  };

  const saveEdit = () => {
    setMember(prev => ({ ...prev, [editField]: editInput }));
    setEditModal(false);
    // TODO: updateDoc(doc(db,"members",memberId), { [editField]: editInput })
  };

  /* ────────────── APPROVAL LOGIC ────────────── */
  // Check if current viewer's role satisfies one of the required approver roles
  const canApprove = (action) => {
    return REQUIRED_APPROVALS[action]?.includes(viewerRole) || isAdmin;
  };

  // Check if all required approvals are collected
  const isFullyApproved = (action) => {
    const required = REQUIRED_APPROVALS[action] || [];
    return required.every(r => approvals[action].includes(r));
  };

  const grantApproval = (action) => {
    if (approvals[action].includes(viewerRole)) {
      Alert.alert("Already approved", "You have already approved this action.");
      return;
    }
    const updated = { ...approvals, [action]: [...approvals[action], viewerRole] };
    setApprovals(updated);

    if (isFullyApproved2(action, updated)) {
      executeAction(action);
    } else {
      Alert.alert("Approval recorded", `Waiting for remaining approvals to execute ${action}.`);
    }
  };

  const isFullyApproved2 = (action, state) => {
    const required = REQUIRED_APPROVALS[action] || [];
    return required.every(r => state[action].includes(r));
  };

  const executeAction = (action) => {
    if (action === "suspend") {
      setMember(prev => ({ ...prev, status: "suspended" }));
      Alert.alert("Action executed", "Member has been suspended.");
    } else if (action === "reprimand") {
      Alert.alert("Action executed", "Member has been reprimanded and notified.");
    } else if (action === "demote") {
      Alert.alert("Action executed", "Member has been demoted.");
    }
    setApprovals(prev => ({ ...prev, [action]: [] })); // reset
  };

  const reinstate = () => {
    setMember(prev => ({ ...prev, status: "active" }));
    setApprovals(prev => ({ ...prev, suspend: [] }));
    // TODO: updateDoc
  };

  /* ────────────── DECEASED ────────────── */
  const confirmDeceased = () => {
    if (!dateOfDeath.trim()) {
      Alert.alert("Date required", "Please enter the date of death.");
      return;
    }
    setMember(prev => ({ ...prev, status: "deceased", dateOfDeath }));
    setDeceasedModal(false);
    // TODO: updateDoc(doc(db,"members",memberId), { status:"deceased", dateOfDeath })
  };

  /* ────────────── APPROVAL LABELS ────────────── */
  const approvalStatus = (action) => {
    const required = REQUIRED_APPROVALS[action] || [];
    const done = approvals[action];
    return required.map(r => ({ role: r, approved: done.includes(r) }));
  };

  const isDeceased = member.status === "deceased";
  const isSuspended = member.status === "suspended";

  /* ════════════════════════════════════════════
                      RENDER
  ════════════════════════════════════════════ */
  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Member Profile</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{viewerRole}</Text>
        </View>
      </View>

      {/* ── PROFILE HERO ── */}
      <View style={styles.hero}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={(isAdmin || isPastor || isElder) ? pickImage : undefined}
          activeOpacity={(isAdmin || isPastor || isElder) ? 0.7 : 1}
        >
          {member.profileImage
            ? <Image source={{ uri: member.profileImage }} style={styles.avatar} />
            : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )
          }
          {(isAdmin || isPastor || isElder) && (
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.heroName}>{member.name}</Text>
        <Text style={styles.heroMinistry}>{member.ministry}</Text>

        {/* Status badge */}
        <View style={[styles.statusBadge, {
          backgroundColor:
            member.status === "active"    ? "#e8f8f0" :
            member.status === "suspended" ? "#fff3e0" :
            member.status === "deceased"  ? "#f0f0f0" : "#fce8e8"
        }]}>
          <View style={[styles.statusDot, {
            backgroundColor:
              member.status === "active"    ? "#27ae60" :
              member.status === "suspended" ? "#e67e22" :
              member.status === "deceased"  ? "#888"    : "#e74c3c"
          }]} />
          <Text style={[styles.statusLabel, {
            color:
              member.status === "active"    ? "#27ae60" :
              member.status === "suspended" ? "#e67e22" :
              member.status === "deceased"  ? "#666"    : "#e74c3c"
          }]}>
            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            {member.status === "deceased" && member.dateOfDeath ? ` · ${member.dateOfDeath}` : ""}
          </Text>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        {["profile","attendance","contributions","status"].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ══ TAB: PROFILE ══ */}
        {tab === "profile" && (
          <View>
            {[
              { key: "phone",      label: "Phone",      memberEditable: true },
              { key: "address",    label: "Address",    memberEditable: false },
              { key: "occupation", label: "Occupation", memberEditable: false },
              { key: "ministry",   label: "Ministry",   memberEditable: false },
              { key: "baptism",    label: "Baptism",    memberEditable: false },
              { key: "emergency",  label: "Emergency",  memberEditable: false },
              { key: "duration",   label: "Duration",   memberEditable: false },
              { key: "joinDate",   label: "Join Date",  memberEditable: false },
            ].map(({ key, label, memberEditable }) => {
              // Members can only edit phone; admins/leaders can edit all
              const canEdit = isAdmin || isPastor || isElder || (isMember && memberEditable);
              const needsApproval = isMember && !memberEditable;

              return (
                <View key={key} style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>{member[key] || "—"}</Text>
                  </View>
                  {canEdit && !isDeceased && (
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => openEdit(key, label, member[key])}
                    >
                      <Ionicons name="pencil" size={14} color="#4B3F72" />
                    </TouchableOpacity>
                  )}
                  {needsApproval && !isDeceased && (
                    <TouchableOpacity
                      style={styles.requestBtn}
                      onPress={() => { setRequestAction(key); setRequestModal(true); }}
                    >
                      <Text style={styles.requestBtnText}>Request edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ══ TAB: ATTENDANCE ══ */}
        {tab === "attendance" && (
          <View>
            <Text style={styles.sectionTitle}>Attendance History</Text>
            {attendanceHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>No attendance records yet</Text>
              </View>
            ) : (
              attendanceHistory.map(r => (
                <View key={r.id} style={styles.recordRow}>
                  <View>
                    <Text style={styles.recordTitle}>{r.service} · {r.type}</Text>
                    <Text style={styles.recordSub}>{r.date} · {r.event}</Text>
                  </View>
                  <View style={[styles.recordBadge, {
                    backgroundColor: r.status === "present" ? "#e8f8f0" : "#fce8e8"
                  }]}>
                    <Text style={{ color: r.status === "present" ? "#27ae60" : "#e74c3c", fontSize: 11, fontWeight: "700" }}>
                      {r.status === "present" ? "Present" : "Absent"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ══ TAB: CONTRIBUTIONS ══ */}
        {tab === "contributions" && (
          <View>
            <Text style={styles.sectionTitle}>Contribution Records</Text>
            {contributions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>No contributions recorded yet</Text>
              </View>
            ) : (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Contributions</Text>
                  <Text style={styles.totalAmount}>
                    GH₵ {contributions.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString()}
                  </Text>
                </View>
                {contributions.map(c => (
                  <View key={c.id} style={styles.recordRow}>
                    <View>
                      <Text style={styles.recordTitle}>{c.type || "Offering"}</Text>
                      <Text style={styles.recordSub}>{c.date}</Text>
                    </View>
                    <Text style={styles.contribAmount}>GH₵ {(c.amount || 0).toLocaleString()}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* ══ TAB: STATUS / ADMIN ACTIONS ══ */}
        {tab === "status" && (
          <View>
            <Text style={styles.sectionTitle}>Member Status</Text>

            <View style={styles.statusCard}>
              <Text style={styles.statusCardLabel}>Current Status</Text>
              <Text style={styles.statusCardValue}>{member.status.toUpperCase()}</Text>
            </View>

            {/* Only show action buttons if not deceased */}
            {!isDeceased && (
              <>

                {/* ── SUSPEND ── Admin/Pastor/Elder only */}
                {(isAdmin || isPastor || isElder) && (
                  <ActionBlock
                    title="Suspend Member"
                    color="#e67e22"
                    icon="ban-outline"
                    description="Suspends the member. Requires approval from Pastor + Elder."
                    approvalStatuses={approvalStatus("suspend")}
                    fullyApproved={isFullyApproved("suspend")}
                    canApprove={canApprove("suspend")}
                    onApprove={() => grantApproval("suspend")}
                    onExecute={() => executeAction("suspend")}
                    disabled={isSuspended}
                    disabledLabel="Already suspended"
                  >
                    {isSuspended && isAdmin && (
                      <TouchableOpacity style={[styles.actionExecBtn, { backgroundColor: "#27ae60", marginTop: 6 }]}
                        onPress={reinstate}>
                        <Ionicons name="refresh" size={14} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.white}>Reinstate</Text>
                      </TouchableOpacity>
                    )}
                  </ActionBlock>
                )}

                {/* ── REPRIMAND ── Admin/Pastor/Elder */}
                {(isAdmin || isPastor || isElder) && (
                  <ActionBlock
                    title="Reprimand Member"
                    color="#c0392b"
                    icon="warning-outline"
                    description="Issues a formal reprimand. Requires Elder approval."
                    approvalStatuses={approvalStatus("reprimand")}
                    fullyApproved={isFullyApproved("reprimand")}
                    canApprove={canApprove("reprimand")}
                    onApprove={() => grantApproval("reprimand")}
                    onExecute={() => executeAction("reprimand")}
                  />
                )}

                {/* ── DEMOTE ── Admin/Pastor only */}
                {(isAdmin || isPastor) && (
                  <ActionBlock
                    title="Demote Member"
                    color="#8e44ad"
                    icon="arrow-down-circle-outline"
                    description="Demotes the member's role. Requires Pastor + Admin approval."
                    approvalStatuses={approvalStatus("demote")}
                    fullyApproved={isFullyApproved("demote")}
                    canApprove={canApprove("demote")}
                    onApprove={() => grantApproval("demote")}
                    onExecute={() => executeAction("demote")}
                  />
                )}

                {/* ── DECEASED ── Admin/Pastor only */}
                {(isAdmin || isPastor) && (
                  <TouchableOpacity
                    style={[styles.deceasedBtn]}
                    onPress={() => setDeceasedModal(true)}
                  >
                    <Ionicons name="ribbon-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.white}>Mark as Deceased</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Members — no action buttons, just view */}
            {isMember && (
              <View style={styles.emptyState}>
                <Ionicons name="lock-closed-outline" size={36} color="#ccc" />
                <Text style={styles.emptyText}>Status changes require admin approval</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* ══════════ EDIT MODAL ══════════ */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit {editLabel}</Text>
            <TextInput
              style={styles.modalInput}
              value={editInput}
              onChangeText={setEditInput}
              autoFocus
              placeholder={`Enter ${editLabel}`}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveEdit}>
                <Text style={styles.white}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ DECEASED MODAL ══════════ */}
      <Modal visible={deceasedModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="ribbon" size={40} color="#888" />
            </View>
            <Text style={styles.modalTitle}>Mark as Deceased</Text>
            <Text style={styles.modalSubText}>
              This will set the member's status to <Text style={{ fontWeight: "700" }}>Deceased</Text> and
              hide all action buttons. This cannot be undone easily.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={dateOfDeath}
              onChangeText={setDateOfDeath}
              placeholder="Date of death (e.g. 2024-06-01)"
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#555" }]}
                onPress={confirmDeceased}
              >
                <Text style={styles.white}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeceasedModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ MEMBER EDIT REQUEST MODAL ══════════ */}
      <Modal visible={requestModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="send-outline" size={30} color="#4B3F72" style={{ alignSelf: "center", marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Request Edit</Text>
            <Text style={styles.modalSubText}>
              Changes to <Text style={{ fontWeight: "700" }}>{requestAction}</Text> require admin approval.
              Your request will be sent to the admin for review.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={`Proposed new value for ${requestAction}`}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn}
                onPress={() => { Alert.alert("Request sent", "Your edit request has been submitted for admin approval."); setRequestModal(false); }}>
                <Text style={styles.white}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRequestModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ─────────────────────────────────────────
   ActionBlock — reusable approval action card
───────────────────────────────────────── */
function ActionBlock({
  title, color, icon, description,
  approvalStatuses, fullyApproved, canApprove,
  onApprove, onExecute, disabled, disabledLabel, children
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.actionBlock, { borderLeftColor: color }]}>
      <TouchableOpacity style={styles.actionBlockHeader} onPress={() => setExpanded(p => !p)}>
        <View style={[styles.actionIconCircle, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionBlockTitle, { color }]}>{title}</Text>
          <Text style={styles.actionBlockDesc}>{description}</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#aaa" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.actionBlockBody}>
          {/* Approval chain */}
          <Text style={styles.approvalChainLabel}>Approval chain:</Text>
          <View style={styles.approvalChain}>
            {approvalStatuses.map(({ role, approved }) => (
              <View key={role} style={[styles.approvalPill, { backgroundColor: approved ? "#e8f8f0" : "#f5f5f5" }]}>
                <Ionicons
                  name={approved ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={approved ? "#27ae60" : "#bbb"}
                />
                <Text style={[styles.approvalPillText, { color: approved ? "#27ae60" : "#999" }]}>
                  {role}
                </Text>
              </View>
            ))}
          </View>

          {disabled ? (
            <Text style={styles.disabledLabel}>{disabledLabel}</Text>
          ) : (
            <>
              {canApprove && !fullyApproved && (
                <TouchableOpacity style={[styles.approveBtn, { backgroundColor: color }]} onPress={onApprove}>
                  <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.white}>Grant My Approval</Text>
                </TouchableOpacity>
              )}
              {fullyApproved && (
                <TouchableOpacity style={[styles.actionExecBtn, { backgroundColor: color }]} onPress={onExecute}>
                  <Ionicons name="flash" size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.white}>Execute Action</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {children}
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────────────────
   STYLES
───────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  /* Top bar */
  topBar: {
    backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: "row", alignItems: "center"
  },
  backBtn: { marginRight: 12 },
  topTitle: { color: "#fff", fontSize: 17, fontWeight: "700", flex: 1 },
  rolePill: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  /* Hero */
  hero: { backgroundColor: "#4B3F72", alignItems: "center", paddingBottom: 24, paddingTop: 8 },
  avatarWrap: { position: "relative" },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: "#fff" },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)"
  },
  avatarInitials: { color: "#fff", fontSize: 28, fontWeight: "700" },
  cameraOverlay: {
    position: "absolute", bottom: 2, right: 2,
    backgroundColor: "#1BA97F", borderRadius: 12,
    width: 24, height: 24, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff"
  },
  heroName: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 10 },
  heroMinistry: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  statusBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginTop: 10
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 12, fontWeight: "700" },

  /* Tabs */
  tabRow: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#eee"
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#4B3F72" },

  /* Info rows */
  infoRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", padding: 13,
    marginVertical: 3, borderRadius: 10,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  infoLabel: { fontSize: 10, color: "#aaa", fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 14, color: "#222", fontWeight: "500" },
  editIconBtn: {
    backgroundColor: "#f0edf9", borderRadius: 8,
    padding: 8, marginLeft: 8
  },
  requestBtn: {
    backgroundColor: "#e8f0fe", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8
  },
  requestBtnText: { fontSize: 10, color: "#4B3F72", fontWeight: "600" },

  /* Section */
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 16, marginBottom: 8 },

  /* Records */
  recordRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", padding: 12, borderRadius: 10, marginVertical: 3,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  recordTitle: { fontSize: 13, fontWeight: "600", color: "#222" },
  recordSub: { fontSize: 11, color: "#888", marginTop: 2 },
  recordBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  contribAmount: { fontSize: 14, fontWeight: "700", color: "#27ae60" },

  /* Contributions total */
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#e8f8f0", padding: 14, borderRadius: 10, marginBottom: 8
  },
  totalLabel: { fontSize: 13, color: "#555", fontWeight: "600" },
  totalAmount: { fontSize: 18, fontWeight: "800", color: "#27ae60" },

  /* Status card */
  statusCard: {
    backgroundColor: "#fff", padding: 16, borderRadius: 10,
    alignItems: "center", marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
  },
  statusCardLabel: { fontSize: 11, color: "#aaa", textTransform: "uppercase", fontWeight: "600" },
  statusCardValue: { fontSize: 22, fontWeight: "800", color: "#4B3F72", marginTop: 4 },

  /* Action blocks */
  actionBlock: {
    backgroundColor: "#fff", borderRadius: 10, marginVertical: 5,
    borderLeftWidth: 4, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
  },
  actionBlockHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  actionIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  actionBlockTitle: { fontSize: 14, fontWeight: "700" },
  actionBlockDesc: { fontSize: 11, color: "#999", marginTop: 1 },
  actionBlockBody: { paddingHorizontal: 14, paddingBottom: 14 },

  approvalChainLabel: { fontSize: 11, color: "#aaa", fontWeight: "600", marginBottom: 6, textTransform: "uppercase" },
  approvalChain: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  approvalPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20
  },
  approvalPillText: { fontSize: 11, fontWeight: "600" },

  approveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 10, borderRadius: 8, marginTop: 4
  },
  actionExecBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 10, borderRadius: 8
  },
  disabledLabel: { fontSize: 12, color: "#bbb", fontStyle: "italic", marginTop: 4 },

  deceasedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#555", padding: 13, borderRadius: 10, marginTop: 8
  },

  /* Empty state */
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#bbb", fontSize: 13, marginTop: 10, textAlign: "center" },

  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center" },
  modalBox: { backgroundColor: "#fff", margin: 24, padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#222", textAlign: "center", marginBottom: 6 },
  modalSubText: { fontSize: 13, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 12 },
  modalInput: {
    borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 8, padding: 12,
    fontSize: 14, marginBottom: 14, backgroundColor: "#fafafa"
  },
  modalBtnRow: { flexDirection: "row", gap: 8 },
  modalSaveBtn: { flex: 1, backgroundColor: "#4B3F72", padding: 12, borderRadius: 8, alignItems: "center" },
  modalCancelBtn: { flex: 1, backgroundColor: "#aaa", padding: 12, borderRadius: 8, alignItems: "center" },
  white: { color: "#fff", fontWeight: "600" },
});