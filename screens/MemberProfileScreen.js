import React, {
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal,
  Image, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { db, storage } from "../firebase";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, query, where, getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import QRCodeDisplay from "../components/QRCodeDisplay";
import { hasPermission, ALL_PERMISSION_KEYS } from "../constants/permissions";
import {
  updateMemberLifecycle,
} from "../utils/memberIntake";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import ServiceHistoryCard
  from "../components/ServiceHistoryCard";



// ─────────────────────────────────────────────────
// Disciplinary actions — field names match MembersScreen.js exactly
// (disciplinaryStatus / disciplinaryNote / disciplinaryDate) so both
// screens always agree on a member's real standing. Approval thresholds
// replace the old hardcoded "pastor"/"elder" role-name checks — anyone
// holding manage_members can approve, and an action fires once enough
// DISTINCT people have approved, tracked by viewerMemberId.
// ─────────────────────────────────────────────────
const ACTION_CONFIG = {
  suspend: {
    label: "Suspend Member", color: "#e67e22", icon: "ban-outline", threshold: 2,
    description: "Suspends the member. Requires 2 separate approvals from people with member-management access."
  },
  reprimand: {
    label: "Reprimand Member", color: "#c0392b", icon: "warning-outline", threshold: 1,
    description: "Issues a formal reprimand. Requires 1 approval."
  },
  demote: {
    label: "Demote Member", color: "#8e44ad", icon: "arrow-down-circle-outline", threshold: 2,
    description: "Demotes the member's standing. Requires 2 separate approvals."
  },
};


const SERIOUS_ACTIONS = ["expel", "investigation"];





// Profile fields — match MembersScreen.js's DEFAULT_MEMBER shape exactly.
// The original screen used baptism/emergency/duration, which don't exist
// anywhere in the real member document — those fields always rendered
// blank no matter what was actually saved.
const PROFILE_FIELDS = [
  {
    key: "phone",
    label: "Phone",
    selfEditable: true,
  },

  {
    key: "address",
    label: "Address",
    selfEditable: false,
  },

  {
    key: "occupation",
    label: "Occupation",
    selfEditable: false,
  },

  {
    key: "memberships",
    label: "Memberships",
    selfEditable: false,
  },

  {
    key: "baptismStatus",
    label: "Baptism Status",
    selfEditable: false,
  },

  {
    key: "emergencyContact",
    label: "Emergency Contact",
    selfEditable: false,
  },

  {
    key: "membershipDuration",
    label: "Membership Duration",
    selfEditable: false,
  },
];
export default function MemberProfileScreen({ route, navigation }) {

 
  const memberId = route?.params?.memberId;
  const viewerUid =
  route?.params?.viewerUid || null;

const viewerName =
  route?.params?.viewerName || "Staff";

  // ⚠️ There's no real Firebase Auth → member linkage anywhere in this
  // app yet (every screen so far hardcodes userRole = "admin"). Until
  // that exists, pass the logged-in admin's own memberId as
  // viewerMemberId — this screen will then look up their REAL
  // permissions the exact same way AssignMemberRolesScreen already
  // writes them. Falls back to an explicit viewerPermissions array, or
  // to [] (no special access) if neither is given — least-privilege by
  // default, instead of silently assuming admin like the old version did.
  const viewerMemberId = route?.params?.viewerMemberId || null;
  const [viewerPermissions, setViewerPermissions] = useState(route?.params?.viewerPermissions || []);

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId = activeEntity?.entityId;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [contributions, setContributions] = useState([]);

  const [tab, setTab] = useState("profile");

  const [editModal, setEditModal] = useState(false);
  const [editField, setEditField] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editInput, setEditInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [deceasedModal, setDeceasedModal] = useState(false);
  const [dateOfDeath, setDateOfDeath] = useState("");

  const [actionNote, setActionNote] = useState("");
  const [eldersCount, setEldersCount] = useState(0);

  const [requestModal, setRequestModal] = useState(false);
  const [requestField, setRequestField] = useState("");
  const [requestLabel, setRequestLabel] = useState("");
  const [requestValue, setRequestValue] = useState("");
  const [activeRoles, setActiveRoles] =
  useState([]);

const [previousRoles, setPreviousRoles] =
  useState([]);

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [transferHistory, setTransferHistory] =
  useState([]);

   const [assignedVisitors,
  setAssignedVisitors] =
    useState([]);

  /* ────────────── ACTIVE ENTITY ────────────── */
  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) {
        try { setActiveEntity(JSON.parse(data)); } catch (_) {}
      }
    });
  }, []);

  /* ────────────── VIEWER PERMISSIONS ────────────── */
  useEffect(() => {
    if (route?.params?.viewerPermissions) return; // already provided directly
    if (!viewerMemberId || !organizationId || !entityId) return;

    const loadViewerPermissions = async () => {
      try {
        const snap = await getDoc(
          doc(db, "organizations", organizationId, "entities", entityId, "members", viewerMemberId)
        );
        if (snap.exists()) {
          setViewerPermissions(snap.data().permissions || []);
        }
      } catch (e) {
        console.log("❌ Load viewer permissions error:", e);
      }
    };

    loadViewerPermissions();
  }, [viewerMemberId, organizationId, entityId]);

  /* ────────────── LOAD REAL DATA ────────────── */
  const memberRef = () => {
  if (!organizationId || !entityId || !memberId) return null;
  return doc(
    db,
    "organizations",
    organizationId,
    "entities",
    entityId,
    "members",
    memberId
  );
};

  const loadMember = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(memberRef());
      if (snap.exists()) {

  const data = {
    id: snap.id,
    lifecycleStatus: "member",
    ...snap.data(),
  };

  console.log(
    "🔥 MEMBER PROFILE DATA",
    JSON.stringify(data, null, 2)
  );

  setMember(data);

} else {
  Alert.alert(
    "Not Found",
    "This member record could not be found."
  );
}
    } catch (e) {
      console.log("❌ Load member error:", e);
      Alert.alert("Error", "Could not load this member's profile.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: was collection(db, "attendance") — a flat, unscoped path
  // that doesn't match where AttendanceScreen actually writes records
  // (organizations/{orgId}/entities/{entityId}/attendance). This always
  // returned nothing real.
  const loadAttendance = async () => {
    if (!organizationId || !entityId) return;
    try {
      const q = query(
        collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
        where("memberId", "==", memberId)
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setAttendanceHistory(data);
    } catch (e) {
      console.log("❌ Load attendance error:", e);
    }
  };


const functions = getFunctions();

const _sendApprovalRequestNotifications =
  httpsCallable(
    functions,
    "sendApprovalRequestNotifications"
  );

const _sendIndividualNotification =
  httpsCallable(
    functions,
    "sendIndividualNotification"
  );



  // ✅ FIXED: same bug, was collection(db, "contributions") — the real
  // path (fixed several turns ago in DonateScreen.js) is nested under
  // organizations/{orgId}/entities/{entityId}/contributions.
  const loadContributions = async () => {
    if (!organizationId || !entityId) return;
    try {
      const q = query(
        collection(db, "organizations", organizationId, "entities", entityId, "contributions"),
        where("memberId", "==", memberId)
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setContributions(data);
    } catch (e) {
      console.log("❌ Load contributions error:", e);
    }
  };


const loadServiceHistory =
  useCallback(async () => {

    try {

      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (!stored) return;

      const entity =
        JSON.parse(stored);

      const governanceSnap =
        await getDocs(
          collection(
            db,
            "organizations",
            entity.organizationId,
            "governanceMemberships"
          )
        );

      const memberHistory =
        governanceSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter(
  (r) =>
    r.memberId === member?.id
)
;





const governanceHistory =
  memberHistory.map((r) => ({
    id: r.id,
    role: r.membershipRole,
    organization:
      r.governanceBodyName,
    organizationType:
      "governance",
    status: r.status,
    appointmentType:
      r.appointmentType ||
      "current",
    historical:
      r.historical || false,
    startDate:
      r.startDate,
    endDate:
      r.endDate,
  }));



  const ministrySnap =
  await getDocs(
    collection(
      db,
      "organizations",
      entity.organizationId,
      "leadershipAssignments"
    )
  );

const ministryHistory =
  ministrySnap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    .filter(
      (r) =>
        r.memberId === member?.id
    )
    .map((r) => ({
      id: r.id,
      role:
        r.roleName ||
        r.role,
      organization:
        r.ministryName,
      organizationType:
        "ministry",
      status:
        r.status ||
        "active",
      appointmentType:
        r.appointmentType ||
        "current",
      historical:
        r.historical || false,
      startDate:
        r.startDate,
      endDate:
        r.endDate,
    }));


// Merge everything

const combinedHistory = [

  ...governanceHistory,

  ...ministryHistory,

];

combinedHistory.sort(
  (a, b) =>
    new Date(
      b.startDate || 0
    ) -
    new Date(
      a.startDate || 0
    )
);

const active =
  combinedHistory.filter(
    (r) =>
      r.status === "active"
  );

const previous =
  combinedHistory.filter(
    (r) =>
      r.status !== "active"
  );

setActiveRoles(active);
setPreviousRoles(previous);

    } catch (error) {

      console.log(
        "loadServiceHistory",
        error
      );

    }

  }, [member]);

const loadAssignedVisitors =
  async () => {

    try {

      const snap = await getDocs(
        collection(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "visitors"
        )
      );

      const matches =
        snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter(
            (v) =>
              v.assignment?.id ===
              memberId
          );

      setAssignedVisitors(
        matches
      );

    } catch (e) {

      console.log(
        "❌ LOAD ASSIGNED VISITORS",
        e
      );

    }

  };



const loadEldersCount = async () => {
  if (!organizationId || !entityId) return;

  try {
    const q = query(
      collection(db, "organizations", organizationId, "entities", entityId, "members"),
      where("permissions", "array-contains", "elder_approval")
    );

    const snap = await getDocs(q);
    setEldersCount(snap.size);
  } catch (e) {
    console.log("❌ Load elders error:", e);
  }
};
console.log("🚀 loadTransferHistory called");

const loadTransferHistory = async () => {

  console.log(
    "🚀 loadTransferHistory called",
    {
      organizationId,
      memberId,
    }
  );

  if (!organizationId || !memberId) return;

  try {
    const q = query(
      collection(
        db,
        "organizations",
        organizationId,
        "transfers"
      ),
      where("memberId", "==", memberId)
    );

    const snap = await getDocs(q);
    console.log(
  "📦 Transfer records found:",
  snap.docs.length
);

    setTransferHistory(
      snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  } catch (e) {
    console.log(
      "❌ loadTransferHistory:",
      e
    );
  }
};

console.log(
  "✅ MemberProfile useEffect fired",
  {
    memberId,
    organizationId,
    entityId,
  }
);

const handleInviteMember = async () => {
  navigation.navigate("InviteMember", {
    organizationId,
    entityId,
    memberId: member.id,

    memberName: member.name,
    phone: member.phone,
    memberCode: member.memberCode,
  });
};
    

useEffect(() => {
  if (!memberId || !organizationId || !entityId) return;

  loadMember();
  loadAttendance();
  loadContributions();
  loadAssignedVisitors();
  loadTransferHistory();

}, [
  memberId,
  organizationId,
  entityId,
]);

useEffect(() => {

  if (!member?.id) return;

  loadServiceHistory();

}, [member]);


  useEffect(() => {
  if (organizationId && entityId) {
    loadEldersCount();
  }
}, [organizationId, entityId]);

  /* ────────────── DERIVED "SMART" STATS ────────────── */
  const presentCount = attendanceHistory.filter(a => a.status === "present").length;
  const absentCount = attendanceHistory.filter(a => a.status === "absent").length;
  const attendanceRate = attendanceHistory.length > 0
    ? Math.round((presentCount / attendanceHistory.length) * 100)
    : null;
  const lastAttended = attendanceHistory.find(a => a.status === "present");
  const totalGiven = contributions.reduce((s, c) => s + (c.amount || 0), 0);


/* ────────────── ELDER THRESHOLD LOGIC ────────────── */
const getElderThreshold = (action) => {
  // ✅ Override per member (optional)
  if (member?.customThresholds?.[action]) {
    return member.customThresholds[action];
  }

  if (eldersCount === 0) return 0;

  return Math.ceil((2 / 3) * eldersCount);
};


  /* ────────────── PERMISSIONS ────────────── */
  const isSelf = !!viewerMemberId && viewerMemberId === memberId;
  const canManageMembers = hasPermission({ permissions: viewerPermissions }, "manage_members");
  const isElder = hasPermission(
  { permissions: viewerPermissions },
  "elder_approval"
);

  const isDeceased = member?.status === "deceased";
  const isDisciplined = !!member?.disciplinaryStatus;
  const pendingApprovals = member?.pendingApprovals || {};
  const approvalsFor = (action) => pendingApprovals[action] || [];
  const isFullyApproved = (action) => approvalsFor(action).length >= ACTION_CONFIG[action].threshold;

  /* ────────────── PROFILE PHOTO (real upload now) ────────────── */
  const pickImage = async () => {
    if (!(canManageMembers || isSelf)) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to upload a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      // ✅ FIXED: was only setMember(...) locally with a "TODO: upload to
      // Firebase Storage" comment — never actually uploaded or saved.
      const blob = await (await fetch(result.assets[0].uri)).blob();
      const storageRef = ref(storage, `member-photos/${entityId}/${memberId}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await updateDoc(memberRef(), { profileImage: url });
      setMember(prev => ({ ...prev, profileImage: url }));
    } catch (e) {
      console.log("❌ Photo upload error:", e);
      Alert.alert("Upload failed", "Could not upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };



  /* ────────────── EDIT FIELD (real persistence now) ────────────── */
  const openEdit = (field, label, value) => {
    setEditField(field); setEditLabel(label); setEditInput(value || "");
    setEditModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      // ✅ FIXED: was setMember(...) only, with "TODO: updateDoc(...)"
      await updateDoc(memberRef(), { [editField]: editInput });
      setMember(prev => ({ ...prev, [editField]: editInput }));
      setEditModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not save this change.");
    } finally {
      setSaving(false);
    }
  };

  /* ────────────── SELF-SERVICE EDIT REQUEST (now actually recorded) ── */
  const openRequest = (field, label) => {
    setRequestField(field); setRequestLabel(label); setRequestValue("");
    setRequestModal(true);
  };

  const submitEditRequest = async () => {
    if (!requestValue.trim()) {
      Alert.alert("Required", "Please enter a proposed value.");
      return;
    }
    try {
      // ✅ FIXED: original just showed an Alert with nothing saved
      // anywhere — an admin had no actual way to ever see this request.
      await addDoc(
        collection(db, "organizations", organizationId, "entities", entityId, "edit_requests"),
        {
          memberId,
          memberName: member?.name || "",
          field: requestField,
          fieldLabel: requestLabel,
          proposedValue: requestValue.trim(),
          status: "pending",
          requestedAt: new Date().toISOString(),
        }
      );
      Alert.alert("Request Sent", "Your edit request has been submitted for admin approval.");
      setRequestModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not submit your request.");
    }
  };

  /* ────────────── DECEASED ────────────── */
  const confirmDeceased = async () => {
    if (!dateOfDeath.trim()) {
      Alert.alert("Date required", "Please enter the date of death.");
      return;
    }
    try {
      await updateDoc(memberRef(), { status: "deceased", dateOfDeath: dateOfDeath.trim() });
      setMember(prev => ({ ...prev, status: "deceased", dateOfDeath: dateOfDeath.trim() }));
      setDeceasedModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not update status.");
    }
  };

  /* ────────────── DISCIPLINARY APPROVAL CHAIN ────────────── */
 const grantApproval = async (action) => {

  // ✅ Check if serious (elder-only)
  const isSerious = SERIOUS_ACTIONS.includes(action);

  if (isSerious && !isElder) {
    Alert.alert("Restricted", "Only Elders can approve this action.");
    return;
  }

  if (!viewerMemberId) {
    Alert.alert("Cannot Approve", "Your own member record isn't linked to this session yet.");
    return;
  }

  const current = approvalsFor(action);

  if (current.includes(viewerMemberId)) {
    Alert.alert("Already Approved", "You've already approved this action.");
    return;
  }

  const updated = [...current, viewerMemberId];
  const newPending = { ...pendingApprovals, [action]: updated };

  try {
    const refDoc = memberRef();
    if (!refDoc) return;

    await updateDoc(refDoc, { pendingApprovals: newPending });

if (updated.length === 1) {
  try {
    await _sendApprovalRequestNotifications({
      organizationId,
      entityId,

      action:
        ACTION_CONFIG[action]?.label ||
        action,

      memberId,
      memberName:
        member?.name || "Member",

      initiatedBy: viewerName,

      excludeMemberId:
        viewerMemberId,
    });
  } catch (e) {
    console.log(
      "⚠️ approval notification failed:",
      e
    );
  }
}

    setMember(prev => ({
      ...prev,
      pendingApprovals: newPending,
    }));

    // ✅ Compute threshold
    const requiredThreshold = isSerious
      ? getElderThreshold(action)
      : ACTION_CONFIG[action]?.threshold;

    if (!requiredThreshold) {
      Alert.alert("Error", "Invalid threshold configuration.");
      return;
    }

    // ✅ Execute or wait
    if (updated.length >= requiredThreshold) {
      await executeAction(action, newPending);
    } else {
      Alert.alert(
        "Approval Recorded",
        `${updated.length} of ${requiredThreshold} approvals collected.`
      );
    }

  } catch (e) {
    console.log("❌ Approval error:", e);
    Alert.alert("Error", "Could not record your approval.");
  }
};

  const executeAction = async (action, pendingSnapshot) => {
    try {
      const cleared = { ...(pendingSnapshot || pendingApprovals), [action]: [] };

      // ✅ FIXED: now writes disciplinaryStatus/disciplinaryNote/
      // disciplinaryDate — the EXACT fields MembersScreen.js already
      // reads to show "⚠️ SUSPENDED" badges and the Reinstate button.
      // The original screen wrote member.status === "suspended" instead,
      // a field MembersScreen never looks at — the two screens could
      // disagree about whether someone was actually suspended.
      await updateDoc(memberRef(), {
        disciplinaryStatus: action,
        disciplinaryNote: actionNote || "",
        disciplinaryDate: new Date().toISOString().split("T")[0],
        pendingApprovals: cleared,
      });
try {
  await _sendIndividualNotification({
    organizationId,
    entityId,
    memberId,

    title: "Account Status Update",

    message:
      `Your membership status has been updated to: ${action}.` +
      (actionNote
        ? ` Note: ${actionNote}`
        : ""),

    category: "disciplinary",
  });
} catch (e) {
  console.log(
    "⚠️ disciplinary notification failed:",
    e
  );
}

      setMember(prev => ({
        ...prev,
        disciplinaryStatus: action,
        disciplinaryNote: actionNote || "",
        disciplinaryDate: new Date().toISOString().split("T")[0],
        pendingApprovals: cleared,
      }));
      setActionNote("");
      Alert.alert("Action Executed", `Member has been ${action}ed.`);
    } catch (e) {
      Alert.alert("Error", "Could not execute this action.");
    }
  };

  const reinstate = async () => {
    try {
      await updateDoc(memberRef(), {
        disciplinaryStatus: null,
        disciplinaryNote: null,
        disciplinaryDate: null,
      });
      setMember(prev => ({ ...prev, disciplinaryStatus: null, disciplinaryNote: null, disciplinaryDate: null }));
      Alert.alert("Reinstated", "This member has been reinstated.");
    } catch (e) {
      Alert.alert("Error", "Could not reinstate this member.");
    }
  };

  console.log(
  "TRANSFER HISTORY:",
  transferHistory
);

  /* ════════════════════════════════════════════
                      RENDER
  ════════════════════════════════════════════ */

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#4B3F72" size="large" />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center", padding: 30 }]}>
        <Ionicons name="person-remove-outline" size={48} color="#ccc" />
        <Text style={{ marginTop: 12, color: "#888", textAlign: "center" }}>
          This member's profile could not be loaded.
        </Text>
        <TouchableOpacity style={[styles.modalSaveBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={() => navigation?.goBack()}>
          <Text style={styles.white}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const memberBadgeValue = member.memberCode
    ? JSON.stringify({ memberCode: member.memberCode, entityId })
    : null;

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Member Profile</Text>
        {canManageMembers && (
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>Admin View</Text>
          </View>
        )}
      </View>

      {/* ── PROFILE HERO ── */}
      <View style={styles.hero}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={(canManageMembers || isSelf) ? pickImage : undefined}
          activeOpacity={(canManageMembers || isSelf) ? 0.7 : 1}
        >
          {uploadingPhoto ? (
            <View style={styles.avatarPlaceholder}><ActivityIndicator color="#fff" /></View>
          ) : member.profileImage ? (
            <Image source={{ uri: member.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(member.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          {(canManageMembers || isSelf) && !uploadingPhoto && (
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.heroName}>{member.name || "Unnamed Member"}</Text>
        <Text style={styles.heroMinistry}>
  {member.memberships?.length > 0
    ? member.memberships.join(" • ")
    : member.ministry || "No memberships"}
</Text>

        {member.memberCode && (
          <Text style={styles.heroCode}>ID: {member.memberCode}</Text>
        )}

        {/* Status badge */}
        <View style={[styles.statusBadge, {
          backgroundColor:
            isDeceased ? "#f0f0f0" :
            isDisciplined ? "#fff3e0" : "#e8f8f0"
        }]}>
          <View style={[styles.statusDot, {
            backgroundColor:
              isDeceased ? "#888" :
              isDisciplined ? "#e67e22" : "#27ae60"
          }]} />
          <Text style={[styles.statusLabel, {
            color:
              isDeceased ? "#666" :
              isDisciplined ? "#e67e22" : "#27ae60"
          }]}>
            {isDeceased
              ? `Deceased${member.dateOfDeath ? ` · ${member.dateOfDeath}` : ""}`
              : isDisciplined
                ? member.disciplinaryStatus.charAt(0).toUpperCase() + member.disciplinaryStatus.slice(1)
                : "Active"}
          </Text>
        </View>

        {/* Quick stats — derived from real loaded attendance/contributions */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillValue}>{attendanceRate !== null ? `${attendanceRate}%` : "—"}</Text>
            <Text style={styles.statPillLabel}>Attendance</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillValue}>₵{totalGiven.toLocaleString()}</Text>
            <Text style={styles.statPillLabel}>Total Given</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillValue}>{absentCount}</Text>
            <Text style={styles.statPillLabel}>Absences</Text>
          </View>
        </View>

        {member.memberCode && (canManageMembers || isSelf) && (
          <TouchableOpacity style={styles.badgeBtn} onPress={() => setBadgeModalVisible(true)}>
            <Ionicons name="qr-code-outline" size={14} color="#fff" />
            <Text style={styles.badgeBtnText}>View Member Badge</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        {["profile", "attendance", "contributions", "status"].map(t => (
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
          <View style={{ marginTop: 8 }}>
            {member.communicant === "yes" && (
              <View style={[styles.communicantBanner, {
                backgroundColor: member.communicantStatus === "invalid" ? "#fce8e8" : "#e8f8f0"
              }]}>
                <Ionicons
                  name={member.communicantStatus === "invalid" ? "alert-circle" : "checkmark-circle"}
                  size={16}
                  color={member.communicantStatus === "invalid" ? "#e74c3c" : "#27ae60"}
                />
                <Text style={{
                  marginLeft: 8, fontSize: 12, fontWeight: "600",
                  color: member.communicantStatus === "invalid" ? "#e74c3c" : "#27ae60"
                }}>
                  Communicant — {member.communicantStatus === "invalid"
                    ? `Invalid since ${member.communicantInvalidSince || "—"}`
                    : "Active"}
                </Text>
              </View>
            )}

            {PROFILE_FIELDS.map(({ key, label, selfEditable }) => {
              const canEditField = canManageMembers || (isSelf && selfEditable);
              const canRequestField = isSelf && !selfEditable && !canManageMembers;

console.log("INVITE DEBUG", {
  lifecycleStatus: member?.lifecycleStatus,
  canManageMembers,
  isDeceased,
  permissions: viewerPermissions,
});

              return (
                <View key={key} style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>
  {key === "memberships"
    ? (
        member.memberships?.length > 0
          ? member.memberships.join(" • ")
          : member.ministry || "—"
      )
    : (member[key] || "—")}
</Text>
                  </View>
                  {canEditField && !isDeceased && (
                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => openEdit(key, label, member[key])}
                    >
                      <Ionicons name="pencil" size={14} color="#4B3F72" />
                    </TouchableOpacity>
                  )}
                  {canRequestField && !isDeceased && (
                    <TouchableOpacity
                      style={styles.requestBtn}
                      onPress={() => openRequest(key, label)}
                    >
                      <Text style={styles.requestBtnText}>Request edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

<View style={styles.infoRow}>

  <View style={{ flex: 1 }}>

    <Text style={styles.infoLabel}>
      ASSIGNED VISITORS
    </Text>

    <Text style={styles.infoValue}>
      {assignedVisitors.length}
      {" "}
      visitor(s)
    </Text>

  </View>

</View>

{assignedVisitors.map((visitor) => (

  <TouchableOpacity
    key={visitor.id}
    style={styles.recordRow}
    onPress={() =>
      navigation.navigate(
        "VisitorProfile",
        {
          visitor,
        }
      )
    }
  >

    <View>

      <Text style={styles.recordTitle}>
        {visitor.name}
      </Text>

      <Text style={styles.recordSub}>
        {visitor.phone || "-"}
      </Text>

    </View>

  </TouchableOpacity>

))}

<ServiceHistoryCard
  activeRoles={activeRoles}
  previousRoles={previousRoles}
/>

          </View>
        )}

        {/* ══ TAB: ATTENDANCE ══ */}
        {tab === "attendance" && (
          <View>
            <Text style={styles.sectionTitle}>Attendance History</Text>
            {lastAttended && (
              <Text style={styles.lastAttendedNote}>
                Last attended: {lastAttended.date} ({lastAttended.service} · {lastAttended.type})
              </Text>
            )}
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
                    <Text style={styles.recordSub}>{r.date}{r.event ? ` · ${r.event}` : ""}</Text>
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
                  <Text style={styles.totalAmount}>GH₵ {totalGiven.toLocaleString()}</Text>
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
              <Text style={styles.statusCardValue}>
                {isDeceased ? "DECEASED" : isDisciplined ? member.disciplinaryStatus.toUpperCase() : "ACTIVE"}
              </Text>
              {isDisciplined && member.disciplinaryDate && (
                <Text style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                  Since {member.disciplinaryDate}
                  {member.disciplinaryNote ? ` — "${member.disciplinaryNote}"` : ""}
                </Text>
              )}
            </View>

            {!canManageMembers && (
              <View style={styles.emptyState}>
                <Ionicons name="lock-closed-outline" size={36} color="#ccc" />
                <Text style={styles.emptyText}>
                  {isSelf
                    ? "Status changes require admin approval. Contact a church administrator if you have questions about your status."
                    : "You don't have permission to manage this member's status."}
                </Text>
              </View>
            )}

            {canManageMembers && !isDeceased && (
              <>
              {(!member?.lifecycleStatus ||
  member?.lifecycleStatus === "member") && (
  <TouchableOpacity
    style={[
      styles.actionExecBtn,
      {
        backgroundColor: "#0984E3",
        marginBottom: 10,
      },
    ]}
    onPress={handleInviteMember}
  >
    <Ionicons
      name="send-outline"
      size={14}
      color="#fff"
      style={{ marginRight: 4 }}
    />
    <Text style={styles.white}>
      Invite Member
    </Text>
  </TouchableOpacity>
)}
                {isDisciplined && (
                  <TouchableOpacity style={[styles.actionExecBtn, { backgroundColor: "#27ae60", marginBottom: 10 }]} onPress={reinstate}>
                    <Ionicons name="refresh" size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.white}>Reinstate Member</Text>
                  </TouchableOpacity>
                )}

                {!isDisciplined && Object.entries(ACTION_CONFIG).map(([action, cfg]) => (
                  <ActionBlock
                    key={action}
                    title={cfg.label}
                    color={cfg.color}
                    icon={cfg.icon}
                    description={cfg.description}
                    approvedCount={approvalsFor(action).length}
                    threshold={cfg.threshold}
                    fullyApproved={isFullyApproved(action)}
                    onApprove={() => grantApproval(action)}
                    note={actionNote}
                    onNoteChange={setActionNote}
                  />
                ))}

                <TouchableOpacity style={styles.deceasedBtn} onPress={() => setDeceasedModal(true)}>
                  <Ionicons name="ribbon-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.white}>Mark as Deceased</Text>
                </TouchableOpacity>
              </>
            )}
{canManageMembers && !isSelf && !isDeceased && (
  <TouchableOpacity
    style={styles.transferBtn}
    onPress={() =>
      navigation.navigate("TransferRequest", {
        member,
        isAdmin: true,
      })
    }
  >
    <Ionicons
      name="swap-horizontal-outline"
      size={18}
      color="#4B3F72"
    />
    <Text style={styles.transferBtnText}>
      Initiate Transfer
    </Text>
  </TouchableOpacity>
)}

{isSelf && !isDeceased && !isDisciplined && (
  <TouchableOpacity
    style={styles.transferBtn}
    onPress={() =>
      navigation.navigate("TransferRequest", {
        member,
        isAdmin: false,
      })
    }
  >
    <Ionicons
      name="swap-horizontal-outline"
      size={18}
      color="#4B3F72"
    />
    <Text style={styles.transferBtnText}>
      Request Congregation Transfer
    </Text>
  </TouchableOpacity>
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
              <TouchableOpacity style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]} onPress={saveEdit} disabled={saving}>
                <Text style={styles.white}>{saving ? "Saving..." : "Save"}</Text>
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
              hide all action buttons.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={dateOfDeath}
              onChangeText={setDateOfDeath}
              placeholder="Date of death (e.g. 2026-06-01)"
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: "#555" }]} onPress={confirmDeceased}>
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
              Changes to <Text style={{ fontWeight: "700" }}>{requestLabel}</Text> require admin approval.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={`Proposed new value for ${requestLabel}`}
              value={requestValue}
              onChangeText={setRequestValue}
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={submitEditRequest}>
                <Text style={styles.white}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRequestModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ BADGE MODAL ══════════ */}
      <Modal visible={badgeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {memberBadgeValue && (
              <QRCodeDisplay
                value={memberBadgeValue}
                title={member.name}
                subtitle="Scan at check-in to mark attendance automatically"
                onClose={() => setBadgeModalVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ─────────────────────────────────────────
   ActionBlock — approval-chain card, driven by real permission-based
   threshold counts instead of hardcoded role names
───────────────────────────────────── */
function ActionBlock({
  title, color, icon, description,
  approvedCount, threshold, fullyApproved,
  onApprove, note, onNoteChange
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
          <Text style={styles.approvalChainLabel}>
            {approvedCount} of {threshold} approval{threshold > 1 ? "s" : ""} collected
          </Text>
          <View style={styles.approvalProgressTrack}>
            <View style={[
              styles.approvalProgressFill,
              { width: `${Math.min(100, (approvedCount / threshold) * 100)}%`, backgroundColor: color }
            ]} />
          </View>

          {!fullyApproved && (
            <>
              <TextInput
                style={[styles.modalInput, { marginTop: 10 }]}
                placeholder="Reason / note (optional)"
                value={note}
                onChangeText={onNoteChange}
              />
              <TouchableOpacity style={[styles.approveBtn, { backgroundColor: color }]} onPress={onApprove}>
                <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.white}>Grant My Approval</Text>
              </TouchableOpacity>
            </>
          )}
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

  topBar: {
    backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: "row", alignItems: "center"
  },
  backBtn: { marginRight: 12 },
  topTitle: { color: "#fff", fontSize: 17, fontWeight: "700", flex: 1 },
  rolePill: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  hero: { backgroundColor: "#4B3F72", alignItems: "center", paddingBottom: 20, paddingTop: 8 },
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
  heroCode: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 4, fontWeight: "600" },
  statusBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginTop: 10
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 12, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  statPill: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center" },
  statPillValue: { color: "#fff", fontSize: 14, fontWeight: "800" },
  statPillLabel: { color: "rgba(255,255,255,0.7)", fontSize: 9, marginTop: 2, fontWeight: "600" },

  badgeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, marginTop: 14
  },
  badgeBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  tabRow: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#eee"
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#4B3F72" },

  communicantBanner: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, padding: 12, marginVertical: 6
  },

  infoRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", padding: 13,
    marginVertical: 3, borderRadius: 10,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  infoLabel: { fontSize: 10, color: "#aaa", fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 14, color: "#222", fontWeight: "500" },
  editIconBtn: { backgroundColor: "#f0edf9", borderRadius: 8, padding: 8, marginLeft: 8 },
  requestBtn: { backgroundColor: "#e8f0fe", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  requestBtnText: { fontSize: 10, color: "#4B3F72", fontWeight: "600" },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 16, marginBottom: 8 },
  lastAttendedNote: { fontSize: 12, color: "#888", marginBottom: 10, fontStyle: "italic" },

  recordRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", padding: 12, borderRadius: 10, marginVertical: 3,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  recordTitle: { fontSize: 13, fontWeight: "600", color: "#222" },
  recordSub: { fontSize: 11, color: "#888", marginTop: 2 },
  recordBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  contribAmount: { fontSize: 14, fontWeight: "700", color: "#27ae60" },

  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#e8f8f0", padding: 14, borderRadius: 10, marginBottom: 8
  },
  totalLabel: { fontSize: 13, color: "#555", fontWeight: "600" },
  totalAmount: { fontSize: 18, fontWeight: "800", color: "#27ae60" },

  statusCard: {
    backgroundColor: "#fff", padding: 16, borderRadius: 10,
    alignItems: "center", marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
  },
  statusCardLabel: { fontSize: 11, color: "#aaa", textTransform: "uppercase", fontWeight: "600" },
  statusCardValue: { fontSize: 22, fontWeight: "800", color: "#4B3F72", marginTop: 4 },

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

  approvalChainLabel: { fontSize: 11, color: "#aaa", fontWeight: "600", marginBottom: 6 },
  approvalProgressTrack: { height: 6, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  approvalProgressFill: { height: 6, borderRadius: 3 },

  approveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 10, borderRadius: 8, marginTop: 10
  },
  actionExecBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 10, borderRadius: 8
  },

  deceasedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#555", padding: 13, borderRadius: 10, marginTop: 8
  },

  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 16 },
  emptyText: { color: "#bbb", fontSize: 13, marginTop: 10, textAlign: "center" },

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
  transferBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#EEF0FA",
  borderWidth: 1,
  borderColor: "#D9DDF2",
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 12,
  marginTop: 10,
},

transferBtnText: {
  color: "#4B3F72",
  fontWeight: "700",
  fontSize: 14,
  marginLeft: 8,
},
transferBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#EEF0FA",
  borderWidth: 1,
  borderColor: "#D9DDF2",
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 16,
  marginTop: 10,
},

transferBtnText: {
  marginLeft: 8,
  color: "#4B3F72",
  fontWeight: "700",
  fontSize: 14,
},
visitorRow: {
  backgroundColor: "#F7F8FC",
  padding: 12,
  borderRadius: 10,
  marginBottom: 8,
},
});