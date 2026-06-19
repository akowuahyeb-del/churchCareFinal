
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, Alert, ScrollView, Platform,
  ActivityIndicator, Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, updateDoc,
  deleteDoc, doc, query, where
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";

// ── Constants ─────────────────────────────────────────────────────
const MEMBERS_CACHE_KEY = "members_cache_v1";
const ROLE_LEVEL = { admin: 5, pastor: 4, elder: 3, deacon: 2, member: 1 };

const ACTIONS = {
  suspend:   { label: "Suspend",   color: "#f39c12", required: ["pastor", "elder"] },
  reprimand: { label: "Reprimand", color: "#e67e22", required: ["elder"] },
  demote:    { label: "Demote",    color: "#8e44ad", required: ["pastor", "admin"] },
  delete:    { label: "Delete",    color: "#e74c3c", required: ["pastor", "admin", "elder"] },
};

const generateMemberCode = (count) => {
  const year = new Date().getFullYear();
  const seq  = String(count + 1).padStart(4, "0");
  return `CC-${year}-${seq}`;
};

const DEFAULT_MEMBER = {
  name: "", phone: "", address: "", occupation: "",
  ministry: "", baptismStatus: "", status: "Regular",
  emergencyContact: "", membershipDuration: "",
  communicant: null, communicantStatus: "active",
  communicantInvalidSince: null, memberCode: "",
  entityId: "", organizationId: "",
};

// ── Sub-components ────────────────────────────────────────────────
function FieldInput({ label, value, onChange, keyboardType, placeholder }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType || "default"}
        placeholder={placeholder || ""}
        placeholderTextColor="#bbb"
      />
    </>
  );
}

function ChipRow({ label, list = [], value, onSelect, onAdd, onEdit }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {list.map((item, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onSelect(item)}
            onLongPress={() => onEdit && onEdit(i)}
            style={[styles.chip, value === item && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {onAdd && (
        <TouchableOpacity onPress={onAdd} style={{ marginTop: 4 }}>
          <Text style={{ color: "#4B3F72", fontSize: 12, fontWeight: "600" }}>+ Add option</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function MembersScreen({ navigation }) {

  const viewerRole = "admin"; // replace with auth context

  // ── Entity / church ──
  const [activeEntity,  setActiveEntity]  = useState(null);
  const entityId       = activeEntity?.entityId       || "";
  const organizationId = activeEntity?.organizationId || "";

  // ── Members data ──
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // ── UI toggles ──
  const [showActions,  setShowActions]  = useState(true);
  const [showFilters,  setShowFilters]  = useState(false);
  const [showForm,     setShowForm]     = useState(false);

  // ── Form state ──
  const [member,     setMember]     = useState(DEFAULT_MEMBER);
  const [editingId,  setEditingId]  = useState(null);

  // ── Communicant pickers ──
  const [commStatusModal,   setCommStatusModal]   = useState(false);
  const [commInvalidModal,  setCommInvalidModal]  = useState(false);
  const [commInvalidDate,   setCommInvalidDate]   = useState(new Date());
  const [showCommDatePicker,setShowCommDatePicker]= useState(false);

  // ── Search & filters ──
  const [search,         setSearch]         = useState("");
  const [filterMinistry, setFilterMinistry] = useState("All");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [filterCommun,   setFilterCommun]   = useState("All");

  // ── Dropdown lists ──
  const [ministries,  setMinistries]  = useState(["Choir", "Youth", "Ushers", "Media"]);
  const [statusList,  setStatusList]  = useState(["Regular", "Visiting", "Inactive"]);
  const [baptismList, setBaptismList] = useState(["Baptized", "Not Baptized"]);

  // ── Approvals ──
  const [approvals,      setApprovals]      = useState({});
  const [approvalModal,  setApprovalModal]  = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalAction, setApprovalAction] = useState(null);
  const [approvalNote,   setApprovalNote]   = useState("");

  // ── Reinstate ──
  const [reinstateModal,  setReinstateModal]  = useState(false);
  const [reinstateTarget, setReinstateTarget] = useState(null);
  const [reinstateNote,   setReinstateNote]   = useState("");

  // ── QR modal ──
  const [selectedMember, setSelectedMember] = useState(null);

  // ── List item edit modal ──
  const [listModal, setListModal] = useState({ visible: false, type: null, input: "", index: null });

  /* ── Load entity ── */
  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) {
        try { setActiveEntity(JSON.parse(data)); } catch (_) {}
      }
    });
    AsyncStorage.getItem("showActions").then(v => {
      if (v !== null) setShowActions(JSON.parse(v));
    });
  }, []);

  /* ── Load members when entity ready ── */
  useEffect(() => {
    if (entityId) loadMembers();
  }, [entityId]);

  const loadMembers = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    try {
      const q    = query(collection(db, "members"), where("entityId", "==", entityId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMembers(data);
      await AsyncStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(data));
    } catch (_) {
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
  }, [entityId]);

  const toggleActions = () => {
    setShowActions(prev => {
      const next = !prev;
      AsyncStorage.setItem("showActions", JSON.stringify(next));
      return next;
    });
  };

  /* ── Form helpers ── */
  const setField = (key, val) => setMember(prev => ({ ...prev, [key]: val }));

  const resetForm = () => {
    setMember(DEFAULT_MEMBER);
    setEditingId(null);
    setShowForm(false);
    setCommStatusModal(false);
    setCommInvalidModal(false);
  };
const editMember = (item) => {
  navigation.navigate("AddMember", {
    memberData: item,
    editingId: item.id,
  });
};

  /* ── Save member ── */
  const saveMember = async () => {
    if (!member.name.trim() || !member.phone.trim()) {
      Alert.alert("Required", "Name and phone are required."); return;
    }
    if (member.communicant === null) {
      Alert.alert("Required", "Communicant field is required."); return;
    }
    if (!entityId) {
      Alert.alert("No active church", "Please select a church first."); return;
    }
    try {
      const payload = { ...member, entityId, organizationId };
      if (editingId) {
        await updateDoc(doc(db, "members", editingId), payload);
        Alert.alert("✅ Updated");
      } else {
        const code = generateMemberCode(members.length);
        await addDoc(collection(db, "members"), { ...payload, memberCode: code });
        Alert.alert("✅ Saved", `Member ID: ${code}`);
      }
      resetForm();
      loadMembers();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  /* ── Communicant logic ── */
  const handleCommunicantSelect = (val) => {
    setField("communicant", val);
    if (val === "yes") setCommStatusModal(true);
    if (val === "no")  setField("communicantStatus", "");
  };

  const handleCommStatus = (status) => {
    setField("communicantStatus", status);
    setCommStatusModal(false);
    if (status === "invalid") setCommInvalidModal(true);
  };

  const handleCommInvalidDate = (e, d) => {
    if (Platform.OS === "android") setShowCommDatePicker(false);
    if (d) {
      setCommInvalidDate(d);
      setField("communicantInvalidSince", d.toISOString().split("T")[0]);
    }
  };

  /* ── Approval system ── */
  const approvalKey   = (mId, action) => `${mId}_${action}`;
  const getApprovals  = (mId, action) => approvals[approvalKey(mId, action)] || [];
  const isFullyApproved = (mId, action) => {
    const required = ACTIONS[action]?.required || [];
    const granted  = getApprovals(mId, action);
    return required.every(r => granted.includes(r));
  };
  const canApproveAction = (action) => {
    const required = ACTIONS[action]?.required || [];
    return required.includes(viewerRole) || viewerRole === "admin";
  };

  const openApproval = (m, action) => {
    if (!canApproveAction(action)) {
      Alert.alert("Access denied", `Requires: ${ACTIONS[action].required.join(" or ")}`);
      return;
    }
    setApprovalTarget(m);
    setApprovalAction(action);
    setApprovalNote("");
    setApprovalModal(true);
  };

  const grantApproval = () => {
    if (!approvalAction || !approvalTarget) return;
    const key     = approvalKey(approvalTarget.id, approvalAction);
    const current = approvals[key] || [];
    if (current.includes(viewerRole)) {
      Alert.alert("Already approved", "You have already approved this action."); return;
    }
    const updated = { ...approvals, [key]: [...current, viewerRole] };
    setApprovals(updated);
    const required = ACTIONS[approvalAction]?.required || [];
    const allDone  = required.every(r => updated[key].includes(r));
    if (allDone) {
      setApprovalModal(false);
      executeAction(approvalTarget, approvalAction, approvalNote);
    } else {
      const remaining = required.filter(r => !updated[key].includes(r));
      Alert.alert("Approval recorded", `Still waiting for: ${remaining.join(", ")}`);
      setApprovalModal(false);
    }
    setApprovalNote("");
  };

  const executeAction = async (m, action, note) => {
    try {
      if (action === "delete") {
        await deleteDoc(doc(db, "members", m.id));
        Alert.alert("Deleted", `${m.name} has been removed`);
      } else {
        await updateDoc(doc(db, "members", m.id), {
          disciplinaryStatus: action, disciplinaryNote: note,
          disciplinaryDate: new Date().toISOString().split("T")[0],
          entityId, organizationId,
        });
        Alert.alert("Done", `${m.name} has been ${action}ed`);
      }
      const key = approvalKey(m.id, action);
      setApprovals(prev => { const n = { ...prev }; delete n[key]; return n; });
      loadMembers();
    } catch (e) { Alert.alert("Error", e.message); }
  };

  /* ── Reinstate ── */
  const openReinstate = (m) => { setReinstateTarget(m); setReinstateNote(""); setReinstateModal(true); };

  const executeReinstate = async () => {
    if (!reinstateTarget) return;
    if (!entityId) { Alert.alert("No active church", "Please select a church first."); return; }
    try {
      await updateDoc(doc(db, "members", reinstateTarget.id), {
        disciplinaryStatus: null, disciplinaryNote: null, disciplinaryDate: null,
        reinstateNote, reinstateDate: new Date().toISOString().split("T")[0],
        entityId, organizationId,
      });
      Alert.alert("Reinstated", `${reinstateTarget.name} has been reinstated.`);
      setReinstateModal(false);
      loadMembers();
    } catch (e) { Alert.alert("Error", e.message); }
  };

  /* ── Donate nav ── */
  const goToDonate = (memberId, memberName) => {
    navigation.getParent()?.navigate("Donate", memberId ? { memberId, memberName } : undefined);
  };

  /* ── Filter ── */
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch   = (m.name || "").toLowerCase().includes(q) || (m.memberCode || "").toLowerCase().includes(q);
    const matchMinistry = filterMinistry === "All" || m.ministry === filterMinistry;
    const matchStatus   = filterStatus   === "All" || m.status   === filterStatus;
    const matchCommun   = filterCommun   === "All"
      || (filterCommun === "yes" && m.communicant === "yes")
      || (filterCommun === "no"  && m.communicant === "no");
    return matchSearch && matchMinistry && matchStatus && matchCommun;
  });

  /* ── List modal helpers ── */
  const openListModal = (type, index = null, list = []) => {
    setListModal({ visible: true, type, input: index != null ? (list[index] || "") : "", index });
  };
  const closeListModal = () => setListModal({ visible: false, type: null, input: "", index: null });

  const saveListItem = () => {
    if (!listModal.input.trim()) return;
    const { type, index, input } = listModal;
    const map = { ministry: [ministries, setMinistries], status: [statusList, setStatusList], baptism: [baptismList, setBaptismList] };
    const [list, setList] = map[type] || [];
    if (!list || !setList) return;
    if (index != null) {
      const updated = [...list]; updated[index] = input; setList(updated);
    } else {
      setList(prev => [...prev, input]);
    }
    closeListModal();
  };

  /* ══════════════════════════════════════ RENDER ══════════════════════════════════════ */
  return (
    <View style={styles.container}>

      <AppHeader
        title="Members"
        subtitle={activeEntity?.name || "Manage church members"}
        onBack={() => navigation.goBack()}
        actions={[
          { icon: "heart", onPress: () => goToDonate() },
          { icon: showActions ? "eye-off-outline" : "eye-outline", onPress: toggleActions },
          { icon: "filter-outline", onPress: () => setShowFilters(p => !p) },
        ]}
      />
      <Text style={{ color: "green", fontSize: 20 }}>
  ✅ MEMBERS SCREEN ACTIVE
</Text>

      {/* ── SEARCH ── */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or member ID…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#bbb"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── FILTER PANEL ── */}
      {showFilters && (
        <View style={styles.filterPanel}>
          {[
            { label: "Ministry",    list: ["All", ...ministries],              value: filterMinistry, setter: setFilterMinistry },
            { label: "Status",      list: ["All", ...statusList],              value: filterStatus,   setter: setFilterStatus   },
            { label: "Communicant", list: ["All", "yes", "no"],                value: filterCommun,   setter: setFilterCommun,
              display: (v) => v === "All" ? "All" : v === "yes" ? "Communicant" : "Non-communicant" },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 8 }}>
              <Text style={styles.filterLabel}>{f.label}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {f.list.map(item => (
                  <TouchableOpacity key={item}
                    style={[styles.filterChip, f.value === item && styles.filterChipActive]}
                    onPress={() => f.setter(item)}>
                    <Text style={[styles.filterChipText, f.value === item && { color: "#fff" }]}>
                      {f.display ? f.display(item) : item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      )}

      {/* ── ERROR ── */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={32} color="#bbb" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadMembers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── LOADING ── */}
      {loading && <ActivityIndicator color="#4B3F72" style={{ marginTop: 20 }} />}

      {/* ── MEMBER LIST ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 4 }}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No members yet</Text>
            <Text style={styles.emptyText}>Tap "Add Member" to get started</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isDisciplined    = !!item.disciplinaryStatus;
          const pendingApprovals = Object.keys(ACTIONS).filter(a =>
            getApprovals(item.id, a).length > 0 && !isFullyApproved(item.id, a)
          );
          return (
            <TouchableOpacity activeOpacity={0.88}
              onPress={() => navigation.navigate("MemberProfile", { memberId: item.id, role: viewerRole })}>
              <View style={[styles.card, isDisciplined && styles.cardDisciplined]}>

                {/* ── Card header ── */}
                <View style={styles.cardHeader}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(item.name || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    {item.memberCode && (
                      <Text style={styles.memberCode}>ID: {item.memberCode}</Text>
                    )}
                    {item.ministry && (
                      <Text style={styles.memberMeta}>{item.ministry}</Text>
                    )}

                    {/* Communicant badge */}
                    {item.communicant === "yes" && (
                      <View style={[styles.commBadge, {
                        backgroundColor: item.communicantStatus === "invalid" ? "#fce8e8" : "#e8f8f0"
                      }]}>
                        <Text style={[styles.commBadgeText, {
                          color: item.communicantStatus === "invalid" ? "#e74c3c" : "#27ae60"
                        }]}>
                          🍞 Communicant — {item.communicantStatus === "invalid"
                            ? `Invalid since ${item.communicantInvalidSince}` : "Active"}
                        </Text>
                      </View>
                    )}

                    {/* Discipline badge */}
                    {isDisciplined && (
                      <View style={styles.disciplineBadge}>
                        <Text style={styles.disciplineBadgeText}>
                          ⚠️ {item.disciplinaryStatus?.toUpperCase()}
                          {item.disciplinaryDate ? ` · ${item.disciplinaryDate}` : ""}
                        </Text>
                      </View>
                    )}

                    {/* Pending approval pills */}
                    {pendingApprovals.map(a => (
                      <View key={a} style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>⏳ {ACTIONS[a].label} pending</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity onPress={() => goToDonate(item.id, item.name)} style={styles.donateBtn}>
                    <Ionicons name="heart-outline" size={18} color="#E11D48" />
                  </TouchableOpacity>
                </View>

                {/* ── Actions area ── */}
                {showActions && (
                  <>
                    {/* QR code */}
                    <TouchableOpacity onPress={() => setSelectedMember(item)} style={styles.qrRow}>
                      <QRCode value={item.id || "placeholder"} size={64} />
                      <View style={styles.qrInfo}>
                        <Text style={styles.qrLabel}>Member QR Code</Text>
                        <Text style={styles.qrCode}>{item.memberCode || item.id}</Text>
                        <Text style={styles.qrSub}>Tap to enlarge</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Edit / Delete */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#4B3F72", flex: 1 }]}
                        onPress={() => editMember(item)}>
                        <Ionicons name="create-outline" size={13} color="#fff" />
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#e74c3c", flex: 1 }]}
                        onPress={() => openApproval(item, "delete")}>
                        <Ionicons name="trash-outline" size={13} color="#fff" />
                        <Text style={styles.actionBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Disciplinary actions */}
                    <View style={styles.actionRow}>
                      {["suspend", "reprimand", "demote"].map(action => (
                        <TouchableOpacity key={action}
                          style={[styles.actionBtn, { backgroundColor: ACTIONS[action].color, flex: 1 }]}
                          onPress={() => openApproval(item, action)}>
                          <Text style={styles.actionBtnText}>{ACTIONS[action].label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Reinstate */}
                    {isDisciplined && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#27ae60", marginTop: 4 }]}
                        onPress={() => openReinstate(item)}>
                        <Ionicons name="refresh-circle-outline" size={14} color="#fff" />
                        <Text style={styles.actionBtnText}>Reinstate</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />


      {/* ══ QR ENLARGED MODAL ══ */}
      <Modal visible={!!selectedMember} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={[styles.modalBox, { alignItems: "center" }]}>
            <Text style={styles.modalTitle}>{selectedMember?.name || "Member"}</Text>
            <View style={styles.memberIdBadge}>
              <Text style={styles.memberIdText}>{selectedMember?.memberCode || selectedMember?.id || ""}</Text>
            </View>
            <View style={{ marginVertical: 16 }}>
              <QRCode value={selectedMember?.id || "placeholder"} size={220} />
            </View>
            <Text style={styles.qrHint}>Scan to mark attendance at the entrance</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setSelectedMember(null)}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ APPROVAL MODAL ══ */}
      <Modal visible={approvalModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.modalBox}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="shield-checkmark-outline" size={36} color={ACTIONS[approvalAction]?.color || "#4B3F72"} />
            </View>
            <Text style={styles.modalTitle}>{ACTIONS[approvalAction]?.label} — Approval Required</Text>
            <Text style={styles.modalTarget}>{approvalTarget?.name}</Text>
            <Text style={styles.modalInfo}>
              Requires: <Text style={{ fontWeight: "700" }}>{ACTIONS[approvalAction]?.required?.join(", ")}</Text>
            </Text>

            <View style={styles.approvalChain}>
              {(ACTIONS[approvalAction]?.required || []).map(role => {
                const granted = getApprovals(approvalTarget?.id, approvalAction).includes(role);
                return (
                  <View key={role} style={[styles.approvalPill, { backgroundColor: granted ? "#e8f8f0" : "#f5f5f5" }]}>
                    <Ionicons name={granted ? "checkmark-circle" : "ellipse-outline"} size={13} color={granted ? "#27ae60" : "#bbb"} />
                    <Text style={[styles.approvalPillText, { color: granted ? "#27ae60" : "#999" }]}>{role}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Reason / Notes</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              placeholder="Describe the reason…" value={approvalNote} onChangeText={setApprovalNote} multiline />

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: ACTIONS[approvalAction]?.color || "#4B3F72", marginTop: 12 }]}
              onPress={grantApproval}>
              <Text style={styles.primaryBtnText}>Grant My Approval ({viewerRole})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#888", marginTop: 8 }]}
              onPress={() => setApprovalModal(false)}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ REINSTATE MODAL ══ */}
      <Modal visible={reinstateModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.modalBox}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="refresh-circle" size={36} color="#27ae60" />
            </View>
            <Text style={styles.modalTitle}>Reinstate Member</Text>
            <Text style={styles.modalTarget}>{reinstateTarget?.name}</Text>
            <Text style={styles.modalInfo}>
              Current: <Text style={{ fontWeight: "700", color: "#e74c3c" }}>
                {reinstateTarget?.disciplinaryStatus?.toUpperCase()}
              </Text>
            </Text>
            <Text style={styles.fieldLabel}>Reinstatement Notes</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              placeholder="Reason for reinstatement…" value={reinstateNote} onChangeText={setReinstateNote} multiline />
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#27ae60", marginTop: 12 }]}
              onPress={executeReinstate}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Confirm Reinstatement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#888", marginTop: 8 }]}
              onPress={() => setReinstateModal(false)}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ COMMUNICANT STATUS MODAL ══ */}
      <Modal visible={commStatusModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Communicant Status</Text>
            {["active", "invalid"].map(s => (
              <TouchableOpacity key={s} style={[styles.primaryBtn, {
                backgroundColor: s === "active" ? "#27ae60" : "#e74c3c", marginTop: 10
              }]} onPress={() => handleCommStatus(s)}>
                <Text style={styles.primaryBtnText}>{s === "active" ? "Active Communicant" : "Mark as Invalid"}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#888", marginTop: 8 }]}
              onPress={() => setCommStatusModal(false)}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ COMMUNICANT INVALID DATE MODAL ══ */}
      <Modal visible={commInvalidModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Invalid Since</Text>
            <Text style={{ color: "#888", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
              When did this communicant become invalid?
            </Text>
            {Platform.OS === "ios" ? (
              <DateTimePicker value={commInvalidDate} mode="date" display="spinner" onChange={handleCommInvalidDate} />
            ) : (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCommDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={15} color="#fff" />
                  <Text style={styles.primaryBtnText}>{commInvalidDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showCommDatePicker && (
                  <DateTimePicker value={commInvalidDate} mode="date" display="default" onChange={handleCommInvalidDate} />
                )}
              </>
            )}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#27ae60", marginTop: 12 }]}
              onPress={() => {
                setField("communicantInvalidSince", commInvalidDate.toISOString().split("T")[0]);
                setCommInvalidModal(false);
              }}>
              <Text style={styles.primaryBtnText}>Confirm Date</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#888", marginTop: 8 }]}
              onPress={() => setCommInvalidModal(false)}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ LIST ITEM EDIT MODAL ══ */}
      <Modal visible={listModal.visible} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {listModal.index != null ? "Edit" : "Add"} {listModal.type || ""}
            </Text>
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={listModal.input}
              onChangeText={t => setListModal(p => ({ ...p, input: t }))}
              placeholder="Enter value…"
              autoFocus
            />
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={saveListItem}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#888", marginTop: 8 }]} onPress={closeListModal}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ FLOATING ACTION BUTTONS ══ */}
      <View style={styles.fab}>
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: "#0984E3" }]}
          onPress={() => navigation.navigate("ImportMembers", { entityId, organizationId })}>
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={styles.fabBtnText}>Import</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: "#4B3F72" }]}
          onPress={() => { resetForm(); navigation.navigate("AddMember");; }}>
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.fabBtnText}>Add Member</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  // Search
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 14, marginVertical: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 6, elevation: 1 },
  searchInput: { flex: 1, fontSize: 13, color: "#222", padding: 0 },

  // Filters
  filterPanel: { backgroundColor: "#fff", marginHorizontal: 14, marginBottom: 8, borderRadius: 12, padding: 14, elevation: 1 },
  filterLabel: { fontSize: 11, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginBottom: 6, marginTop: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f5f5f5", borderRadius: 16, marginRight: 6, borderWidth: 1.5, borderColor: "#eee" },
  filterChipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  filterChipText: { fontSize: 11, fontWeight: "600", color: "#555" },

  // Error
  errorBox: { alignItems: "center", padding: 20 },
  errorText: { color: "#aaa", fontSize: 13, marginTop: 8, textAlign: "center" },
  retryBtn: { marginTop: 10, backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 },
  retryText: { color: "#fff", fontWeight: "700" },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 12 },
  emptyText: { fontSize: 13, color: "#aaa", marginTop: 4 },

  // Cards
  card: { backgroundColor: "#fff", padding: 14, marginHorizontal: 14, marginBottom: 8, borderRadius: 14, elevation: 2 },
  cardDisciplined: { borderLeftWidth: 4, borderLeftColor: "#e74c3c" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  memberName: { fontSize: 15, fontWeight: "700", color: "#222" },
  memberCode: { fontSize: 11, color: "#4B3F72", fontWeight: "600", marginTop: 2 },
  memberMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  donateBtn: { padding: 6 },
  commBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5, alignSelf: "flex-start" },
  commBadgeText: { fontSize: 10, fontWeight: "600" },
  disciplineBadge: { backgroundColor: "#fce8e8", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: "flex-start" },
  disciplineBadgeText: { fontSize: 10, fontWeight: "700", color: "#e74c3c" },
  pendingBadge: { backgroundColor: "#fff8e1", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3, alignSelf: "flex-start" },
  pendingBadgeText: { fontSize: 10, fontWeight: "600", color: "#f39c12" },

  // QR row
  qrRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9f9f9", borderRadius: 10, padding: 10, marginTop: 10, gap: 12 },
  qrInfo: { flex: 1 },
  qrLabel: { fontSize: 12, fontWeight: "700", color: "#222" },
  qrCode: { fontSize: 11, color: "#4B3F72", fontWeight: "600", marginTop: 2 },
  qrSub: { fontSize: 10, color: "#aaa", marginTop: 2 },
  qrHint: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 8 },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 8, gap: 4 },
  actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // FAB
  fab: { position: "absolute", bottom: 24, right: 16, flexDirection: "row", gap: 10 },
  fabBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 28, elevation: 6, gap: 6 },
  fabBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Form modal
  formSafe: { flex: 1, backgroundColor: "#fff" },
  formHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#4B3F72", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  formCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  formHeaderTitle: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "800" },
  formSaveBtn: { backgroundColor: "#1BA97F", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  formSaveBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  formSection: { backgroundColor: "#fff", marginBottom: 12, borderRadius: 14, padding: 14, elevation: 1 },
  formSectionTitle: { fontSize: 12, fontWeight: "800", color: "#4B3F72", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },

  // Shared modals
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 380 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#222", textAlign: "center", marginBottom: 4 },
  modalTarget: { fontSize: 14, color: "#4B3F72", fontWeight: "700", textAlign: "center", marginBottom: 4 },
  modalInfo: { fontSize: 12, color: "#666", textAlign: "center", marginBottom: 10 },
  memberIdBadge: { backgroundColor: "#EEF0FA", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 6, marginTop: 6 },
  memberIdText: { fontSize: 13, fontWeight: "800", color: "#4B3F72" },

  // Approval chain
  approvalChain: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  approvalPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  approvalPillText: { fontSize: 11, fontWeight: "600" },

  // Form fields
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12, fontSize: 13, color: "#222", borderWidth: 1.5, borderColor: "#eee" },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { backgroundColor: "#f0f0f0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: "#eee" },
  chipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  chipText: { fontSize: 12, color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff", fontWeight: "700" },

  // Primary button
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", borderRadius: 12, padding: 13, marginTop: 6, gap: 6 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Info banner
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 10 },
  infoBannerText: { flex: 1, fontSize: 12, color: "#4B3F72" },
});
