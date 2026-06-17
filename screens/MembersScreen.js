import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, Alert, ScrollView, Platform
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppHeader from "../components/AppHeader";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  updateDoc, deleteDoc, doc, query, where
} from "firebase/firestore";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../components/AppButton";

const MEMBERS_CACHE_KEY = "members_cache_v1";



// ── Role levels ─────────────────────────────────────────────────
const ROLE_LEVEL = { admin: 5, pastor: 4, elder: 3, deacon: 2, member: 1 };

// ── Human-readable ID generator ─────────────────────────────────
// Format:  CC-YYYY-NNNN   e.g. CC-2024-0042
const generateMemberCode = (existingCount) => {
  const year = new Date().getFullYear();
  const seq  = String(existingCount + 1).padStart(4, "0");
  return `CC-${year}-${seq}`;
};

// ── Action types that need approval ─────────────────────────────
const ACTIONS = {
  suspend:   { label: "Suspend",   color: "#f39c12", required: ["pastor","elder"] },
  reprimand: { label: "Reprimand", color: "#e67e22", required: ["elder"] },
  demote:    { label: "Demote",    color: "#8e44ad", required: ["pastor","admin"] },
  delete:    { label: "Delete",    color: "#e74c3c", required: ["pastor","admin","elder"] },
};

export default function MembersScreen({ navigation, route }) {

  /* ── ACTIVE ENTITY (NEW SYSTEM) ── */
  const [activeEntity, setActiveEntity] = useState(null);

  const entity = activeEntity || {};
  const { organizationId, entityId } = entity;

  /* ── LOAD ACTIVE ENTITY ── */
  useEffect(() => {
    const loadEntity = async () => {
      try {
        const data = await AsyncStorage.getItem("activeEntity");

        if (data) {
          const parsed = JSON.parse(data);
          console.log("✅ Members entity:", parsed);
          setActiveEntity(parsed);
        }
      } catch (e) {
        console.log("Entity load error", e);
      }
    };

    loadEntity();
  }, []);


  /* ── ADD MEMBER NAVIGATION ── */
  const handleAddMember = () => {
    if (!organizationId || !entityId) {
      Alert.alert("No active church", "Please select a church first");
      return;
    }

    navigation.navigate("AddMember", {
      entityId,
      organizationId
    });
  };


  /* ── viewer role ── */
  const viewerRole = "admin"; 


  /* ── member form defaults ── */
  const defaultMember = {
    name: "",
    phone: "",
    address: "",
    occupation: "",
    ministry: "",
    baptismStatus: "",
    status: "Regular",
    emergencyContact: "",
    membershipDuration: "",

    communicant: null,
    communicantStatus: "active",
    communicantInvalidSince: null,

    memberCode: "",

    entityId: "",          // ✅ CHANGED
    organizationId: "",    // ✅ NEW
  };


  const [member, setMember] = useState(defaultMember);
  const [members, setMembers] = useState([]);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showActions, setShowActions] = useState(true);

  const [search, setSearch] = useState("");



  /* ══════════════ LOAD ══════════════ */

// ✅ Load members when entity changes
useEffect(() => {
  if (entityId) {
    loadMembers();
  }

  AsyncStorage.getItem("showActions").then(v => {
    if (v !== null) setShowActions(JSON.parse(v));
  });

}, [entityId]);


// ❌ REMOVE this entire old block
/*
useEffect(() => {
  if (churchId) {
    loadMembers();
  }
}, [churchId]);

useEffect(() => {
  AsyncStorage.getItem("churchId").then(id => {
    console.log("churchId loaded:", id);
    setChurchId(id);
  });
}, []);
*/


// ✅ LOAD MEMBERS (ACTIVE ENTITY)
const loadMembers = async () => {
  if (!entityId) return;

  setLoading(true);
  setError(null);

  try {
    const q = query(
      collection(db, "members"),
      where("entityId", "==", entityId)
    );

    const snap = await getDocs(q);

    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    setMembers(data);

    await AsyncStorage.setItem(
      MEMBERS_CACHE_KEY,
      JSON.stringify(data)
    );

  } catch (err) {

    const cached = await AsyncStorage.getItem(MEMBERS_CACHE_KEY);

    if (cached) {
      setMembers(JSON.parse(cached));
      setError("Showing offline data.");
    } else {
      setError("Unable to load members. Check your connection.");
    }

  } finally {
    setLoading(false);
  }
};


// ✅ TOGGLE ACTION VISIBILITY
const toggleActions = () => {
  setShowActions(prev => {
    const next = !prev;
    AsyncStorage.setItem("showActions", JSON.stringify(next));
    return next;
  });
};


/* ══════════════ SAVE MEMBER ══════════════ */
const saveMember = async () => {
  if (!member.name.trim() || !member.phone.trim()) {
    Alert.alert("Required", "Name and phone are required.");
    return;
  }

  if (member.communicant === null) {
    Alert.alert("Required", "Communicant field is required.");
    return;
  }

  if (!organizationId || !entityId) {
    Alert.alert("No active church", "Please select a church first");
    return;
  }

  try {
    const payload = {
      ...member,
      entityId,           // ✅ NEW
      organizationId      // ✅ NEW
    };

    if (editingId) {
      await updateDoc(
        doc(db, "members", editingId),
        payload
      );
      Alert.alert("✅ Updated");

    } else {
      const code = generateMemberCode(members.length);

      await addDoc(
        collection(db, "members"),
        {
          ...payload,
          memberCode: code
        }
      );

      Alert.alert("✅ Saved", `Member ID: ${code}`);
    }

    resetForm();
    loadMembers();

  } catch (e) {
    Alert.alert("Error", e.message);
  }
};


/* ══════════════ RESET FORM ══════════════ */
const resetForm = () => {
  setMember(defaultMember);
  setEditingId(null);
  setShowForm(false);

  setCommStatusModal(false);
  setCommInvalidModal(false);
};


/* ══════════════ EDIT MEMBER ══════════════ */
const editMember = (item) => {
  setMember(item);
  setEditingId(item.id);
  setShowForm(true);
};

  /* ══════════════ COMMUNICANT LOGIC ══════════════ */

const handleCommunicantSelect = (val) => {
  setMember(prev => ({ ...prev, communicant: val }));
  if (val === "yes") setCommStatusModal(true);
};

const handleCommStatus = (status) => {
  setMember(prev => ({ ...prev, communicantStatus: status }));
  setCommStatusModal(false);

  if (status === "invalid") {
    setCommInvalidModal(true);
  }
};

const handleCommInvalidDate = (e, d) => {
  if (Platform.OS === "android") setShowCommDatePicker(false);

  if (d) {
    setCommInvalidDate(d);
    setMember(prev => ({
      ...prev,
      communicantInvalidSince: d.toISOString().split("T")[0]
    }));
  }
};

const confirmCommInvalid = () => {
  setMember(prev => ({
    ...prev,
    communicantInvalidSince: commInvalidDate.toISOString().split("T")[0]
  }));

  setCommInvalidModal(false);
};


/* ══════════════ APPROVAL SYSTEM ══════════════ */

const approvalKey = (memberId, action) => `${memberId}_${action}`;

const getApprovals = (memberId, action) =>
  approvals[approvalKey(memberId, action)] || [];

const isFullyApproved = (memberId, action) => {
  const required = ACTIONS[action]?.required || [];
  const granted = getApprovals(memberId, action);

  return required.every(r => granted.includes(r));
};

const canApproveAction = (action) => {
  const required = ACTIONS[action]?.required || [];
  return required.includes(viewerRole) || viewerRole === "admin";
};


const grantApproval = () => {
  if (!approvalAction || !approvalTarget) return;

  const key = approvalKey(approvalTarget.id, approvalAction);
  const current = approvals[key] || [];

  if (current.includes(viewerRole)) {
    Alert.alert("Already approved", "You have already approved this action.");
    return;
  }

  const updated = {
    ...approvals,
    [key]: [...current, viewerRole]
  };

  setApprovals(updated);

  const required = ACTIONS[approvalAction]?.required || [];
  const granted = updated[key];

  const allDone = required.every(r => granted.includes(r));

  if (allDone) {
    setApprovalModal(false);
    executeAction(approvalTarget, approvalAction, approvalNote);

  } else {
    const remaining = required.filter(r => !granted.includes(r));

    Alert.alert(
      "Approval recorded",
      `Still waiting for: ${remaining.join(", ")}`
    );

    setApprovalModal(false);
  }

  setApprovalNote("");
};


const openApproval = (member, action) => {
  if (!canApproveAction(action)) {
    Alert.alert(
      "Access denied",
      `You need ${ACTIONS[action].required.join(" or ")} role`
    );
    return;
  }

  setApprovalTarget(member);
  setApprovalAction(action);
  setApprovalNote("");
  setApprovalModal(true);
};


/* ✅ UPDATED ACTION EXECUTION (ACTIVE ENTITY SAFE) */
const executeAction = async (member, action, note) => {
  try {
    if (action === "delete") {
      await deleteDoc(doc(db, "members", member.id));

      Alert.alert("Deleted", `${member.name} has been removed`);

    } else {
      await updateDoc(
        doc(db, "members", member.id),
        {
          disciplinaryStatus: action,
          disciplinaryNote: note,
          disciplinaryDate: new Date().toISOString().split("T")[0],

          entityId,        // ✅ ensure consistency
          organizationId   // ✅ ensure consistency
        }
      );

      Alert.alert("Done", `${member.name} has been ${action}ed`);
    }

    // ✅ Clear approvals
    const key = approvalKey(member.id, action);

    setApprovals(prev => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    loadMembers();

  } catch (e) {
    Alert.alert("Error", e.message);
  }
};
  /* ══════════════ REINSTATE ══════════════ */

const openReinstate = (member) => {
  setReinstateTarget(member);
  setReinstateNote("");
  setReinstateModal(true);
};

const executeReinstate = async () => {
  if (!reinstateTarget) return;

  if (!organizationId || !entityId) {
    Alert.alert("No active church", "Please select a church first");
    return;
  }

  try {
    await updateDoc(
      doc(db, "members", reinstateTarget.id),
      {
        disciplinaryStatus: null,
        disciplinaryNote: null,
        disciplinaryDate: null,

        reinstateNote,
        reinstateDate: new Date().toISOString().split("T")[0],

        entityId,        // ✅ ensure consistency
        organizationId   // ✅ ensure consistency
      }
    );

    Alert.alert("Reinstated", `${reinstateTarget.name} has been reinstated.`);

    setReinstateModal(false);
    loadMembers();

  } catch (e) {
    Alert.alert("Error", e.message);
  }
};


/* ══════════════ DONATE NAVIGATION ══════════════ */

const goToDonate = (memberId, memberName) => {
  navigation
    .getParent()
    ?.navigate(
      "Donate",
      memberId ? { memberId, memberName } : undefined
    );
};


/* ══════════════ FILTER ══════════════ */

const filtered = members.filter(m => {
  const q = search.toLowerCase();

  const matchSearch =
    (m.name || "").toLowerCase().includes(q) ||
    (m.memberCode || "").toLowerCase().includes(q);

  const matchMin =
    filterMinistry === "All" ||
    m.ministry === filterMinistry;

  const matchStat =
    filterStatus === "All" ||
    m.status === filterStatus;

  const matchComm =
    filterCommun === "All" ||
    (filterCommun === "yes" && m.communicant === "yes") ||
    (filterCommun === "no" && m.communicant === "no");

  return matchSearch && matchMin && matchStat && matchComm;
});

  /* ══════════════ RENDER ══════════════ */
  return (
    <View style={styles.container}>
<AppHeader
  title="Members"
  subtitle="Manage church members"
  onBack={() => navigation.goBack()}

  actions={[
    {
      icon: "heart",
      label: "Donate",
      type: "primary",
      onPress: goToDonate,
    },
    {
      icon: showActions ? "eye-off-outline" : "eye-outline",
      onPress: toggleActions,
    },
    {
      icon: "filter-outline",
      onPress: () => setShowFilters(p => !p),
    }
  ]}
/>
   



          

      {/* ── SEARCH ── */}
      <TextInput placeholder="🔍  Search name or member ID..." value={search}
        onChangeText={setSearch} style={styles.search} />

      {/* ── FILTERS ── */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Ministry</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["All", ...ministries].map(m => (
              <TouchableOpacity key={m}
                style={[styles.filterChip, filterMinistry === m && styles.filterChipActive]}
                onPress={() => setFilterMinistry(m)}>
                <Text style={[styles.filterChipText, filterMinistry === m && { color: "#fff" }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["All", ...statusList].map(s => (
              <TouchableOpacity key={s}
                style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
                onPress={() => setFilterStatus(s)}>
                <Text style={[styles.filterChipText, filterStatus === s && { color: "#fff" }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Communicant</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["All", "yes", "no"].map(c => (
              <TouchableOpacity key={c}
                style={[styles.filterChip, filterCommun === c && styles.filterChipActive]}
                onPress={() => setFilterCommun(c)}>
                <Text style={[styles.filterChipText, filterCommun === c && { color: "#fff" }]}>
                  {c === "All" ? "All" : c === "yes" ? "Communicant" : "Non-communicant"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── ERROR ── */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={36} color="#bbb" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadMembers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MEMBER LIST ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const isDisciplined = !!item.disciplinaryStatus;
          const pendingApprovals = Object.keys(ACTIONS).filter(a =>
            getApprovals(item.id, a).length > 0 && !isFullyApproved(item.id, a)
          );

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate("MemberProfile", { memberId: item.id, role: viewerRole })}
            >
              <View style={[styles.card, isDisciplined && styles.cardDisciplined]}>

                {/* Name row */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {/* ✅ #1 — Human-readable ID */}
                    {item.memberCode && (
                      <Text style={styles.memberCode}>ID: {item.memberCode}</Text>
                    )}
                    {item.ministry && <Text style={styles.memberMeta}>{item.ministry}</Text>}
                    {/* Communicant badge */}
                    {item.communicant === "yes" && (
                      <View style={[styles.commBadge, { backgroundColor: item.communicantStatus === "invalid" ? "#fce8e8" : "#e8f8f0" }]}>
                        <Text style={[styles.commBadgeText, { color: item.communicantStatus === "invalid" ? "#e74c3c" : "#27ae60" }]}>
                          🍞 Communicant — {item.communicantStatus === "invalid" ? `Invalid since ${item.communicantInvalidSince}` : "Active"}
                        </Text>
                      </View>
                    )}
                    {/* Disciplinary badge */}
                    {isDisciplined && (
                      <View style={styles.disciplineBadge}>
                        <Text style={styles.disciplineBadgeText}>
                          ⚠️ {item.disciplinaryStatus?.toUpperCase()}
                          {item.disciplinaryDate ? ` · ${item.disciplinaryDate}` : ""}
                        </Text>
                      </View>
                    )}
                    {/* Pending approval badges */}
                    {pendingApprovals.map(a => (
                      <View key={a} style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>⏳ {ACTIONS[a].label} pending approval</Text>
                      </View>
                    ))}
                  </View>

                  {/* Per-member donate icon */}
                  <TouchableOpacity style={styles.memberDonateBtn}
                    onPress={() => goToDonate(item.id, item.name)}>
                    <Ionicons name="heart-outline" size={20} color="#E11D48" />
                  </TouchableOpacity>
                </View>

                {showActions && (
                  <>
                    {/* ✅ #2 — QR code + human ID display */}
                    <TouchableOpacity onPress={() => setSelectedMember(item)} style={styles.qrRow}>
                      <QRCode value={item.id} size={70} />
                      <View style={styles.qrInfo}>
                        <Text style={styles.qrLabel}>Member QR</Text>
                        <Text style={styles.qrCode}>{item.memberCode || item.id}</Text>
                        <Text style={styles.qrSub}>Tap to enlarge</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Edit row */}
                    <View style={styles.row}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => editMember(item)}>
                        <Ionicons name="create-outline" size={13} color="#fff" />
                        <Text style={styles.white}> Edit</Text>
                      </TouchableOpacity>
                      {/* ✅ #5 — Delete requires approval */}
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => openApproval(item, "delete")}>
                        <Ionicons name="trash-outline" size={13} color="#fff" />
                        <Text style={styles.white}> Delete</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.row}>
                      {["suspend", "reprimand", "demote"].map(action => (
                        <TouchableOpacity key={action}
                          style={[styles.actionBtn, { backgroundColor: ACTIONS[action].color }]}
                          onPress={() => openApproval(item, action)}>
                          <Text style={styles.white}>{ACTIONS[action].label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* ✅ #6 — Reinstate button */}
                    {isDisciplined && (
                      <TouchableOpacity style={styles.reinstateBtn} onPress={() => openReinstate(item)}>
                        <Ionicons name="refresh-circle-outline" size={14} color="#fff" />
                        <Text style={styles.white}> Reinstate</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <AppButton
  title="Add Member"
  onPress={handleAddMember}
/>

      {/* ══ QR MODAL ══ */}
      <Modal visible={!!selectedMember} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={[styles.modalBox, { alignItems: "center" }]}>
            <Text style={styles.modalTitle}>{selectedMember?.name}</Text>
            {/* Human-readable ID */}
            <View style={styles.memberIdBadge}>
              <Text style={styles.memberIdText}>{selectedMember?.memberCode || selectedMember?.id}</Text>
            </View>
            <View style={{ marginVertical: 16 }}>
              <QRCode value={selectedMember?.id || "placeholder"} size={220} />
            </View>
            <Text style={styles.qrScanHint}>Members scan this at the entrance to mark attendance</Text>
            <TouchableOpacity style={[styles.btn, { marginTop: 12, width: "100%" }]} onPress={() => setSelectedMember(null)}>
              <Text style={styles.white}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* ══ APPROVAL MODAL ══ */}
      <Modal visible={approvalModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="shield-checkmark-outline" size={36}
                color={ACTIONS[approvalAction]?.color || "#4B3F72"} />
            </View>
            <Text style={styles.modalTitle}>{ACTIONS[approvalAction]?.label} — Approval Required</Text>
            <Text style={styles.approvalTarget}>{approvalTarget?.name}</Text>
            <Text style={styles.approvalInfo}>
              This action requires approval from:{" "}
              <Text style={{ fontWeight: "700" }}>
                {ACTIONS[approvalAction]?.required?.join(", ")}
              </Text>
            </Text>

            {/* Show who has approved so far */}
            <View style={styles.approvalChain}>
              {(ACTIONS[approvalAction]?.required || []).map(role => {
                const granted = getApprovals(approvalTarget?.id, approvalAction).includes(role);
                return (
                  <View key={role} style={[styles.approvalPill, { backgroundColor: granted ? "#e8f8f0" : "#f5f5f5" }]}>
                    <Ionicons name={granted ? "checkmark-circle" : "ellipse-outline"} size={13}
                      color={granted ? "#27ae60" : "#bbb"} />
                    <Text style={[styles.approvalPillText, { color: granted ? "#27ae60" : "#999" }]}>{role}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Reason / Notes</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              placeholder="Describe the reason for this action..."
              value={approvalNote} onChangeText={setApprovalNote} multiline />

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: ACTIONS[approvalAction]?.color, marginTop: 12 }]}
              onPress={grantApproval}>
              <Text style={styles.white}>Grant My Approval ({viewerRole})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#888", marginTop: 8 }]}
              onPress={() => setApprovalModal(false)}>
              <Text style={styles.white}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ REINSTATE MODAL ══ */}
      <Modal visible={reinstateModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="refresh-circle" size={36} color="#27ae60" />
            </View>
            <Text style={styles.modalTitle}>Reinstate Member</Text>
            <Text style={styles.approvalTarget}>{reinstateTarget?.name}</Text>
            <Text style={{ textAlign: "center", color: "#666", fontSize: 12, marginBottom: 12 }}>
              Current status: <Text style={{ fontWeight: "700", color: "#e74c3c" }}>
                {reinstateTarget?.disciplinaryStatus?.toUpperCase()}
              </Text>
            </Text>
            <Text style={styles.fieldLabel}>Reinstatement Notes</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              placeholder="Reason for reinstatement..."
              value={reinstateNote} onChangeText={setReinstateNote} multiline />
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#27ae60", marginTop: 12 }]}
              onPress={executeReinstate}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={[styles.white, { marginLeft: 6 }]}>Confirm Reinstatement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#888", marginTop: 8 }]}
              onPress={() => setReinstateModal(false)}>
              <Text style={styles.white}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ LIST ITEM EDIT MODAL ══ */}
      <Modal visible={modal.visible} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modal.index != null ? "Edit" : "Add"} {modal.type}</Text>
            <TextInput value={modal.input}
              onChangeText={t => setModal({ ...modal, input: t })}
              style={styles.input} placeholder="Enter value..." autoFocus />
            <TouchableOpacity style={[styles.btn, { marginTop: 10 }]}
              onPress={() => saveList(
                modal.type === "ministry" ? ministries :
                  modal.type === "baptism" ? baptismList : statusList,
                modal.type === "ministry" ? setMinistries :
                  modal.type === "baptism" ? setBaptismList : setStatusList
              )}>
              <Text style={styles.white}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 10, alignItems: "center" }} onPress={closeModal}>
              <Text style={{ color: "#e74c3c" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );

  function openModal(type, index = null, list = []) {
    setModal({ visible: true, type, input: index != null ? list[index] : "", index });
  }
  function closeModal() {
    setModal({ visible: false, type: null, input: "", index: null });
  }
  function saveList(list, setList) {
    if (!modal.input.trim()) return;
    if (modal.index != null) {
      const u = [...list]; u[modal.index] = modal.input; setList(u);
    } else { setList(prev => [...prev, modal.input]); }
    closeModal();
  }
}

/* ── Sub-components ── */
const Input = ({ label, value, onChange, keyboardType }) => (
  <>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChange}
      keyboardType={keyboardType || "default"} />
  </>
);

const ChipRow = ({ label, list, value, onSelect, onAdd, onEdit }) => (
  <>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {list.map((m, i) => (
        <TouchableOpacity key={i} onPress={() => onSelect(m)} onLongPress={() => onEdit(i)}
          style={[styles.chip, value === m && styles.activeChip]}>
          <Text style={[{ fontSize: 12 }, value === m && { color: "#fff", fontWeight: "600" }]}>{m}</Text>
        </TouchableOpacity>
      ))}
    </View>
    <TouchableOpacity onPress={onAdd} style={{ marginTop: 4 }}>
      <Text style={{ color: "#4B3F72", fontSize: 12 }}>+ Add option</Text>
    </TouchableOpacity>
  </>
);

/* ── Styles ── */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f4f6fb", paddingTop: 50 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  header: { fontSize: 20, fontWeight: "700", color: "#222" },

  donateHeaderBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E11D48", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 5 },
  donateHeaderBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  toggleBtn: { backgroundColor: "#4B3F72", padding: 8, borderRadius: 8 },

  search: { backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 8, fontSize: 13 },

  filterPanel: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 },
  filterLabel: { fontSize: 11, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginBottom: 6, marginTop: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f0f0f0", borderRadius: 20, marginRight: 6 },
  filterChipActive: { backgroundColor: "#4B3F72" },
  filterChipText: { fontSize: 12, color: "#555" },

  card: { backgroundColor: "#fff", padding: 14, marginBottom: 10, borderRadius: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardDisciplined: { borderLeftWidth: 4, borderLeftColor: "#e74c3c" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  name: { fontWeight: "700", fontSize: 15, color: "#222" },
  memberCode: { fontSize: 11, color: "#4B3F72", fontWeight: "600", marginTop: 1 },
  memberMeta: { fontSize: 11, color: "#888", marginTop: 1 },
  memberDonateBtn: { padding: 6 },

  commBadge: { marginTop: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  commBadgeText: { fontSize: 10, fontWeight: "600" },
  disciplineBadge: { marginTop: 4, backgroundColor: "#fff3e0", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  disciplineBadgeText: { fontSize: 10, fontWeight: "700", color: "#e67e22" },
  pendingBadge: { marginTop: 3, backgroundColor: "#f0edf9", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  pendingBadgeText: { fontSize: 10, color: "#6c47b8" },

  qrRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 },
  qrInfo: { flex: 1 },
  qrLabel: { fontSize: 11, fontWeight: "700", color: "#4B3F72" },
  qrCode: { fontSize: 13, fontWeight: "800", color: "#222", marginTop: 2 },
  qrSub: { fontSize: 10, color: "#aaa", marginTop: 1 },

  row: { flexDirection: "row", gap: 6, marginTop: 8 },
  editBtn: { flex: 1, flexDirection: "row", backgroundColor: "#3498db", padding: 8, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  deleteBtn: { flex: 1, flexDirection: "row", backgroundColor: "#e74c3c", padding: 8, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  actionBtn: { flex: 1, padding: 8, alignItems: "center", borderRadius: 6 },
  reinstateBtn: { flexDirection: "row", backgroundColor: "#27ae60", padding: 8, alignItems: "center", justifyContent: "center", borderRadius: 6, marginTop: 6 },

  fab: { position: "absolute", bottom: 90, right: 20, backgroundColor: "#4B3F72", flexDirection: "row", padding: 13, borderRadius: 30, zIndex: 999, elevation: 10, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: "#fff", fontWeight: "600" },

  errorBox: { alignItems: "center", marginTop: 30 },
  errorText: { marginTop: 8, color: "#888", textAlign: "center", paddingHorizontal: 30 },
  retryBtn: { marginTop: 12, backgroundColor: "#4B3F72", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },

  modalWrap: { flex: 1, justifyContent: "center", backgroundColor: "#0007" },
  modalBox: { backgroundColor: "#fff", padding: 20, margin: 20, borderRadius: 14 },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 8, textAlign: "center", color: "#222" },

  memberIdBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  memberIdText: { fontSize: 16, fontWeight: "800", color: "#4F46E5", letterSpacing: 1 },
  qrScanHint: { fontSize: 11, color: "#888", textAlign: "center", marginTop: 8 },

  modalContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },

  fieldLabel: { marginTop: 12, marginBottom: 4, fontWeight: "600", fontSize: 13, color: "#444" },
  required: { fontWeight: "400", color: "#888", fontSize: 11 },
  input: { backgroundColor: "#f0f0f0", padding: 11, borderRadius: 10, fontSize: 13 },
  btn: { flexDirection: "row", backgroundColor: "#4B3F72", padding: 12, marginTop: 6, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  white: { color: "#fff", fontWeight: "600" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  chip: { backgroundColor: "#eee", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, margin: 3 },
  activeChip: { backgroundColor: "#4B3F72" },

  communicantBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#f0f0f0", padding: 12, borderRadius: 10, marginRight: 6 },
  communicantBtnActive: { backgroundColor: "#4B3F72" },
  communicantBtnText: { fontSize: 14, fontWeight: "600", color: "#555" },
  communicantStatus: { backgroundColor: "#f9f9f9", borderRadius: 10, padding: 10, marginTop: 8 },
  commStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start", marginTop: 4 },
  changeCommBtn: { marginTop: 6 },

  datePickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0f0f0", padding: 12, borderRadius: 10 },
  datePickerBtnText: { fontSize: 14, fontWeight: "600", color: "#333" },

  approvalTarget: { textAlign: "center", fontWeight: "700", fontSize: 15, color: "#333", marginBottom: 6 },
  approvalInfo: { textAlign: "center", fontSize: 12, color: "#666", marginBottom: 12 },
  approvalChain: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  approvalPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  approvalPillText: { fontSize: 11, fontWeight: "600" },
});