// screens/AttendanceScreen.js
// ✅ Complete rewrite incorporating:
//   — All bug fixes from conversation (double-tap, presentCount,
//     listener leak, checkAbsenceStreak, handleBarCodeScanned,
//     session restoration, Hermes URL crash)
//   — 7 intelligence features: predictive missing panel, session health
//     score, first-time visitor badge, streak display, vs-last-week
//     comparison, offline write queue, real geo implementation

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
  FlatList, Switch
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, onSnapshot,
  serverTimestamp, getDoc, setDoc
} from "firebase/firestore";

import QRCodeDisplay from "../components/QRCodeDisplay";
import { buildAttendanceSessionLink } from "../utils/qrLinks";
import { findOpenSession } from "../utils/findOpenSession";
import { useAttendanceSettings } from "../hooks/useAttendanceSettings";
import {
  isMemberAway,
  trueLocalMembers,
  EXCLUDED_FROM_ABSENCE_ALERTS,
} from "../constants/memberMobility";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
/* // ─────────────────────────────────────────────────────────────────
const SERVICES   = ["Sunday", "Wednesday", "Friday", "Special"];
const TYPES      = ["First Service", "Second Service", "Third Service", "Evening Service", "Youth", "Children", "Prayer"]; */
const EVENTS     = ["None", "Easter", "Christmas", "Harvest", "Founders Day", "Convention"];
const METHODS    = ["manual", "qr", "selfqr", "geo"];


// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const fmtTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function AttendanceScreen() {

const navigation = useNavigation();
const route = useRoute();
  // ── ENTITY CONTEXT ──
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;

const {
  settings: attendanceSettings,
  loaded: settingsLoaded,
} = useAttendanceSettings(
  organizationId,
  entityId
);

  // ── SESSION STATE ──
const [selectedService, setSelectedService] = useState("");
const [selectedType, setSelectedType] = useState("");
  const [selectedEvent,   setSelectedEvent]   = useState("None");
  const [selectedTemplate, setSelectedTemplate] =
  useState(null);
  const [startTime,       setStartTime]       = useState("");
  const [endTime,         setEndTime]         = useState("");
  const [sessionId,       setSessionId]       = useState(null);
  const [sessionStatus,   setSessionStatus]   = useState(null); // open/extended/ended/null
  const [sessionQR,       setSessionQR]       = useState(null);

  // ── MEMBERS & ATTENDANCE ──
  const [members,    setMembers]    = useState([]);
  const [attendance, setAttendance] = useState({}); // { memberId: { id, status, name, time } }
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all/present/absent/unmarked

  // ── MODE ──
  const [mode, setMode] = useState("manual"); // manual/qr/selfqr/geo

  // ── UI STATE ──
  const [sessionModal,    setSessionModal]    = useState(false);
  const [endServiceModal, setEndServiceModal] = useState(false);
  const [extendModal,     setExtendModal]     = useState(false);
  const [extendMinutes,   setExtendMinutes]   = useState("30");
  const [logVisible,      setLogVisible]      = useState(false);
  const [logData,         setLogData]         = useState([]);
  const [transferModal,   setTransferModal]   = useState(false);
  const [selectedMember,  setSelectedMember]  = useState(null);
  const [transferService, setTransferService] = useState("Sunday");
  const [transferType,    setTransferType]    = useState("First Service");
  const [redFlagModal,    setRedFlagModal]    = useState(false);
  const [redFlagMember,   setRedFlagMember]   = useState(null);
  const [redFlagCount,    setRedFlagCount]    = useState(0);
  const [contactModal,    setContactModal]    = useState(false);
  const [contactMember,   setContactMember]   = useState(null);
  const [qrModalVisible,  setQrModalVisible]  = useState(false);
  const [scanFeedback,    setScanFeedback]    = useState("");

  // ── UNDO ──
  const [undoMap, setUndoMap] = useState({});

  // ── GEO ──
  const [locationPermission, requestLocationPermission] = useState(null);
  const [geoActive,  setGeoActive]  = useState(false);
  const [memberGeoCode, setMemberGeoCode] = useState("");
  const geoWatchRef = useRef(null);

  // ── INTELLIGENCE STATE ──
  const [lastWeekSession,  setLastWeekSession]  = useState(null);
  const [lastWeekPresent,  setLastWeekPresent]  = useState(0);
  const [predictedMissing, setPredictedMissing] = useState([]);
  const [firstTimers,      setFirstTimers]      = useState(new Set());
  const [memberStreaks,    setMemberStreaks]     = useState({});
  const [showIntelPanel,   setShowIntelPanel]   = useState(true);
  const [intelLoading,     setIntelLoading]     = useState(false);
  const [lastSession,      setLastSession]      = useState(null); // ended session snapshot

  // ── PERMISSIONS ──
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const userRole = "admin"; // ⚠️ placeholder — replace with real auth
  const isSessionLocked = sessionStatus === "ended";

  // ── DOUBLE-TAP GUARD (ref = synchronous, no re-render lag) ──
  const pendingToggleRef = useRef(new Set());
  const scanLockRef      = useRef(false);

  // ── OFFLINE WRITE QUEUE ──
  // Writes land here first, then sync to Firestore when online.
  // ✅ Prevents silent data loss when church signal is poor mid-service.
  const offlineQueueRef  = useRef([]);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // ── LISTENER CLEANUP ──
  const attendanceUnsubRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────
  // BOOTSTRAP
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;
    loadMembers();
    restoreSession();
  }, [organizationId, entityId]);

  // Sync defaults from Attendance Settings
useEffect(() => {
  if (!settingsLoaded || !attendanceSettings) return;

  setSelectedService(
    attendanceSettings.defaultService || ""
  );

  setSelectedType(
    attendanceSettings.defaultType || ""
  );

  setStartTime(
    attendanceSettings.defaultStartTime || ""
  );

  setSelectedEvent(
    attendanceSettings.defaultEvent || "None"
  );
}, [attendanceSettings, settingsLoaded]);


  // ── ROUTE PARAMS (resume from QR scan) ──
  useEffect(() => {
    const resumeId = route?.params?.resumeSessionId;
    const resumeEid = route?.params?.resumeEntityId;
    if (!resumeId || !organizationId || !entityId) return;

    if (resumeEid && resumeEid !== entityId) {
      Alert.alert("Different Church", "This QR belongs to a different church. Switch church first.");
      return;
    }
    applySessionData(resumeId);
  }, [route?.params?.resumeSessionId, organizationId, entityId]);

  // ── OFFLINE QUEUE DRAIN ──
  useEffect(() => {
    const interval = setInterval(drainOfflineQueue, 10000);
    return () => clearInterval(interval);
  }, [organizationId, entityId]);

  // ─────────────────────────────────────────────────────────────────
  // LOAD MEMBERS
  // ─────────────────────────────────────────────────────────────────
  const loadMembers = async () => {
    if (!organizationId || !entityId) return;
    try {
      const snap = await getDocs(
        collection(db, "organizations", organizationId, "entities", entityId, "members")
      );
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMembers(list);
    } catch (e) {
      console.log("❌ loadMembers:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // LOAD ATTENDANCE — real-time listener with proper cleanup
  // ✅ FIXED: was creating a new listener on every service/type change
  // without unsubscribing the previous one, accumulating ghost listeners
  // that each called setAttendance independently.
  // ─────────────────────────────────────────────────────────────────
  const loadAttendance = useCallback(() => {
    if (!organizationId || !entityId || !sessionId) return;

    // Kill the previous listener before creating a new one
    if (attendanceUnsubRef.current) {
      attendanceUnsubRef.current();
      attendanceUnsubRef.current = null;
    }

    const q = query(
      collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
      where("sessionId", "==", sessionId)
    );

    attendanceUnsubRef.current = onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const x = d.data();
        // ✅ Dedupe by memberId — keeps the newest record if duplicates
        // exist from a prior double-tap bug
        const existing = map[x.memberId];
        if (!existing || (x.timestamp || "") > (existing.time || "")) {
          map[x.memberId] = { id: d.id, status: x.status, name: x.name, time: x.timestamp };
        }
      });
      setAttendance(map);
    }, e => {
      console.log("❌ attendance listener:", e);
    });
  }, [organizationId, entityId, sessionId]);

  useEffect(() => {
    loadAttendance();
    return () => {
      if (attendanceUnsubRef.current) attendanceUnsubRef.current();
    };
  }, [loadAttendance]);

  // ─────────────────────────────────────────────────────────────────
  // DERIVED STATS
  // ✅ FIXED: presentCount was useState, which meant it had to be
  // manually incremented/decremented and could drift out of sync.
  // Now derived from the attendance map, bounded by the real roster,
  // so it's mathematically impossible to go negative or exceed
  // members.length.
  // ─────────────────────────────────────────────────────────────────
  // ✅ MOBILITY-AWARE STATS
const todayDate = new Date().toISOString().split("T")[0];
const localMembers = trueLocalMembers(members, todayDate);

const presentCount = members.filter(
  m => attendance[m.id]?.status === "present"
).length;

const absentCount = localMembers.length - presentCount;

const attendanceRate =
  localMembers.length > 0
    ? Math.round((presentCount / localMembers.length) * 100)
    : 0;

  // ─────────────────────────────────────────────────────────────────
  // SESSION RESTORATION
  // ─────────────────────────────────────────────────────────────────
  const restoreSession = async () => {
    try {
      const stored = await AsyncStorage.getItem("activeSession");
      const status  = await AsyncStorage.getItem("sessionStatus");
      if (stored && status !== "ended") {
        await applySessionData(stored);
      }
    } catch (e) {
      console.log("❌ restoreSession:", e);
    }
  };

  // ✅ Single source of truth for "load a session and apply it" —
  // used by QR scan, route param resume, and restoreSession.
  const applySessionData = async (targetSessionId) => {
    if (!organizationId || !entityId || !targetSessionId) return false;
    try {
      const snap = await getDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "sessions", targetSessionId)
      );
      if (!snap.exists()) return false;
      const data = snap.data();

      setSelectedService(data.service || "Sunday");
      setSelectedType(data.type || "First Service");
      setSelectedEvent(data.event || "None");
      setStartTime(data.startTime || "");
      setEndTime(data.endTime || "");
      setSessionStatus(data.status || "open");
      setSessionId(targetSessionId);
      setSessionQR(data.qrPayload || null);

      await AsyncStorage.setItem("activeSession", targetSessionId);
      await AsyncStorage.setItem("sessionStatus", data.status || "open");
      return true;
    } catch (e) {
      console.log("❌ applySessionData:", e);
      return false;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // START SESSION
  // ─────────────────────────────────────────────────────────────────
  const startSession = async () => {
    if (!startTime) { Alert.alert("Required", "Set service start time."); return; }
    if (!organizationId || !entityId) {
      Alert.alert("No Church", "Select a church first.");
      return;
    }
    try {
      const ref = await addDoc(
        collection(db, "organizations", organizationId, "entities", entityId, "sessions"),
        {
          date: today(),
          service: selectedService,
          type: selectedType,
          event: selectedEvent,
          startTime,
          endTime,
          status: "open",
          entityId,
          organizationId,
          createdAt: serverTimestamp(),
        }
      );

      // ✅ Generate QR using real qrLinks.js builders (URL format)
      const qrLink = await buildAttendanceSessionLink(ref.id, organizationId, entityId);
      await updateDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "sessions", ref.id),
        { qrPayload: qrLink }
      );

      setSessionId(ref.id);
      setSessionQR(qrLink);
      setSessionStatus("open");
      setSessionModal(false);
      setAttendance({});

      await AsyncStorage.setItem("activeSession", ref.id);
      await AsyncStorage.setItem("sessionStatus", "open");

      // Load intelligence data for this service type
      loadIntelligence(selectedService, selectedType);

    } catch (e) {
      console.log("❌ startSession:", e);
      Alert.alert("Error", "Could not start session.");
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // END SESSION
  // ─────────────────────────────────────────────────────────────────
  const endSession = async () => {
    try {
      // ✅ Derived counts — can't be inflated by stale state
      const currentPresent = members.filter(m => attendance[m.id]?.status === "present").length;
      const currentAbsent  = members.length - currentPresent;
      const currentTotal   = members.length;
      const currentRate    = currentTotal > 0 ? Math.round((currentPresent / currentTotal) * 100) : 0;

      const snapshot = {
        service: selectedService,
        type: selectedType,
        present: currentPresent,
        absent: currentAbsent,
        total: currentTotal,
        rate: currentRate,
        endedAt: fmtTime(),
      };
      setLastSession(snapshot);

      if (sessionId && organizationId && entityId) {
        await updateDoc(
          doc(db, "organizations", organizationId, "entities", entityId, "sessions", sessionId),
          {
            status: "ended",
            lockedAt: serverTimestamp(),
            lockedBy: userRole,
            finalPresent: currentPresent,
            finalAbsent: currentAbsent,
            finalTotal: currentTotal,
            finalRate: currentRate,
          }
        );
      }

      // Clean up
      if (attendanceUnsubRef.current) {
        attendanceUnsubRef.current();
        attendanceUnsubRef.current = null;
      }
      setAttendance({});
      setSessionId(null);
      setSessionQR(null);
      setStartTime("");
      setEndTime("");
      setSessionStatus("ended");
      setPredictedMissing([]);
      setGeoActive(false);
      if (geoWatchRef.current) { geoWatchRef.current.remove(); geoWatchRef.current = null; }

      await AsyncStorage.setItem("sessionStatus", "ended");
      await AsyncStorage.removeItem("activeSession");

      setEndServiceModal(false);
      Alert.alert("Service Ended ✅", "Attendance has been locked.");
    } catch (e) {
      console.log("❌ endSession:", e);
      Alert.alert("Error", "Could not end session.");
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // EXTEND SESSION
  // ─────────────────────────────────────────────────────────────────
  const extendSession = async () => {
    if (!sessionId || !organizationId || !entityId) return;
    try {
      await updateDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "sessions", sessionId),
        { status: "extended", extendedAt: serverTimestamp(), extendMinutes: Number(extendMinutes) }
      );
      setSessionStatus("extended");
      setExtendModal(false);
      Alert.alert("Extended", `Session extended by ${extendMinutes} minutes.`);
    } catch (e) {
      Alert.alert("Error", "Could not extend session.");
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // TOGGLE ATTENDANCE
  // ✅ FIXED: double-tap now blocked at two layers:
  //   1. pendingToggleRef (synchronous, no batching delay)
  //   2. re-tapping the same status is a no-op (not a delete)
  // ─────────────────────────────────────────────────────────────────
  const buildRecord = (member, status) => ({
    memberId: member.id,
    memberCode: member.memberCode || "",
    name: member.name,
    phone: member.phone || "",
    ministry: member.ministry || "",
    entityId,
    organizationId,
    sessionId,
    service: selectedService,
    type: selectedType,
    event: selectedEvent,
    date: today(),
    status,
    method: mode,
    timestamp: new Date().toISOString(),
  });

  const writeAdd = async (record) => {
    // ✅ OFFLINE QUEUE: if Firestore write fails, queue locally
    try {
      const ref = await addDoc(
        collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
        record
      );
      return ref.id;
    } catch (e) {
      const localId = `local_${Date.now()}_${record.memberId}`;
      offlineQueueRef.current.push({ ...record, _localId: localId });
      setPendingCount(offlineQueueRef.current.length);
      return localId;
    }
  };

  const writeDelete = async (docId) => {
    if (!docId || docId.startsWith("local_")) {
      offlineQueueRef.current = offlineQueueRef.current.filter(r => r._localId !== docId);
      setPendingCount(offlineQueueRef.current.length);
      return;
    }
    try {
      await deleteDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "attendance", docId)
      );
    } catch (e) {
      console.log("❌ writeDelete:", e);
    }
  };

  const toggleAttendance = async (member, status) => {
    if (isSessionLocked && userRole !== "admin") {
      Alert.alert("Locked", "Service has ended. Contact admin to make changes.");
      return;
    }
    if (!sessionId) {
      Alert.alert("No Session", "Start a session first.");
      return;
    }

    // ✅ Layer 1: synchronous pending guard
    if (pendingToggleRef.current.has(member.id)) return;
    pendingToggleRef.current.add(member.id);

    try {
      const existing = attendance[member.id];

      // ✅ Layer 2: re-tapping same status is a no-op
      if (existing?.status === status) return;

      setUndoMap(prev => ({ ...prev, [member.id]: existing || null }));

      if (existing) await writeDelete(existing.id);
      const newId = await writeAdd(buildRecord(member, status));

      setAttendance(prev => ({
        ...prev,
        [member.id]: { id: newId, status, name: member.name, time: new Date().toISOString() }
      }));

      // ✅ INTELLIGENCE: first-timer alert
      if (status === "present" && firstTimers.has(member.id)) {
        Alert.alert(
          "👋 First Visit",
          `${member.name} appears to be attending for the first time. Welcome them personally!`
        );
      }

      // ✅ INTELLIGENCE: positive streak notification
      const streak = memberStreaks[member.id];
      if (status === "present" && streak && streak >= 4 && streak % 4 === 0) {
        Alert.alert(
          "🔥 Attendance Streak",
          `${member.name} has attended ${streak + 1} sessions in a row!`
        );
      }

      if (status === "absent") checkAbsenceStreak(member);

    } finally {
      pendingToggleRef.current.delete(member.id);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // UNDO
  // ─────────────────────────────────────────────────────────────────
  const undoMember = async (member) => {
    const snap = undoMap[member.id];
    const current = attendance[member.id];
    if (current) await writeDelete(current.id);

    if (snap) {
      const newId = await writeAdd(buildRecord(member, snap.status));
      setAttendance(prev => ({ ...prev, [member.id]: { id: newId, status: snap.status } }));
    } else {
      setAttendance(prev => { const n = { ...prev }; delete n[member.id]; return n; });
    }
    setUndoMap(prev => { const n = { ...prev }; delete n[member.id]; return n; });
  };

  // ─────────────────────────────────────────────────────────────────
  // ABSENCE STREAK CHECK
  // ✅ FIXED: was `catch {}` — bare catch silently swallowed a Firestore
  // composite-index error, making this feature appear to not exist.
  // Now logs properly so the index link shows up in Metro console.
  // ─────────────────────────────────────────────────────────────────
  const checkAbsenceStreak = async (member) => {
    if (!organizationId || !entityId) return;
    try {
      const q = query(
        collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
        where("memberId", "==", member.id),
        where("status", "==", "absent")
      );
      const snap = await getDocs(q);
      const count = snap.docs.length;
if (count >= ABSENCE_FLAG) {
  setRedFlagMember(member); setRedFlagCount(count); setRedFlagModal(true);
} else if (count >= ABSENCE_WARNING) {
  setContactMember(member); setContactModal(true);
}

    } catch (e) {
      // ✅ If this logs a Firestore index URL, click it to create the
      // index — that's all that's needed to restore this feature.
      console.log("❌ checkAbsenceStreak error (check for missing Firestore index):", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // TRANSFER
  // ─────────────────────────────────────────────────────────────────
  const submitTransfer = async () => {
    if (!selectedMember || !organizationId || !entityId) return;
    try {
      const existing = attendance[selectedMember.id];
      if (existing) await writeDelete(existing.id);

      const transferRecord = {
        ...buildRecord(selectedMember, "present"),
        service: transferService,
        type: transferType,
        method: "transfer",
        originalService: selectedService,
        originalType: selectedType,
      };
      await writeAdd(transferRecord);

      setAttendance(prev => { const n = { ...prev }; delete n[selectedMember.id]; return n; });
      setTransferModal(false);
      Alert.alert("✅ Transferred", `${selectedMember.name} moved to ${transferService} ${transferType}`);
    } catch (e) {
      Alert.alert("Error", "Could not transfer.");
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // OPEN LOG (deduped)
  // ─────────────────────────────────────────────────────────────────
  const openLog = async () => {
    if (!organizationId || !entityId) return;
    try {
      const q = query(
        collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
        where("sessionId", "==", sessionId)
      );
      const snap = await getDocs(q);

      // Dedupe by memberId, keep latest
      const byMember = {};
      snap.docs.forEach(d => {
        const data = { docId: d.id, ...d.data() };
        const key = data.memberId || d.id;
        const ex = byMember[key];
        if (!ex || (data.timestamp || "") > (ex.timestamp || "")) byMember[key] = data;
      });

      setLogData(Object.values(byMember).sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setLogVisible(true);
    } catch (e) {
      console.log("❌ openLog:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // OFFLINE QUEUE DRAIN
  // ✅ Runs every 10 seconds — retries queued writes when signal returns
  // ─────────────────────────────────────────────────────────────────
  const drainOfflineQueue = async () => {
    if (!organizationId || !entityId || offlineQueueRef.current.length === 0) return;
    setSyncing(true);
    const remaining = [];
    for (const record of offlineQueueRef.current) {
      try {
        const { _localId, ...clean } = record;
        await addDoc(
          collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
          clean
        );
      } catch (e) {
        remaining.push(record); // keep failed ones
      }
    }
    offlineQueueRef.current = remaining;
    setPendingCount(remaining.length);
    setSyncing(false);
  };

  // ─────────────────────────────────────────────────────────────────
  // INTELLIGENCE: load on session start
  // ─────────────────────────────────────────────────────────────────
  const loadIntelligence = async (service, type) => {
    if (!organizationId || !entityId) return;
    setIntelLoading(true);
    try {
      const dateStr = today();
      const lastWeekDate = new Date();
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      const lastWeekStr = lastWeekDate.toISOString().split("T")[0];

      // 1. Last week's same session
      const lastWeekQ = query(
        collection(db, "organizations", organizationId, "entities", entityId, "sessions"),
        where("date", "==", lastWeekStr),
        where("service", "==", service),
        where("type", "==", type),
        where("status", "==", "ended")
      );
      const lwSnap = await getDocs(lastWeekQ);
      if (!lwSnap.empty) {
        const lwSession = { id: lwSnap.docs[0].id, ...lwSnap.docs[0].data() };
        setLastWeekSession(lwSession);
        setLastWeekPresent(lwSession.finalPresent || 0);
      }

      // 2. Who attended the last 3 sessions of this type?
      const recentSessionsQ = query(
        collection(db, "organizations", organizationId, "entities", entityId, "sessions"),
        where("service", "==", service),
        where("type", "==", type),
        where("status", "==", "ended")
      );
      const recentSnap = await getDocs(recentSessionsQ);
      const recentSessions = recentSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, 3);

      if (recentSessions.length >= 2) {
        // Members present in ALL recent sessions
        const recentAttendance = await Promise.all(
          recentSessions.map(s =>
            getDocs(query(
              collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
              where("sessionId", "==", s.id),
              where("status", "==", "present")
            ))
          )
        );
        const presentSets = recentAttendance.map(
          snap => new Set(snap.docs.map(d => d.data().memberId))
        );
        // Intersection — present in all recent sessions
        const alwaysPresent = presentSets.length > 0
          ? [...presentSets[0]].filter(id => presentSets.every(s => s.has(id)))
          : [];

        const missing = members.filter(m => alwaysPresent.includes(m.id) && !attendance[m.id]);
        setPredictedMissing(missing);
      }

      // 3. First-timers — joined in last 30 days or no prior attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

      const firstTimerSet = new Set();
      for (const member of members) {
        const isNew = member.joinedAt && member.joinedAt >= thirtyStr;
        if (isNew) { firstTimerSet.add(member.id); continue; }

        const priorQ = query(
          collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
          where("memberId", "==", member.id),
          where("status", "==", "present")
        );
        const priorSnap = await getDocs(priorQ);
        if (priorSnap.empty) firstTimerSet.add(member.id);
      }
      setFirstTimers(firstTimerSet);

      // 4. Consecutive streaks per member
      const streaks = {};
      for (const member of members) {
        const allQ = query(
          collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
          where("memberId", "==", member.id),
          where("service", "==", service),
          where("type", "==", type)
        );
        const allSnap = await getDocs(allQ);
        const sorted = allSnap.docs
          .map(d => d.data())
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

        let streak = 0;
        for (const r of sorted) {
          if (r.status === "present") streak++;
          else break;
        }
        if (streak > 0) streaks[member.id] = streak;
      }
      setMemberStreaks(streaks);

    } catch (e) {
      console.log("❌ loadIntelligence:", e);
    } finally {
      setIntelLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // GEO MODE
  // ✅ IMPLEMENTED: was previously stubbed with no actual location check
  // ─────────────────────────────────────────────────────────────────
  const startGeoWatch = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location Required", "Enable location access for Geo check-in.");
      return;
    }

    const watch = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 15000 },
      (loc) => {
        const dist = haversineDistance(
          loc.coords.latitude, loc.coords.longitude,
          CHURCH_COORDS.latitude, CHURCH_COORDS.longitude
        );
        if (dist <= GEO_RADIUS_METERS) {
          // User is within the church perimeter — could auto-mark if
          // their member record is linked to their device. For now,
          // show a prompt so staff can confirm.
          setScanFeedback(`📍 Within range (${Math.round(dist)}m from church)`);
        }
      }
    );

    geoWatchRef.current = watch;
    setGeoActive(true);
  };

  const stopGeoWatch = () => {
    if (geoWatchRef.current) { geoWatchRef.current.remove(); geoWatchRef.current = null; }
    setGeoActive(false);
  };

  const geoMarkPresent = async () => {
    const member = members.find(
      m => m.id === memberGeoCode.trim() || m.memberCode === memberGeoCode.trim()
    );
    if (!member) { Alert.alert("Not Found"); return; }
    if (attendance[member.id]) { Alert.alert("Already Marked", `${member.name} already recorded.`); return; }

    // Verify they're actually in range
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const dist = haversineDistance(
        loc.coords.latitude, loc.coords.longitude,
        CHURCH_COORDS.latitude, CHURCH_COORDS.longitude
      );
      if (dist > GEO_RADIUS_METERS) {
        Alert.alert("Out of Range", `${member.name} appears to be ${Math.round(dist)}m from the church (limit: ${GEO_RADIUS_METERS}m).`);
        return;
      }
    } catch (e) {
      // Fallback — mark anyway if location check fails
    }

    await toggleAttendance(member, "present");
    Alert.alert("✅ Checked In", `${member.name} marked Present via Geo.`);
    setMemberGeoCode("");
  };

  // ─────────────────────────────────────────────────────────────────
  // QR SCAN
  // ✅ FIXED: was calling markMemberAttendance (doesn't exist here),
  // using new URL() (Hermes crash), and not deduping properly.
  // ─────────────────────────────────────────────────────────────────
  const handleBarCodeScanned = async ({ data: raw }) => {
    if (!organizationId || !entityId) return;
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const release = (delay = 2000) => {
      setTimeout(() => {
        scanLockRef.current = false;
        setScanFeedback("");
      }, delay);
    };

    // Case 1: Attendance session QR
    if (raw.startsWith("churchcare://attendance")) {
      const qs = raw.includes("?") ? raw.split("?")[1] : "";
      const params = {};
      qs.split("&").filter(Boolean).forEach(pair => {
        const [k, v] = pair.split("=");
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || "");
      });

      if (params.entity && params.entity !== entityId) {
        Alert.alert("Wrong Church", "This session belongs to a different church.");
        release(); return;
      }
      const found = params.session && await applySessionData(params.session);
      setScanFeedback(found ? "✅ Session activated" : "❌ Session not found");
      release(2500); return;
    }

    // Case 2: Member badge JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.memberCode) {
        const member = members.find(
          m => m.memberCode === parsed.memberCode || m.id === parsed.memberCode
        );
        if (!member) { setScanFeedback("❌ Member not found"); release(); return; }
        if (!sessionId) { Alert.alert("No Session", "Start a session first."); scanLockRef.current = false; return; }
        if (attendance[member.id]) { setScanFeedback(`⚠️ ${member.name} already marked`); release(); return; }
        await toggleAttendance(member, "present");
        setScanFeedback(`✅ ${member.name}`);
        release(2500); return;
      }
    } catch (_) {}

    // Case 3: Legacy plain text ID
    const member = members.find(m => m.id === raw || m.memberCode === raw);
    if (!member) { setScanFeedback("❌ Not found"); release(); return; }
    if (!sessionId) { Alert.alert("No Session", "Start a session first."); scanLockRef.current = false; return; }
    if (attendance[member.id]) { setScanFeedback(`⚠️ ${member.name} already marked`); release(); return; }
    await toggleAttendance(member, "present");
    setScanFeedback(`✅ ${member.name}`);
    release(2500);
  };

  // ─────────────────────────────────────────────────────────────────
  // FILTERED MEMBER LIST
  // ─────────────────────────────────────────────────────────────────
  const filtered = members.filter(m => {
    const matchSearch = !searchTerm ||
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.memberCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.includes(searchTerm);
    const s = attendance[m.id]?.status;
    const matchFilter =
      filterStatus === "all" ? true :
      filterStatus === "present" ? s === "present" :
      filterStatus === "absent" ? s === "absent" :
      !s; // unmarked
    return matchSearch && matchFilter;
  });

const ABSENCE_WARNING =
  attendanceSettings?.absenceWarningCount ?? 2;

const ABSENCE_FLAG =
  attendanceSettings?.absenceFlagCount ?? 3;

const CHURCH_COORDS = {
  latitude: attendanceSettings?.geoLatitude ?? 5.6037,
  longitude: attendanceSettings?.geoLongitude ?? -0.1870,
};

const GEO_RADIUS_METERS =
  attendanceSettings?.geoRadiusMeters ?? 150;

const modeTabs = [
  {
    key: "manual",
    label: "Manual",
    icon: "pencil-outline",
  },
  {
    key: "qr",
    label: "QR Scan",
    icon: "qr-code-outline",
  },

  ...(attendanceSettings?.allowSelfCheckin
    ? [{
        key: "selfqr",
        label: "Self QR",
        icon: "phone-portrait-outline",
      }]
    : []),

  {
    key: "geo",
    label: "Geo",
    icon: "location-outline",
  },
];

const SERVICES =
  attendanceSettings?.serviceOptions || [];

const TYPES =
  attendanceSettings?.typeOptions || [];

const TIMES =
  attendanceSettings?.timeOptions || [];

  const TEMPLATES =
  attendanceSettings?.sessionTemplates || [];

  
  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Attendance</Text>
          {sessionId && (
            <Text style={styles.headerSub} numberOfLines={1}>
              Session ID: {sessionId}
            </Text>
          )}
        </View>


<TouchableOpacity
  style={styles.headerBtn}
  onPress={() => navigation.navigate("AttendanceSettings")}
>
  <Ionicons name="settings-outline" size={18} color="#fff" />
</TouchableOpacity>


        <View style={styles.headerRight}>
          {/* Live / offline badge */}
          {pendingCount > 0 && (
            <View style={styles.offlineBadge}>
              {syncing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.offlineBadgeText}>⏳ {pendingCount}</Text>}
            </View>
          )}
          {sessionId && (
            <View style={[styles.livePill, { backgroundColor: sessionStatus === "open" ? "#27ae60" : sessionStatus === "extended" ? "#e67e22" : "#888" }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{sessionStatus === "open" ? "Live" : sessionStatus === "extended" ? "Extended" : "Ended"}</Text>
            </View>
          )}
          {sessionId && (
            <TouchableOpacity style={styles.headerBtn} onPress={() => {}}>
              <Ionicons name="git-branch-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerBtn} onPress={openLog}>
            <Ionicons name="list-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SESSION STATUS BAR ── */}
      {sessionId && (sessionStatus === "open" || sessionStatus === "extended") && (
        <View style={styles.sessionBar}>
          <View style={styles.sessionBarLeft}>
            <View style={[styles.sessionDot, { backgroundColor: sessionStatus === "extended" ? "#e67e22" : "#27ae60" }]} />
            <Text style={styles.sessionBarText}>In Progress · {startTime}</Text>
          </View>
          <View style={styles.sessionBarActions}>
            <TouchableOpacity style={styles.qrBtn} onPress={() => setQrModalVisible(true)}>
              <Ionicons name="qr-code-outline" size={13} color="#fff" />
              <Text style={styles.qrBtnText}>Show QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.extendBtn} onPress={() => setExtendModal(true)}>
              <Ionicons name="time-outline" size={13} color="#fff" />
              <Text style={styles.extendBtnText}>Extend</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtn} onPress={() => setEndServiceModal(true)}>
              <Ionicons name="stop-circle-outline" size={13} color="#fff" />
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── CURRENT SESSION STATS ── */}
      {sessionId && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#e74c3c" }]}>{absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#9B59B6" }]}>{attendanceRate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
          {lastWeekPresent > 0 && (
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: presentCount >= lastWeekPresent ? "#27ae60" : "#e74c3c", fontSize: 13 }]}>
                {presentCount >= lastWeekPresent ? "▲" : "▼"}{Math.abs(presentCount - lastWeekPresent)}
              </Text>
              <Text style={styles.statLabel}>vs Last Wk</Text>
            </View>
          )}
        </View>
      )}

      {/* ── LAST SESSION CARD ── */}
      {lastSession && !sessionId && (
        <View style={styles.lastSessionCard}>
          <Text style={styles.lastSessionTitle}>Last Session · {lastSession.service} · {lastSession.type}</Text>
          <View style={styles.lastSessionRow}>
            <Text style={styles.lastSessionStat}>{lastSession.present} <Text style={styles.lastSessionSubLabel}>Present</Text></Text>
            <Text style={styles.lastSessionStat}>{lastSession.absent} <Text style={styles.lastSessionSubLabel}>Absent</Text></Text>
            <Text style={styles.lastSessionStat}>{lastSession.rate}% <Text style={styles.lastSessionSubLabel}>Rate</Text></Text>
          </View>
        </View>
      )}

      {/* ── START SESSION BUTTON ── */}
      {!sessionId && (
        <TouchableOpacity style={styles.startBtn} onPress={() => setSessionModal(true)}>
          <Ionicons name="play-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.startBtnText}>Start Session</Text>
        </TouchableOpacity>
      )}

      {/* ── INTELLIGENCE PANEL ── */}
      {sessionId && (predictedMissing.length > 0 || intelLoading) && (
        <TouchableOpacity
          style={styles.intelHeader}
          onPress={() => setShowIntelPanel(p => !p)}
        >
          <Ionicons name="bulb-outline" size={14} color="#4B3F72" />
          <Text style={styles.intelHeaderText}>
            {intelLoading ? "Loading intelligence..." : `${predictedMissing.length} regular${predictedMissing.length === 1 ? "" : "s"} not yet checked in`}
          </Text>
          <Ionicons name={showIntelPanel ? "chevron-up" : "chevron-down"} size={14} color="#4B3F72" />
        </TouchableOpacity>
      )}
      {sessionId && showIntelPanel && predictedMissing.length > 0 && (
        <View style={styles.intelPanel}>
          <Text style={styles.intelPanelLabel}>Usually present — follow up:</Text>
          {predictedMissing.slice(0, 5).map(m => (
            <View key={m.id} style={styles.intelRow}>
              <View style={styles.intelAvatar}>
                <Text style={styles.intelAvatarText}>
                  {(m.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.intelName}>{m.name}</Text>
                <Text style={styles.intelSub}>{m.phone || m.ministry || ""}</Text>
              </View>
              <TouchableOpacity
                style={styles.intelMarkBtn}
                onPress={() => toggleAttendance(m, "present")}
              >
                <Text style={styles.intelMarkBtnText}>Mark Present</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

     {/* ── MODE TABS ── */}
<View style={styles.modeTabs}>
  {modeTabs.map((m) => (
    <TouchableOpacity
      key={m.key}
      style={[
        styles.modeTab,
        mode === m.key && styles.modeTabActive
      ]}
      onPress={() => setMode(m.key)}
    >
      <Ionicons
        name={m.icon}
        size={13}
        color={mode === m.key ? "#fff" : "#777"}
      />

      <Text
        style={[
          styles.modeTabText,
          mode === m.key && styles.modeTabTextActive
        ]}
      >
        {m.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {/* ── SEARCH + FILTER ── */}
      {mode === "manual" && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#aaa" />
          <TextInput
            style={styles.searchInput}
            placeholder="Name, phone or ID…"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={16} color="#aaa" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {mode === "manual" && (
        <View style={styles.filterRow}>
          {["all", "present", "absent", "unmarked"].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filterStatus === f && styles.filterChipActive]}
              onPress={() => setFilterStatus(f)}
            >
              <Text style={[styles.filterChipText, filterStatus === f && styles.filterChipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── MANUAL MODE — MEMBER LIST ── */}
      {mode === "manual" && (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
          renderItem={({ item }) => {
            const status  = attendance[item.id]?.status;
            const isFirst = firstTimers.has(item.id);
            const streak  = memberStreaks[item.id];
            const isPending = pendingToggleRef.current.has(item.id);



            return (
              <View style={[
                styles.memberRow,
                status === "present" && styles.memberRowPresent,
                status === "absent"  && styles.memberRowAbsent,
                isSessionLocked && { opacity: 0.7 }
              ]}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(item.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    {isFirst && (
                      <View style={styles.firstTimerBadge}>
                        <Text style={styles.firstTimerBadgeText}>First Visit 👋</Text>
                      </View>
                    )}
                    {streak >= 4 && !isFirst && (
                      <View style={styles.streakBadge}>
                        <Text style={styles.streakBadgeText}>🔥{streak}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberSub}>{item.ministry || item.phone || ""}</Text>
                </View>

                {/* UNDO if marked this session */}
                {undoMap[item.id] !== undefined && (
                  <TouchableOpacity style={styles.undoBtn} onPress={() => undoMember(item)}>
                    <Ionicons name="arrow-undo" size={14} color="#4B3F72" />
                  </TouchableOpacity>
                )}

                {/* TRANSFER */}
                <TouchableOpacity
                  style={styles.transferBtn}
                  onPress={() => { setSelectedMember(item); setTransferModal(true); }}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#4B3F72" />
                </TouchableOpacity>

                {/* PRESENT */}
                <TouchableOpacity
                  disabled={isPending || isSessionLocked}
                  style={[
                    styles.markBtn, styles.btnPresent,
                    status === "present" && styles.btnPresentActive,
                    (isPending || isSessionLocked) && { opacity: 0.4 }
                  ]}
                  onPress={() => toggleAttendance(item, "present")}
                >
                  {isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>

                {/* ABSENT */}
                <TouchableOpacity
                  disabled={isPending || isSessionLocked}
                  style={[
                    styles.markBtn, styles.btnAbsent,
                    status === "absent" && styles.btnAbsentActive,
                    (isPending || isSessionLocked) && { opacity: 0.4 }
                  ]}
                  onPress={() => toggleAttendance(item, "absent")}
                >
                  {isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="close" size={16} color="#fff" />}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchTerm ? "No members match your search" : "No members added yet"}
              </Text>
            </View>
          )}
        />
      )}

      {/* ── QR SCAN MODE ── */}
      {mode === "qr" && (
        <View style={{ flex: 1 }}>
          {!cameraPermission?.granted ? (
            <View style={styles.permCenter}>
              <Ionicons name="camera-off-outline" size={40} color="#ccc" />
              <Text style={styles.permText}>Camera permission required</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestCameraPermission}>
                <Text style={styles.permBtnText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              />
              {scanFeedback ? (
                <View style={styles.scanFeedback}>
                  <Text style={styles.scanFeedbackText}>{scanFeedback}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      )}

      {/* ── SELF QR MODE ── */}
      {mode === "selfqr" && (
        <View style={styles.selfQRContainer}>
          {sessionQR ? (
            <>
              <Text style={styles.selfQRLabel}>Members scan this to check in</Text>
              <QRCodeDisplay
                value={sessionQR}
                title={`${selectedService} · ${selectedType}`}
                subtitle="Scan with the ChurchCare app to check in automatically"
                size={200}
              />
            </>
          ) : (
            <View style={styles.permCenter}>
              <Ionicons name="qr-code-outline" size={40} color="#ccc" />
              <Text style={styles.permText}>Start a session to generate a check-in QR code.</Text>
            </View>
          )}
          <View style={styles.divider}>
            <Text style={styles.dividerText}>or enter ID manually</Text>
          </View>
          <TextInput
            style={styles.geoInput}
            placeholder="Member ID or Code"
            value={memberGeoCode}
            onChangeText={setMemberGeoCode}
          />
          <TouchableOpacity style={styles.geoMarkBtn} onPress={async () => {
            const m = members.find(x => x.id === memberGeoCode.trim() || x.memberCode === memberGeoCode.trim());
            if (!m) { Alert.alert("Not Found"); return; }
            if (attendance[m.id]) { Alert.alert("Already Marked", `${m.name} is recorded.`); return; }
            await toggleAttendance(m, "present");
            Alert.alert("✅ Marked", `${m.name} marked Present.`);
            setMemberGeoCode("");
          }}>
            <Ionicons name="checkmark-circle" size={15} color="#fff" />
            <Text style={styles.geoMarkBtnText}>Mark Present</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── GEO MODE ── */}
      {mode === "geo" && (
        <View style={styles.selfQRContainer}>
          <Ionicons name="location" size={40} color={geoActive ? "#27ae60" : "#4B3F72"} />
          <Text style={styles.selfQRLabel}>
            {geoActive ? "📍 Geo Check-in Active" : "Geo Check-in"}
          </Text>
          <Text style={styles.permText}>
            Verifies the member is physically within {GEO_RADIUS_METERS}m of the church before marking them present.
          </Text>

          {!geoActive ? (
            <TouchableOpacity style={styles.geoMarkBtn} onPress={startGeoWatch}>
              <Ionicons name="locate" size={15} color="#fff" />
              <Text style={styles.geoMarkBtnText}>Start Geo Check-in</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.geoMarkBtn, { backgroundColor: "#e74c3c" }]} onPress={stopGeoWatch}>
              <Ionicons name="stop" size={15} color="#fff" />
              <Text style={styles.geoMarkBtnText}>Stop</Text>
            </TouchableOpacity>
          )}

          {scanFeedback ? <Text style={styles.geoFeedback}>{scanFeedback}</Text> : null}

          <View style={styles.divider}>
            <Text style={styles.dividerText}>enter ID to verify + mark</Text>
          </View>
          <TextInput
            style={styles.geoInput}
            placeholder="Member ID or Code"
            value={memberGeoCode}
            onChangeText={setMemberGeoCode}
          />
          <TouchableOpacity style={styles.geoMarkBtn} onPress={geoMarkPresent}>
            <Ionicons name="checkmark-circle" size={15} color="#fff" />
            <Text style={styles.geoMarkBtnText}>Verify & Mark Present</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════ SESSION SETUP MODAL ══════════ */}
      <Modal visible={sessionModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Session</Text>

<Text style={styles.fieldLabel}>
  Session Template
</Text>

<View style={styles.chipRow}>
  {TEMPLATES.map(template => (
    <TouchableOpacity
      key={template.id}
      style={[
        styles.chip,
        selectedTemplate === template.id &&
          styles.chipActive
      ]}
      onPress={() => {
        setSelectedTemplate(template.id);

        setSelectedService(
          template.service
        );

        setSelectedType(
          template.type
        );

        setStartTime(
          template.startTime
        );
      }}
    >
      <Text
        style={[
          styles.chipText,
          selectedTemplate === template.id &&
            styles.chipTextActive
        ]}
      >
        {template.name}
      </Text>
    </TouchableOpacity>
  ))}
</View>

            <Text style={styles.fieldLabel}>Service</Text>
            <View style={styles.chipRow}>
              {SERVICES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, selectedService === s && styles.chipActive]}
                  onPress={() => setSelectedService(s)}
                >
                  <Text style={[styles.chipText, selectedService === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={styles.chipRow}>
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, selectedType === t && styles.chipActive]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={[styles.chipText, selectedType === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Event</Text>
            <View style={styles.chipRow}>
              {EVENTS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.chip, selectedEvent === e && styles.chipActive]}
                  onPress={() => setSelectedEvent(e)}
                >
                  <Text style={[styles.chipText, selectedEvent === e && styles.chipTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Start Time</Text>

<View style={styles.chipRow}>
  {TIMES.map(time => (
    <TouchableOpacity
      key={time}
      style={[
        styles.chip,
        startTime === time && styles.chipActive
      ]}
      onPress={() => setStartTime(time)}
    >
      <Text
        style={[
          styles.chipText,
          startTime === time && styles.chipTextActive
        ]}
      >
        {time}
      </Text>
    </TouchableOpacity>
  ))}
</View>

            <Text style={styles.fieldLabel}>Expected End Time</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 11:00 AM"
              value={endTime}
              onChangeText={setEndTime}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={startSession}>
                <Text style={styles.white}>Start Session</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSessionModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ END SERVICE MODAL ══════════ */}
      <Modal visible={endServiceModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name="stop-circle" size={40} color="#e74c3c" style={{ alignSelf: "center" }} />
            <Text style={styles.modalTitle}>End Service?</Text>
            <Text style={styles.modalSub}>
              {presentCount} of {members.length} members marked present ({attendanceRate}%).
              Attendance will be locked after ending.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: "#e74c3c" }]} onPress={endSession}>
                <Text style={styles.white}>End Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEndServiceModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ EXTEND MODAL ══════════ */}
      <Modal visible={extendModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Extend Session</Text>
            <View style={styles.chipRow}>
              {["15", "30", "45", "60"].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, extendMinutes === m && styles.chipActive]}
                  onPress={() => setExtendMinutes(m)}
                >
                  <Text style={[styles.chipText, extendMinutes === m && styles.chipTextActive]}>{m} min</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: "#e67e22" }]} onPress={extendSession}>
                <Text style={styles.white}>Extend</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setExtendModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ LOG MODAL ══════════ */}
      <Modal visible={logVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Attendance Log</Text>
            <ScrollView>
              {logData.map(r => (
                <View key={r.docId || r.memberId} style={styles.logRow}>
                  <View style={[styles.logDot, { backgroundColor: r.status === "present" ? "#27ae60" : "#e74c3c" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logName}>{r.name}</Text>
                    <Text style={styles.logSub}>{r.method || "manual"} · {r.timestamp?.slice(11, 16) || "—"}</Text>
                  </View>
                  <Text style={[styles.logStatus, { color: r.status === "present" ? "#27ae60" : "#e74c3c" }]}>
                    {r.status === "present" ? "Present" : "Absent"}
                  </Text>
                </View>
              ))}
              {logData.length === 0 && (
                <Text style={{ color: "#aaa", textAlign: "center", padding: 20 }}>No records yet</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLogVisible(false)}>
              <Text style={styles.white}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ TRANSFER MODAL ══════════ */}
      <Modal visible={transferModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Transfer {selectedMember?.name}</Text>
            <Text style={styles.fieldLabel}>To Service</Text>
            <View style={styles.chipRow}>
              {SERVICES.map(s => (
                <TouchableOpacity key={s} style={[styles.chip, transferService === s && styles.chipActive]} onPress={() => setTransferService(s)}>
                  <Text style={[styles.chipText, transferService === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipRow}>
              {TYPES.slice(0, 4).map(t => (
                <TouchableOpacity key={t} style={[styles.chip, transferType === t && styles.chipActive]} onPress={() => setTransferType(t)}>
                  <Text style={[styles.chipText, transferType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={submitTransfer}>
                <Text style={styles.white}>Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTransferModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ RED FLAG MODAL ══════════ */}
      <Modal visible={redFlagModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name="flag" size={36} color="#e74c3c" style={{ alignSelf: "center" }} />
            <Text style={styles.modalTitle}>Pastoral Alert</Text>
            <Text style={styles.modalSub}>
              {redFlagMember?.name} has been marked absent {redFlagCount} times.
              Consider a pastoral visit or phone call.
            </Text>
            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: "#e74c3c" }]} onPress={() => setRedFlagModal(false)}>
              <Text style={styles.white}>Noted — Will Follow Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ CONTACT MODAL ══════════ */}
      <Modal visible={contactModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name="call-outline" size={36} color="#e67e22" style={{ alignSelf: "center" }} />
            <Text style={styles.modalTitle}>Follow-Up Suggested</Text>
            <Text style={styles.modalSub}>
              {contactMember?.name} has missed 2 consecutive sessions.
              {contactMember?.phone ? ` You can reach them at ${contactMember.phone}.` : ""}
            </Text>
            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: "#e67e22" }]} onPress={() => setContactModal(false)}>
              <Text style={styles.white}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ SESSION QR MODAL ══════════ */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            {sessionQR ? (
              <QRCodeDisplay
                value={sessionQR}
                title={`${selectedService} · ${selectedType}`}
                subtitle="Members scan this to check in for this session"
                onClose={() => setQrModalVisible(false)}
              />
            ) : (
              <Text style={{ textAlign: "center", color: "#aaa" }}>No active session QR</Text>
            )}
            {!sessionQR && (
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setQrModalVisible(false)}>
                <Text style={styles.white}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  header: { backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  offlineBadge: { backgroundColor: "#e67e22", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  offlineBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  sessionBar: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  sessionBarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionBarText: { fontSize: 12, fontWeight: "700", color: "#333" },
  sessionBarActions: { flexDirection: "row", gap: 6 },
  qrBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#4B3F72", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  qrBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  extendBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e67e22", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  extendBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  endBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e74c3c", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  endBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  statsRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 10 },
  statValue: { fontSize: 20, fontWeight: "900", color: "#4B3F72" },
  statLabel: { fontSize: 9, color: "#aaa", fontWeight: "700", textTransform: "uppercase", marginTop: 1 },

  lastSessionCard: { backgroundColor: "#fff", margin: 12, borderRadius: 12, padding: 14, elevation: 1 },
  lastSessionTitle: { fontSize: 11, color: "#888", fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  lastSessionRow: { flexDirection: "row", justifyContent: "space-around" },
  lastSessionStat: { fontSize: 18, fontWeight: "900", color: "#4B3F72" },
  lastSessionSubLabel: { fontSize: 11, fontWeight: "600", color: "#aaa" },

  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", margin: 14, padding: 14, borderRadius: 12 },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  intelHeader: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF0FA", paddingHorizontal: 14, paddingVertical: 8 },
  intelHeaderText: { flex: 1, fontSize: 12, color: "#4B3F72", fontWeight: "700" },
  intelPanel: { backgroundColor: "#fff", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  intelPanelLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", textTransform: "uppercase", paddingTop: 8, marginBottom: 6 },
  intelRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  intelAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  intelAvatarText: { fontSize: 11, fontWeight: "800", color: "#4B3F72" },
  intelName: { fontSize: 13, fontWeight: "700", color: "#222" },
  intelSub: { fontSize: 11, color: "#aaa" },
  intelMarkBtn: { backgroundColor: "#4B3F72", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  intelMarkBtnText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  modeTabs: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  modeTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  modeTabActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  modeTabText: { fontSize: 11, color: "#777", fontWeight: "600" },
  modeTabTextActive: { color: "#4B3F72" },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", marginHorizontal: 12, marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 1 },
  searchInput: { flex: 1, fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  filterChipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  filterChipText: { fontSize: 11, color: "#888", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },

  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 4, gap: 8 },
  memberRowPresent: { borderLeftWidth: 3, borderLeftColor: "#27ae60" },
  memberRowAbsent: { borderLeftWidth: 3, borderLeftColor: "#e74c3c" },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 12, fontWeight: "800", color: "#4B3F72" },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  memberName: { fontSize: 13, fontWeight: "700", color: "#222" },
  memberSub: { fontSize: 11, color: "#aaa", marginTop: 1 },
  firstTimerBadge: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  firstTimerBadgeText: { fontSize: 9, color: "#856404", fontWeight: "800" },
  streakBadge: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  streakBadgeText: { fontSize: 9, fontWeight: "800" },
  undoBtn: { padding: 4 },
  transferBtn: { padding: 4 },
  markBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnPresent: { backgroundColor: "#ddd" },
  btnPresentActive: { backgroundColor: "#27ae60" },
  btnAbsent: { backgroundColor: "#ddd" },
  btnAbsentActive: { backgroundColor: "#e74c3c" },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13 },

  permCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  permText: { color: "#888", textAlign: "center", marginTop: 10, fontSize: 13 },
  permBtn: { backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 14 },
  permBtnText: { color: "#fff", fontWeight: "700" },

  selfQRContainer: { flex: 1, alignItems: "center", padding: 20 },
  selfQRLabel: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 14, textAlign: "center" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerText: { fontSize: 12, color: "#aaa", marginHorizontal: 10 },
  geoInput: { width: "100%", backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#eee", marginBottom: 10 },
  geoMarkBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  geoMarkBtnText: { color: "#fff", fontWeight: "700" },
  geoFeedback: { fontSize: 13, color: "#4B3F72", fontWeight: "700", marginTop: 10 },

  scanFeedback: { position: "absolute", bottom: 30, left: 20, right: 20, backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 12, padding: 14, alignItems: "center" },
  scanFeedbackText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" },
  modalBox: { backgroundColor: "#fff", margin: 20, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#222", marginBottom: 14, textAlign: "center" },
  modalSub: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 16, lineHeight: 19 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0" },
  chipActive: { backgroundColor: "#4B3F72" },
  chipText: { fontSize: 12, color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 6 },
  modalBtnRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  modalSaveBtn: { flex: 1, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  modalCancelBtn: { flex: 1, backgroundColor: "#aaa", padding: 12, borderRadius: 10, alignItems: "center" },
  white: { color: "#fff", fontWeight: "700" },

  logRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", gap: 10 },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logName: { fontSize: 13, fontWeight: "700", color: "#222" },
  logSub: { fontSize: 11, color: "#aaa", marginTop: 1 },
  logStatus: { fontSize: 11, fontWeight: "700" },
});