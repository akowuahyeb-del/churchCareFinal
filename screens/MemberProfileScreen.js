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
import { hasPermission } from "../constants/permissions";
import {
  computeAbsenceStreak,
  resolveMemberTrack,
  classifyAttendanceHealth,
  buildAttendanceRecommendation,
  getMemberOccurrences,
} from "../utils/attendanceIntelligence";

import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import ServiceHistoryCard from "../components/ServiceHistoryCard";
import { formatDate } from "../utils/dateUtils";

// ─────────────────────────────────────────────────
// Disciplinary actions — field names match MembersScreen.js exactly
// (disciplinaryStatus / disciplinaryNote / disciplinaryDate) so both
// screens always agree on a member's real standing.
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

const PROFILE_FIELDS = [
  { key: "phone", label: "Phone", selfEditable: true },
  { key: "address", label: "Address", selfEditable: false },
  { key: "occupation", label: "Occupation", selfEditable: false },
  { key: "memberships", label: "Memberships", selfEditable: false },
  { key: "baptismStatus", label: "Baptism Status", selfEditable: false },
  { key: "emergencyContact", label: "Emergency Contact", selfEditable: false },
  { key: "membershipDuration", label: "Membership Duration", selfEditable: false },
];

const formatAttendanceHealth = (value) => {
  const labels = {
    healthy: "Healthy",
    follow_up: "Follow-Up",
    at_risk: "At Risk",
    inactive_candidate: "Inactive Candidate",
    inactive: "Inactive",
  };
  return labels[value] || value;
};

const formatAttendanceAction = (value) => {
  const labels = {
    follow_up: "Follow-Up Required",
    pastoral_review: "Pastoral Review",
    inactive_review: "Inactive Review",
    none: "None",
  };
  return labels[value] || value;
};

const formatLifecycleStatus = (value) => {
  const labels = {
    visitor: "Visitor",
    interested: "Interested",
    pending_approval: "Pending Approval",
    member: "Member",
    invited: "Invited",
    registered: "Registered",
    active_user: "Active User",
    inactive_candidate: "Inactive Candidate",
    inactive: "Inactive",
  };
  return labels[value] || value;
};

export default function MemberProfileScreen({ route, navigation }) {

  const memberId =
    route?.params?.memberId ||
    route?.params?.viewerMemberId ||
    null;

  const passedOrganizationId = route?.params?.organizationId;
  const passedEntityId = route?.params?.entityId;
  const viewerUid = route?.params?.viewerUid || null;
  const viewerName = route?.params?.viewerName || "Staff";

  const viewerMemberId = route?.params?.viewerMemberId || null;
  const [viewerPermissions, setViewerPermissions] = useState(route?.params?.viewerPermissions || []);

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = passedOrganizationId || activeEntity?.organizationId;
  const entityId = passedEntityId || activeEntity?.entityId;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceHealth, setAttendanceHealth] = useState("healthy");
  const [absenceStreak, setAbsenceStreak] = useState(0);
  const [attendanceRecommendation, setAttendanceRecommendation] = useState(null);
 const [attendancePolicy,
  setAttendancePolicy] =
  useState({
    loaded: false,
  });
  const [contributions, setContributions] = useState([]);
const [attendanceTrack,
  setAttendanceTrack] =
  useState(null);

const [entityDefaultTrack,
  setEntityDefaultTrack] =
  useState("sunday");

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
  const [activeRoles, setActiveRoles] = useState([]);
  const [previousRoles, setPreviousRoles] = useState([]);

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [assignedVisitors, setAssignedVisitors] = useState([]);

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
    if (route?.params?.viewerPermissions) return;
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
      db, "organizations", organizationId, "entities", entityId, "members", memberId
    );
  };

  const loadMember = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(memberRef());
      if (snap.exists()) {
        const raw = snap.data();

        // FIX: lifecycleStatus default was placed BEFORE the spread —
        // correct only by accident of ordering. Reordering those lines
        // would have silently forced every member to "member". Now
        // explicit and order-independent.
        const data = {
          id: snap.id,
          ...raw,
          lifecycleStatus: raw.lifecycleStatus || "member",
        };

        setMember(data);
      } else {
        Alert.alert("Not Found", "This member record could not be found.");
      }
    } catch (e) {
      console.log("❌ Load member error:", e);
      Alert.alert("Error", "Could not load this member's profile.");
    } finally {
      setLoading(false);
    }
  };

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

  const loadAttendanceIntelligence = async () => {
  if (
  !organizationId ||
  !entityId ||
  !memberId
) {
  return;
}

if (
  !attendancePolicy?.loaded
) {
  return;
}

    try {
     const track =
  await resolveMemberTrack({
    organizationId,
    entityId,
    memberId,
    fallbackTrack:
      entityDefaultTrack,
  });

  const normalizedTrack =
  String(track || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

setAttendanceTrack(normalizedTrack);


const streak =
  await computeAbsenceStreak({
    organizationId,
    entityId,
    memberId,
    track: normalizedTrack,
  });


      const memberIsInactive = member?.lifecycleStatus === "inactive";

     console.log(
  "classifyAttendanceHealth typeof:",
  typeof classifyAttendanceHealth
);

const health = memberIsInactive
  ? "inactive"
  : classifyAttendanceHealth(
      streak,
      attendancePolicy
    );

    console.log(
  "buildAttendanceRecommendation typeof:",
  typeof buildAttendanceRecommendation
);

const recommendation =
  memberIsInactive
    ? {
        health: "inactive",
        action: "none",
        priority: "none",
      }
    : buildAttendanceRecommendation(
        streak,
        attendancePolicy
      );

      setAbsenceStreak(streak);
console.log(
  "PROFILE MEMBER:",
  memberId
);

console.log(
  "PROFILE TRACK:",
  track
);

const occurrences =
  await getMemberOccurrences({
    organizationId,
    entityId,
    memberId,
    track: normalizedTrack,
  });

console.log(
  "PROFILE OCCURRENCES",
  JSON.stringify(
    occurrences,
    null,
    2
  )
);

console.log(
  "PROFILE STREAK:",
  streak
);

console.log(
  "PROFILE POLICY:",
  attendancePolicy
);


      setAttendanceHealth(health);
      setAttendanceRecommendation(recommendation);
    } catch (e) {
      console.log("❌ Load attendance intelligence error:", e);
    }
  };

  const functions = getFunctions();

  const _sendApprovalRequestNotifications =
    httpsCallable(functions, "sendApprovalRequestNotifications");

  const _sendIndividualNotification =
    httpsCallable(functions, "sendIndividualNotification");

  const loadContributions = async () => {
    if (!organizationId || !entityId || !member?.name) return;

    try {
      // CASH DONATIONS
      const cashSnap = await getDocs(
        collection(db, "organizations", organizationId, "entities", entityId, "contributions")
      );

      // FIX: was also matching on `d.memberName === member?.name` —
      // two members sharing a display name would see each other's cash
      // contributions. Same privacy issue already fixed on the in-kind
      // side; now ID-only, with a name fallback ONLY for legacy records
      // that predate memberId being stored.
      const cashData = cashSnap.docs
        .map(d => ({ id: d.id, donationType: "cash", ...d.data() }))
        .filter(d => {
          if (d.memberId) return d.memberId === memberId;
          return d.memberName === member?.name; // legacy records only
        });

      // IN-KIND DONATIONS
      const inKindSnap = await getDocs(
        collection(db, "organizations", organizationId, "entities", entityId, "inkind_donations")
      );

      const inKindData = inKindSnap.docs
        .map(d => ({ id: d.id, donationType: "inkind", ...d.data() }))
        .filter(d => {
          if (d.memberId) return d.memberId === memberId;

          if (Array.isArray(d.donors)) {
            return d.donors.some(donor => donor?.id === memberId);
          }

          return d.memberName === member?.name; // legacy records only
        });

      const combined = [...cashData, ...inKindData].sort(
        (a, b) => (b.date || "").localeCompare(a.date || "")
      );

      setContributions(combined);
    } catch (e) {
      console.log("❌ Load contributions error", e);
    }
  };

  const loadAssignedVisitors = async () => {
    if (!organizationId || !entityId || !memberId) return;

    try {
      const snap = await getDocs(
        collection(db, "organizations", organizationId, "entities", entityId, "visitors")
      );

      const matches = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v) => v.assignment?.id === memberId);

      setAssignedVisitors(matches);
    } catch (e) {
      console.log("LOAD ASSIGNED VISITORS", e);
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

  const loadTransferHistory = async () => {
    if (!organizationId || !memberId) return;

    try {
      const q = query(
        collection(db, "organizations", organizationId, "transfers"),
        where("memberId", "==", memberId)
      );

      const snap = await getDocs(q);

      setTransferHistory(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    } catch (e) {
      console.log("❌ loadTransferHistory:", e);
    }
  };

  const loadServiceHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("activeEntity");
      if (!stored) return;

      const entity = JSON.parse(stored);

      const governanceSnap = await getDocs(
        collection(db, "organizations", entity.organizationId, "governanceMemberships")
      );

      const memberHistory = governanceSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.memberId === member?.id);

      const active = memberHistory
        .filter((r) => r.status === "active")
        .map((r) => ({
          id: r.id,
          role: r.membershipRole,
          organization: r.governanceBodyName,
          startDate: r.startDate,
        }));

      const previous = memberHistory
        .filter((r) => r.status === "inactive")
        .map((r) => {
          let duration = "Unknown";

          if (r.startDate && r.endDate) {
            const months = Math.floor(
              (new Date(r.endDate) - new Date(r.startDate)) /
              (1000 * 60 * 60 * 24 * 30)
            );

            duration = months < 1 ? "Less than 1 month" : `${months} months`;
          }

          return {
            id: r.id,
            role: r.membershipRole,
            organization: r.governanceBodyName,
            startDate: r.startDate,
            endDate: r.endDate,
            duration,
          };
        });

      setActiveRoles(active);
      setPreviousRoles(previous);
    } catch (error) {
      console.log("loadServiceHistory", error);
    }
  }, [member]);

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

    // FIX: was wrapped in setTimeout(..., 500) — a band-aid that just
    // delayed the visitor list appearing. Every ID it needs is already
    // available here.
    loadAssignedVisitors();

    loadTransferHistory();
  }, [memberId, organizationId, entityId]);

  // FIX: loadAttendanceIntelligence used to run in the mount effect
  // above, where `member` was still null — so the
  // lifecycleStatus === "inactive" branch NEVER ran on first load, and
  // inactive members were misclassified as "At Risk"/"Follow-Up
  // Required" with no re-run once member data arrived.
  useEffect(() => {

  if (!member?.id) {
    return;
  }

  if (
    !attendancePolicy?.loaded
  ) {
    return;
  }

  loadAttendanceIntelligence();

}, [
  member,
  attendancePolicy,
]);

  useEffect(() => {
    if (member?.id) {
      loadContributions();
    }
  }, [member]);

  useEffect(() => {
    if (!member?.id) return;
    loadServiceHistory();
  }, [member]);

  useEffect(() => {
    if (organizationId && entityId) {
      loadEldersCount();
    }
  }, [organizationId, entityId]);

  useEffect(() => {

  if (
    !organizationId ||
    !entityId
  ) {
    return;
  }

  const loadSettings =
    async () => {

      try {

        const snap =
          await getDoc(
            doc(
              db,
              "organizations",
              organizationId,
              "entities",
              entityId,
              "settings",
              "attendanceSettings"
            )
          );

        if (!snap.exists()) {

  setAttendancePolicy({
    loaded: true,
    followUpThreshold: null,
    atRiskThreshold: null,
    inactiveCandidateThreshold: null,
  });

  return;
}

        const data =
          snap.data();

        if (
          data?.defaultService
        ) {

          setEntityDefaultTrack(
            data.defaultService
              .toLowerCase()
          );

        }

        setAttendancePolicy({
  loaded: true,

  followUpThreshold:
    data?.attendancePolicy
      ?.followUpThreshold ?? null,

  atRiskThreshold:
    data?.attendancePolicy
      ?.atRiskThreshold ?? null,

  inactiveCandidateThreshold:
    data?.attendancePolicy
      ?.inactiveCandidateThreshold ?? null,
});

      } catch (e) {

        console.log(
          "attendanceSettings",
          e
        );

      }

    };

  loadSettings();

}, [
  organizationId,
  entityId,
]);

  /* ────────────── DERIVED "SMART" STATS ────────────── */
  // FIX: these counted EVERY attendance record, including "special"
  // sessions (weddings, funerals). Since sessions now auto-mark
  // absentees, members accumulate absence records for one-off events
  // they were never expected at — dragging down the headline
  // attendance rate and absence count, and directly contradicting the
  // streak logic, which correctly excludes special sessions.
  const countableHistory = attendanceHistory.filter(
    a => (a.sessionCategory || "regular") !== "special"
  );

  const presentCount = countableHistory.filter(a => a.status === "present").length;
  const absentCount = countableHistory.filter(a => a.status === "absent").length;
  const attendanceRate = countableHistory.length > 0
    ? Math.round((presentCount / countableHistory.length) * 100)
    : null;

  const lastAttended = attendanceHistory.find(a => a.status === "present");
  const totalGiven = contributions.reduce((s, c) => s + (c.amount || 0), 0);
  const contributionCount = contributions.length;

  /* ────────────── ELDER THRESHOLD LOGIC ────────────── */
  const getElderThreshold = (action) => {
    if (member?.customThresholds?.[action]) {
      return member.customThresholds[action];
    }

    if (eldersCount === 0) return 0;

    return Math.ceil((2 / 3) * eldersCount);
  };

  /* ────────────── PERMISSIONS ────────────── */
  const isSelf = !!viewerMemberId && viewerMemberId === memberId;
  const isSuperAdmin =
    route?.params?.viewerRole === "super_admin" ||
    viewerPermissions?.includes("super_admin");

  const canManageMembers =
    isSuperAdmin ||
    hasPermission({ permissions: viewerPermissions }, "manage_members");

  const isElder = hasPermission({ permissions: viewerPermissions }, "elder_approval");

  const isDeceased = member?.status === "deceased";
  const isDisciplined = !!member?.disciplinaryStatus;
  const pendingApprovals = member?.pendingApprovals || {};
  const approvalsFor = (action) => pendingApprovals[action] || [];
  const isFullyApproved = (action) => approvalsFor(action).length >= ACTION_CONFIG[action].threshold;

  /* ────────────── PROFILE PHOTO ────────────── */
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

  /* ────────────── EDIT FIELD ────────────── */
  const openEdit = (field, label, value) => {
    setEditField(field); setEditLabel(label); setEditInput(value || "");
    setEditModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateDoc(memberRef(), { [editField]: editInput });
      setMember(prev => ({ ...prev, [editField]: editInput }));
      setEditModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not save this change.");
    } finally {
      setSaving(false);
    }
  };

  /* ────────────── SELF-SERVICE EDIT REQUEST ────────────── */
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
            action: ACTION_CONFIG[action]?.label || action,
            memberId,
            memberName: member?.name || "Member",
            initiatedBy: viewerName,
            excludeMemberId: viewerMemberId,
          });
        } catch (e) {
          console.log("⚠️ approval notification failed:", e);
        }
      }

      setMember(prev => ({ ...prev, pendingApprovals: newPending }));

      const requiredThreshold = isSerious
        ? getElderThreshold(action)
        : ACTION_CONFIG[action]?.threshold;

      if (!requiredThreshold) {
        Alert.alert("Error", "Invalid threshold configuration.");
        return;
      }

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
            (actionNote ? ` Note: ${actionNote}` : ""),
          category: "disciplinary",
        });
      } catch (e) {
        console.log("⚠️ disciplinary notification failed:", e);
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
      setMember(prev => ({
        ...prev,
        disciplinaryStatus: null,
        disciplinaryNote: null,
        disciplinaryDate: null
      }));
      Alert.alert("Reinstated", "This member has been reinstated.");
    } catch (e) {
      Alert.alert("Error", "Could not reinstate this member.");
    }
  };


  const restoreInactiveMember =
  async () => {
    try {

      await updateDoc(
        memberRef(),
        {
          lifecycleStatus: "member",

          inactiveDate: null,

          inactiveReason: null,

          restoredDate:
            new Date()
              .toISOString()
              .split("T")[0],
        }
      );

      setMember(prev => ({
        ...prev,
        lifecycleStatus: "member",
        inactiveDate: null,
        inactiveReason: null,
      }));

      Alert.alert(
        "Member Restored",
        "Member status changed back to Active."
      );

    } catch (e) {

      console.log(
        "restoreInactiveMember",
        e
      );

      Alert.alert(
        "Error",
        "Could not restore member."
      );
    }
};
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Ionicons name="shield-checkmark" size={60} color="#4B3F72" />

        <Text style={{ fontSize: 20, fontWeight: "700", marginTop: 12, marginBottom: 8, textAlign: "center" }}>
          Super Administrator
        </Text>

        <Text style={{ textAlign: "center", color: "#666", lineHeight: 22 }}>
          No member record found.
        </Text>

        <Text style={{ textAlign: "center", color: "#666", lineHeight: 22 }}>
          Platform administrators do not require a linked member profile.
        </Text>

        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: "#4B3F72",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 10,
          }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Back</Text>
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
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Settings");
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Member Profile</Text>
        {canManageMembers && (
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>Admin View</Text>
          </View>
        )}
      </View>

{/* ── COMPACT PROFILE HERO ── */}
<View style={styles.heroCompact}>

  {/* PHOTO */}
  <TouchableOpacity
    style={styles.avatarWrap}
    onPress={
      (canManageMembers || isSelf)
        ? pickImage
        : undefined
    }
    activeOpacity={
      (canManageMembers || isSelf)
        ? 0.7
        : 1
    }
  >
    {uploadingPhoto ? (
      <View style={styles.avatarPlaceholder}>
        <ActivityIndicator color="#fff" />
      </View>
    ) : member.profileImage ? (
      <Image
        source={{
          uri: member.profileImage,
        }}
        style={styles.avatar}
      />
    ) : (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarInitials}>
          {(member.name || "?")
            .split(" ")
            .map(n => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </Text>
      </View>
    )}

    {(canManageMembers || isSelf) &&
      !uploadingPhoto && (
        <View style={styles.cameraOverlay}>
          <Ionicons
            name="camera"
            size={12}
            color="#fff"
          />
        </View>
      )}
  </TouchableOpacity>

  {/* DETAILS */}
  <View style={styles.memberInfo}>

    <Text style={styles.heroNameCompact}>
      {member.name || "Unnamed Member"}
    </Text>

    <Text style={styles.heroMinistryCompact}>
      {member.memberships?.length > 0
        ? member.memberships.join(" • ")
        : member.ministry || "No memberships"}
    </Text>

    <View style={styles.idRow}>
      {member.memberCode && (
        <Text style={styles.heroCodeCompact}>
          ID: {member.memberCode}
        </Text>
      )}

      {member.memberCode &&
        (canManageMembers || isSelf) && (
          <TouchableOpacity
            style={styles.badgeIconBtn}
            onPress={() =>
              setBadgeModalVisible(true)
            }
          >
            <Ionicons
              name="qr-code-outline"
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        )}
    </View>

    <View
      style={[
        styles.statusBadgeCompact,
        {
          backgroundColor:
            isDeceased
              ? "#f0f0f0"
              : isDisciplined
              ? "#fff3e0"
              : "#e8f8f0",
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor:
              isDeceased
                ? "#888"
                : isDisciplined
                ? "#e67e22"
                : "#27ae60",
          },
        ]}
      />

      <Text
        style={[
          styles.statusLabel,
          {
            color:
              isDeceased
                ? "#666"
                : isDisciplined
                ? "#e67e22"
                : "#27ae60",
          },
        ]}
      >
        {isDeceased
          ? "Deceased"
          : isDisciplined
          ? member.disciplinaryStatus
          : "Active"}
      </Text>
    </View>

  </View>

</View>

{/* COMPACT STATS */}
<View style={styles.summaryRow}>

  <View style={styles.summaryItem}>
    <Text style={styles.summaryValue}>
      {attendanceRate !== null
        ? `${attendanceRate}%`
        : "—"}
    </Text>
    <Text style={styles.summaryLabel}>
      Attendance
    </Text>
  </View>

  <View style={styles.summaryItem}>
    <Text style={styles.summaryValue}>
      ₵{totalGiven.toLocaleString()}
    </Text>
    <Text style={styles.summaryLabel}>
      Given
    </Text>
  </View>

  <View style={styles.summaryItem}>
    <Text style={styles.summaryValue}>
      {absentCount}
    </Text>
    <Text style={styles.summaryLabel}>
      Absences
    </Text>
  </View>

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

            {/* FIX: removed the "INVITE DEBUG" console.log that sat
                inside this map — it fired once per field on every
                render and printed viewer permissions. */}
            {PROFILE_FIELDS.map(({ key, label, selfEditable }) => {
              const canEditField = canManageMembers || (isSelf && selfEditable);
              const canRequestField = isSelf && !selfEditable && !canManageMembers;

              return (
                <View key={key} style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>
                      {key === "memberships"
                        ? (member.memberships?.length > 0
                            ? member.memberships.join(" • ")
                            : member.ministry || "—")
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
                <Text style={styles.infoLabel}>ASSIGNED VISITORS</Text>
                <Text style={styles.infoValue}>
                  {assignedVisitors.length} visitor(s)
                </Text>
              </View>
            </View>

            {assignedVisitors.map((visitor) => (
              <TouchableOpacity
                key={visitor.id}
                style={styles.recordRow}
                onPress={() => navigation.navigate("VisitorProfile", { visitor })}
              >
                <View>
                  <Text style={styles.recordTitle}>{visitor.name}</Text>
                  <Text style={styles.recordSub}>{visitor.phone || "-"}</Text>
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
            <View style={styles.statusCard}>
              <Text style={styles.statusCardLabel}>ATTENDANCE INTELLIGENCE</Text>

              <Text style={styles.statusCardValue}>
                {member?.lifecycleStatus === "inactive"
                  ? "Inactive"
                  : formatAttendanceHealth(attendanceHealth)}
              </Text>

              <Text style={{ marginTop: 6, color: "#666" }}>
                Current absence streak:
{" "}
{absenceStreak}
{attendanceTrack
  ? ` (${attendanceTrack})`
  : ""}
              </Text>

              <Text style={{ marginTop: 6, color: "#4B3F72", fontWeight: "700" }}>
                Recommended action:{" "}
                {formatAttendanceAction(attendanceRecommendation?.action || "none")}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Attendance History</Text>
            {lastAttended && (
              <Text style={styles.lastAttendedNote}>
                Last attended: {formatDate(lastAttended.date)}
                ({lastAttended.service} · {lastAttended.type})
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
                    <Text style={styles.recordSub}>
                      {formatDate(r.date)}
                      {r.event ? ` · ${r.event}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.recordBadge, {
                    backgroundColor: r.status === "present" ? "#e8f8f0" : "#fce8e8"
                  }]}>
                    <Text style={{
                      color: r.status === "present" ? "#27ae60" : "#e74c3c",
                      fontSize: 11,
                      fontWeight: "700"
                    }}>
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
                      <Text style={styles.recordTitle}>
                        {c.donationType === "inkind"
                          ? c.itemName || c.categoryLabel || "In-Kind Donation"
                          : c.type || "Offering"}
                      </Text>
                      <Text style={styles.recordSub}>{formatDate(c.date)}</Text>

                      {c.acknowledgedByName && (
                        <Text style={styles.recordSub}>
                          ✅ Approved by {c.acknowledgedByName}
                        </Text>
                      )}

                      {c.acknowledgedByRole && (
                        <Text style={styles.recordSub}>Role: {c.acknowledgedByRole}</Text>
                      )}

                      {c.acknowledgedAt && (
                        <Text style={styles.recordSub}>
                          {new Date(c.acknowledgedAt).toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.contribAmount}>
                      {c.donationType === "inkind"
                        ? `${c.quantity || 0} ${c.unit || ""}`
                        : `GH₵ ${(c.amount || 0).toLocaleString()}`}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* ══ TAB: STATUS / ADMIN ACTIONS ══ */}
        {tab === "status" && (
          <View>
            <View style={styles.statusCard}>
              <Text style={styles.statusCardLabel}>Current Status</Text>
              <Text style={styles.statusCardValue}>
                {isDeceased
                  ? "DECEASED"
                  : isDisciplined
                  ? member.disciplinaryStatus.toUpperCase()
                  : member?.lifecycleStatus === "inactive"
                  ? "INACTIVE"
                  : "ACTIVE"}
              </Text>
              {isDisciplined && member.disciplinaryDate && (
                <Text style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                  Since {member.disciplinaryDate}
                  {member.disciplinaryNote ? ` — "${member.disciplinaryNote}"` : ""}
                </Text>
              )}
            </View>

            <View style={[styles.statusCard, { marginTop: 10 }]}>
              <Text style={styles.statusCardLabel}>LIFECYCLE STATUS</Text>
              <Text style={styles.statusCardValue}>
                {formatLifecycleStatus(member?.lifecycleStatus || "member")}
              </Text>
            </View>

            <View style={[styles.statusCard, { marginTop: 10 }]}>
              <Text style={styles.statusCardLabel}>ATTENDANCE HEALTH</Text>

              <Text style={styles.statusCardValue}>
                {member?.lifecycleStatus === "inactive"
                  ? "Inactive"
                  : formatAttendanceHealth(attendanceHealth)}
              </Text>

              <Text style={{ fontSize: 12, color: "#666", marginTop: 4, textAlign: "center" }}>
                Recommended Action:{" "}
                {formatAttendanceAction(attendanceRecommendation?.action || "none")}
              </Text>

              <Text style={{ fontSize: 12, color: "#666", marginTop: 4, textAlign: "center" }}>
                Absence Streak: {absenceStreak}
              </Text>
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
                {(!member?.lifecycleStatus || member?.lifecycleStatus === "member") && (
                  <TouchableOpacity
                    style={[styles.actionExecBtn, { backgroundColor: "#0984E3", marginBottom: 10 }]}
                    onPress={handleInviteMember}
                  >
                    <Ionicons name="send-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.white}>Invite Member</Text>
                  </TouchableOpacity>
                )}

                {isDisciplined && (
                  <TouchableOpacity
                    style={[styles.actionExecBtn, { backgroundColor: "#27ae60", marginBottom: 10 }]}
                    onPress={reinstate}
                  >
                    <Ionicons name="refresh" size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.white}>Reinstate Member</Text>
                  </TouchableOpacity>
                )}
                {member?.lifecycleStatus === "inactive" && (
  <TouchableOpacity
    style={[
      styles.actionExecBtn,
      {
        backgroundColor: "#27ae60",
        marginBottom: 10,
      },
    ]}
    onPress={restoreInactiveMember}
  >
    <Ionicons
      name="refresh"
      size={14}
      color="#fff"
      style={{ marginRight: 4 }}
    />
    <Text style={styles.white}>
      Restore Member
    </Text>
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
                onPress={() => navigation.navigate("TransferRequest", { member, isAdmin: true })}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color="#4B3F72" />
                <Text style={styles.transferBtnText}>Initiate Transfer</Text>
              </TouchableOpacity>
            )}

            {isSelf && !isDeceased && !isDisciplined && (
              <TouchableOpacity
                style={styles.transferBtn}
                onPress={() => navigation.navigate("TransferRequest", { member, isAdmin: false })}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color="#4B3F72" />
                <Text style={styles.transferBtnText}>Request Congregation Transfer</Text>
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
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={saving}
              >
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
   ActionBlock
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

  heroCompact: {
  backgroundColor: "#4B3F72",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
},
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
  heroName: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", marginTop: 14, textAlign: "center" },
  heroMinistry: { color: "rgba(255,255,255,0.85)", fontSize: 15, marginTop: 6, textAlign: "center" },
  heroCode: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 8, fontWeight: "700" },

  statusBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginTop: 10
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 12, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  statPill: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  statPillValue: { color: "#1F2937", fontSize: 24, fontWeight: "800", marginTop: 6 },
  statPillLabel: { color: "#6B7280", fontSize: 11, marginTop: 6, fontWeight: "600" },

  badgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 18,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  badgeBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginLeft: 8 },

  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#4B3F72" },

  communicantBanner: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 12, marginVertical: 6 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginVertical: 6,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  infoLabel: { fontSize: 11, color: "#8A8A8A", fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  infoValue: { fontSize: 16, color: "#1F2937", fontWeight: "600" },
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

  // FIX: transferBtn and transferBtnText were each defined twice —
  // the first copy was silently dead. Deduplicated.
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
  memberInfo: {
  flex: 1,
  marginLeft: 12,
},

heroNameCompact: {
  color: "#fff",
  fontSize: 22,
  fontWeight: "800",
},

heroMinistryCompact: {
  color: "rgba(255,255,255,0.8)",
  fontSize: 13,
  marginTop: 2,
},

heroCodeCompact: {
  color: "rgba(255,255,255,0.7)",
  fontSize: 12,
  marginTop: 2,
},

summaryRow: {
  backgroundColor: "#fff",
  flexDirection: "row",
  justifyContent: "space-around",
  paddingVertical: 10,
},

summaryItem: {
  alignItems: "center",
},

summaryValue: {
  fontSize: 16,
  fontWeight: "700",
},

summaryLabel: {
  fontSize: 11,
  color: "#777",
},
idRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 4,
},

badgeIconBtn: {
  marginLeft: 10,
  padding: 4,
},

statusBadgeCompact: {
  alignSelf: "flex-start",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 14,
  marginTop: 6,
},

});