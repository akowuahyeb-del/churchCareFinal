import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Linking, Alert,
  Platform, ActivityIndicator,  StatusBar,
  Dimensions
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CameraView, Camera } from "expo-camera";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";



import { db } from "../firebase";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, writeBatch, serverTimestamp, updateDoc
} from "firebase/firestore";

const { width: SCREEN_W } = Dimensions.get("window");
const OFFLINE_KEY = "offline_attendance_queue";

const CHURCH_GEOFENCE = { latitude: 5.6037, longitude: -0.1870, radiusMetres: 200 };

const METHODS = [
  { id: "manual", label: "Manual",  icon: "pencil-outline"         },
  { id: "qr",     label: "QR Scan", icon: "qr-code-outline"        },
  { id: "selfqr", label: "Self QR", icon: "phone-portrait-outline"  },
  { id: "geo",    label: "Geo",     icon: "location-outline"        },
];

// ── Service session stored in Firestore "sessions" collection ──────────────
// session doc: { date, service, type, event, churchId, startTime, endTime,
//               status: "open"|"ended"|"extended", lockedAt, lockedBy }

export default function AttendanceScreen({ navigation, route }) {

  const userRole = "admin"; // replace with auth context
  const { churchId, churchName } = route.params || {};
  /* ── MODE ── */
  const [mode, setMode] = useState("manual");

  /* ── NETWORK ── */
  const [isOnline,   setIsOnline]   = useState(true);
  const [syncQueue,  setSyncQueue]  = useState([]);
  const [syncing,    setSyncing]    = useState(false);

  /* ── CAMERA / GEO ── */
  const [permission,    setPermission]    = useState(false);
  const [scanned,       setScanned]       = useState(false);
  const [scanFeedback,  setScanFeedback]  = useState("");
  const [locationPerm,  setLocationPerm]  = useState(false);
  const [geoStatus,     setGeoStatus]     = useState("");
  const [memberGeoCode, setMemberGeoCode] = useState("");

  /* ── DATE ── */
  const [dateObj,     setDateObj]     = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const today = dateObj.toISOString().split("T")[0];

  /* ── SESSION (service time tracking) ── */
  const [sessionId,       setSessionId]       = useState(null);
  const [sessionStatus,   setSessionStatus]   = useState("open");   // open|ended|extended
  const [startTime,       setStartTime]       = useState("");       // "09:00"
  const [endTime,         setEndTime]         = useState("");       // "11:00"
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);
  const [startTimeObj,    setStartTimeObj]    = useState(new Date());
  const [endTimeObj,      setEndTimeObj]      = useState(new Date());
  const [sessionModal,    setSessionModal]    = useState(false);    // setup modal
  const [endServiceModal, setEndServiceModal] = useState(false);
  const [extendModal,     setExtendModal]     = useState(false);
  const [unlockModal,     setUnlockModal]     = useState(false);
  const [adminPin,        setAdminPin]        = useState("");
  const ADMIN_PIN = "1234";

  /* ── CHURCH ── */
  const [selectedChurch] = useState(churchId || "church_1");


  /* ── SERVICES / TYPES / EVENTS ── */
  const [services,        setServices]        = useState(["Sunday", "Wednesday", "Friday"]);
  const [types,           setTypes]           = useState(["First", "Second", "Third"]);
  const [events,          setEvents]          = useState(["General Service", "Youth Service", "Bible Study"]);
  const [selectedService, setSelectedService] = useState("Sunday");
  const [selectedType,    setSelectedType]    = useState("First");
  const [selectedEvent,   setSelectedEvent]   = useState("General Service");
  const [showServiceDD,   setShowServiceDD]   = useState(false);
  const [showTypeDD,      setShowTypeDD]      = useState(false);
  const [showEventDD,     setShowEventDD]     = useState(false);

  /* ── MANAGE MODAL ── */
  const [manageModal,   setManageModal]   = useState(false);
  const [manageType,    setManageType]    = useState("");
  const [manageInput,   setManageInput]   = useState("");
  const [manageEditIdx, setManageEditIdx] = useState(null);

  /* ── MEMBERS ── */
  const [members,      setMembers]      = useState([]);
  const [attendance,   setAttendance]   = useState({});
  const [presentCount, setPresentCount] = useState(0);
  const [undoMap,      setUndoMap]      = useState({});

  /* ── SEARCH & FILTER ── */
  const [searchText,      setSearchText]      = useState("");
  const [filterMinistry,  setFilterMinistry]  = useState("All");
  const [filterStatus,    setFilterStatus]    = useState("All"); // All|present|absent|unmarked
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  /* ── RECORDS PANEL ── */
  const [recordsVisible, setRecordsVisible] = useState(false);

  /* ── CONTACT / RED FLAG ── */
  const [contactModal,   setContactModal]   = useState(false);
  const [contactMember,  setContactMember]  = useState(null);
  const [redFlagModal,   setRedFlagModal]   = useState(false);
  const [redFlagMember,  setRedFlagMember]  = useState(null);
  const [redFlagCount,   setRedFlagCount]   = useState(0);

  /* ── LOG ── */
  const [logVisible, setLogVisible] = useState(false);
  const [logData,    setLogData]    = useState([]);

  /* ══════════ INIT ══════════ */
  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setIsOnline(s.isConnected && s.isInternetReachable));
    return () => unsub();
  }, []);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => setPermission(status === "granted"));
    Location.requestForegroundPermissionsAsync().then(({ status }) => setLocationPerm(status === "granted"));
    loadOfflineQueue();
  }, []);
/*tEMP USEeFFECT*/
  useEffect(() => {
  fixOldMembers();
}, []);

  useEffect(() => { if (isOnline && syncQueue.length > 0) syncOfflineQueue(); }, [isOnline]);
  useEffect(() => { loadMembers(); }, [selectedChurch]);
  useEffect(() => { loadAttendance(); }, [dateObj, selectedService, selectedType, selectedChurch]);

  /* ══════════ OFFLINE ══════════ */
  const loadOfflineQueue = async () => {
    try { const r = await AsyncStorage.getItem(OFFLINE_KEY); if (r) setSyncQueue(JSON.parse(r)); } catch (_) {}
  };
  const saveOfflineQueue = async (q) => {
    try { await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(q)); setSyncQueue(q); } catch (_) {}
  };
  const syncOfflineQueue = async () => {
    if (syncing || syncQueue.length === 0) return;
    setSyncing(true);
    try {
      const batch = writeBatch(db);
      syncQueue.forEach(item => {
        if (item.action === "add") {
          const r = doc(collection(db, "attendance"));
          batch.set(r, { ...item.data, syncedAt: serverTimestamp() });
        } else if (item.action === "delete" && item.docId) {
          batch.delete(doc(db, "attendance", item.docId));
        }
      });
      await batch.commit();
      await saveOfflineQueue([]);
      Alert.alert("Synced ✅", `${syncQueue.length} record(s) synced.`);
      loadAttendance();
    } catch (e) { Alert.alert("Sync failed", "Will retry when online."); }
    finally { setSyncing(false); }
  };

  /* ══════════ DATA ══════════ */
  const loadMembers = async () => {
    try {
      const q    = query(collection(db, "members"), where("churchId", "==", selectedChurch));
      const snap = await getDocs(q);
      let data = snap.docs.map(d => {
  const member = { id: d.id, ...d.data() };

  // ✅ Auto-assign missing churchId (non-destructive)
  if (!member.churchId) {
    member.churchId = "church_1";
  }

  return member;
});
      
      setMembers(data);
    } catch (e) { console.log(e); }
  };

  const loadAttendance = async () => {
    if (!isOnline) return;
    try {
      const q    = query(collection(db, "attendance"), where("visitingChurchId", "==", selectedChurch));
      const snap = await getDocs(q);
      let map = {}; let present = 0;
      snap.docs.forEach(d => {
        const x = d.data();
        if (x.date === today && x.service === selectedService && x.type === selectedType) {
          map[x.memberId] = { id: d.id, status: x.status, name: x.name, time: x.timestamp };
          if (x.status === "present") present++;
        }
      });
      setAttendance(map);
      setPresentCount(present);
    } catch (e) { console.log(e); }
  };

/* Test functions*/
const fixOldMembers = async () => {
  try {
    const snap = await getDocs(collection(db, "members"));

    const batch = writeBatch(db);

    snap.docs.forEach(d => {
      const data = d.data();

      // ✅ Only update records WITHOUT churchId
      if (!data.churchId) {
        batch.update(doc(db, "members", d.id), {
          churchId: "church_1"
        });
      }
    });

    await batch.commit();

    Alert.alert("✅ Fixed", "All old members assigned to Main Branch");

    loadMembers();
  } catch (e) {
    console.log(e);
  }
};
/* End test fucntion*/


  /* ══════════ SESSION MANAGEMENT ══════════ */
  const fmt12 = (d) => {
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isSessionLocked = sessionStatus === "ended";

  const startSession = () => {
    if (!startTime) { Alert.alert("Required", "Service start time is required."); return; }
    setSessionStatus("open");
    setSessionModal(false);
    // Persist session to Firestore
    addDoc(collection(db, "sessions"), {
      date: today, service: selectedService, type: selectedType, event: selectedEvent,
      churchId: selectedChurch, startTime, endTime, status: "open",
      createdAt: serverTimestamp()
    }).then(ref => setSessionId(ref.id)).catch(console.log);
  };

  const endSession = async () => {
    setSessionStatus("ended");
    setEndServiceModal(false);
    if (sessionId) {
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "ended", lockedAt: serverTimestamp(), lockedBy: userRole
      }).catch(console.log);
    }
    Alert.alert("Service Ended", "Attendance is now locked. Admin can unlock if needed.");
  };

  const extendSession = async () => {
    setSessionStatus("extended");
    setExtendModal(false);
    if (sessionId) {
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "extended", extendedAt: serverTimestamp()
      }).catch(console.log);
    }
  };

  const unlockSession = () => {
    if (adminPin !== ADMIN_PIN) { Alert.alert("Wrong PIN", "Incorrect admin PIN."); return; }
    setSessionStatus("open");
    setAdminPin("");
    setUnlockModal(false);
    Alert.alert("Unlocked", "Attendance is now editable again.");
  };

  /* ══════════ ATTENDANCE WRITE ══════════ */
  const buildRecord = (member, status) => ({
    memberId:         member.id,
    name:             member.name,
    phone:            member.phone || "",
    ministry:         member.ministry || "",
    memberCode:       member.memberCode || "",
    homeChurchId:     member.churchId || selectedChurch,
    visitingChurchId: selectedChurch,
    service:          selectedService,
    type:             selectedType,
    event:            selectedEvent,
    date:             today,
    status,
    method:           mode,
    timestamp:        new Date().toISOString(),
    sessionId:        sessionId || null,
  });

  const writeAdd = async (data) => {
    if (isOnline) {
      try { const r = await addDoc(collection(db, "attendance"), data); return r.id; } catch (_) {}
    }
    const tempId = `offline_${Date.now()}`;
    await saveOfflineQueue([...syncQueue, { action: "add", data, tempId }]);
    return tempId;
  };

  const writeDelete = async (docId) => {
    if (!docId || docId.startsWith("offline_")) {
      await saveOfflineQueue(syncQueue.filter(q => q.tempId !== docId)); return;
    }
    if (isOnline) { try { await deleteDoc(doc(db, "attendance", docId)); return; } catch (_) {} }
    await saveOfflineQueue([...syncQueue, { action: "delete", docId }]);
  };

  const toggleAttendance = async (member, status) => {
    if (isSessionLocked && userRole !== "admin") {
      Alert.alert("Locked", "Service has ended. Contact admin to make changes."); return;
    }
    const existing = attendance[member.id];
    setUndoMap(prev => ({ ...prev, [member.id]: { prevRecord: existing ? { ...existing } : null } }));
    const record = buildRecord(member, status);

    if (existing && existing.status === status) {
      await writeDelete(existing.id);
      setAttendance(prev => { const n = { ...prev }; delete n[member.id]; return n; });
      setPresentCount(p => status === "present" ? p - 1 : p);
    } else {
      if (existing) await writeDelete(existing.id);
      const newId = await writeAdd(record);
      setAttendance(prev => ({ ...prev, [member.id]: { id: newId, status, name: member.name, time: new Date().toISOString() } }));
      setPresentCount(p => {
        if (!existing && status === "present") return p + 1;
        if (existing?.status === "present" && status === "absent") return p - 1;
        if (existing?.status === "absent"  && status === "present") return p + 1;
        return p;
      });
      if (status === "absent") checkAbsenceStreak(member);
    }
  };

  const undoMember = async (member) => {
    const snap = undoMap[member.id];
    if (!snap) return;
    const current = attendance[member.id];
    if (current) await writeDelete(current.id);
    if (snap.prevRecord) {
      const record = buildRecord(member, snap.prevRecord.status);
      const newId = await writeAdd(record);
      setAttendance(prev => ({ ...prev, [member.id]: { id: newId, status: snap.prevRecord.status } }));
      setPresentCount(p => {
        if (current?.status === "present" && snap.prevRecord.status === "absent") return p - 1;
        if (current?.status === "absent"  && snap.prevRecord.status === "present") return p + 1;
        return p;
      });
    } else {
      setAttendance(prev => { const n = { ...prev }; delete n[member.id]; return n; });
      if (current?.status === "present") setPresentCount(p => p - 1);
    }
    setUndoMap(prev => { const n = { ...prev }; delete n[member.id]; return n; });
  };

  /* ══════════ ABSENCE CHECK ══════════ */
  const checkAbsenceStreak = async (member) => {
    try {
      const q = query(collection(db, "attendance"), where("memberId","==",member.id), where("status","==","absent"));
      const snap = await getDocs(q);
      const count = snap.docs.length;
      if (count >= 3) { setRedFlagMember(member); setRedFlagCount(count); setRedFlagModal(true); }
      else if (count >= 2) { setContactMember(member); setContactModal(true); }
    } catch (_) {}
  };


  /* ══════════ CONTACT ══════════ */
  const sendSMS = (m) => Linking.openURL(`sms:${m.phone||""}?body=${encodeURIComponent(`Hi ${m.name}, we missed you at ${selectedService} service.`)}`);
  const sendWhatsApp = (m) => Linking.openURL(`https://wa.me/${(m.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(`Hi ${m.name}, we missed you at ${selectedService} service.`)}`);
  const callMember = (m) => Linking.openURL(`tel:${m.phone||""}`);

  /* ══════════ GEO ══════════ */
  const getDistance = (la1, lo1, la2, lo2) => {
    const R = 6371000, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
    const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const handleGeoAttendance = async () => {
    if (!locationPerm) { Alert.alert("Permission needed"); return; }
    if (!memberGeoCode.trim()) { Alert.alert("Member ID required"); return; }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const dist = getDistance(loc.coords.latitude, loc.coords.longitude, CHURCH_GEOFENCE.latitude, CHURCH_GEOFENCE.longitude);
      if (dist > CHURCH_GEOFENCE.radiusMetres) {
        setGeoStatus("outside");
        Alert.alert("Not at church", `You are ${Math.round(dist)}m away. Must be within ${CHURCH_GEOFENCE.radiusMetres}m.`);
        return;
      }
      setGeoStatus("inside");
      const member = members.find(m => m.id === memberGeoCode.trim() || m.memberCode === memberGeoCode.trim());
      if (!member) { Alert.alert("Not found", "No member with that ID."); return; }
      if (attendance[member.id]) { Alert.alert("Already marked", `${member.name} already recorded.`); return; }
      await toggleAttendance(member, "present");
      Alert.alert("✅ Recorded", `${member.name} marked Present.`);
      setMemberGeoCode("");
    } catch (e) { Alert.alert("Location error", "Could not get your location."); }
  };

  /* ══════════ QR ══════════ */
  const handleBarCodeScanned = async ({ data: scannedId }) => {
    if (scanned) return;
    setScanned(true);
    const found = members.find(m => m.id === scannedId || m.memberCode === scannedId);
    if (found) {
      if (attendance[found.id]) setScanFeedback(`⚠️ ${found.name} already marked`);
      else { await toggleAttendance(found, "present"); setScanFeedback(`✅ ${found.name} marked Present`); }
    } else setScanFeedback("❌ Member not found");
    setTimeout(() => { setScanned(false); setScanFeedback(""); }, 2500);
  };

  /* ══════════ LOG ══════════ */
  const openLog = async () => {
    try {
      const q = query(collection(db, "attendance"), where("visitingChurchId","==",selectedChurch));
      const snap = await getDocs(q);
      const records = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
        .filter(r => r.date===today && r.service===selectedService && r.type===selectedType)
        .sort((a,b) => (a.name||"").localeCompare(b.name||""));
      setLogData(records); setLogVisible(true);
    } catch (e) { console.log(e); }
  };

  /* ══════════ MANAGE LISTS ══════════ */
  const saveManage = () => {
    if (!manageInput.trim()) return;
    const setter = manageType==="service" ? setServices : manageType==="type" ? setTypes : setEvents;
    const list   = manageType==="service" ? services    : manageType==="type" ? types    : events;
    if (manageEditIdx !== null) { const u=[...list]; u[manageEditIdx]=manageInput; setter(u); }
    else setter([...list, manageInput]);
    setManageModal(false); setManageEditIdx(null); setManageInput("");
  };
  const deleteManage = () => {
    const setter = manageType==="service" ? setServices : manageType==="type" ? setTypes : setEvents;
    const list   = manageType==="service" ? services    : manageType==="type" ? types    : events;
    setter(list.filter((_,i)=>i!==manageEditIdx));
    setManageModal(false); setManageEditIdx(null); setManageInput("");
  };

  /* ══════════ SEARCH & FILTER ══════════ */
  const ministries = ["All", ...new Set(members.map(m => m.ministry).filter(Boolean))];

  // ✅ #4 — Search by name, phone, memberCode + filter by ministry + filter by status
  const filtered = members.filter(m => {
    const q = searchText.toLowerCase().trim();
    const matchSearch = !q
      || (m.name     || "").toLowerCase().includes(q)
      || (m.phone    || "").toLowerCase().includes(q)
      || (m.memberCode || "").toLowerCase().includes(q);
    const matchMin    = filterMinistry === "All" || m.ministry === filterMinistry;
    const attStatus   = attendance[m.id]?.status;
    const matchStatus =
      filterStatus === "All"      ? true :
      filterStatus === "present"  ? attStatus === "present" :
      filterStatus === "absent"   ? attStatus === "absent" :
      filterStatus === "unmarked" ? !attStatus : true;
    return matchSearch && matchMin && matchStatus;
  });

  // Recently marked (last 10, sorted by time desc)
  const recentlyMarked = Object.values(attendance)
    .sort((a, b) => (b.time || "").localeCompare(a.time || ""))
    .slice(0, 10);

  const absentCount   = members.length - presentCount;
  const attendanceRate = members.length > 0 ? Math.round((presentCount / members.length) * 100) : 0;

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <SafeAreaView style={styles.safe}>
  <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

  <View style={{ flex: 1 }}>

    {/* ── HEADER ── */}
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
  {churchName || "Attendance"}
</Text>
          {startTime ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {selectedService} · Started {startTime}{endTime ? ` · Ends ${endTime}` : ""}
              {isSessionLocked ? " · 🔒 Locked" : sessionStatus === "extended" ? " · ⏱ Extended" : ""}
            </Text>
          ) : (
            <Text style={styles.headerSub}>Tap Setup to begin</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {/* Online/Offline */}
          <TouchableOpacity style={[styles.pill, { backgroundColor: isOnline ? "#27ae60" : "#e74c3c" }]}
            onPress={() => setIsOnline(p => !p)}>
            <Ionicons name="wifi-outline" size={11} color="#fff" />
            <Text style={styles.pillText}>{isOnline ? "Live" : "Off"}</Text>
          </TouchableOpacity>
          {/* Sync badge */}
          {syncQueue.length > 0 && (
            <TouchableOpacity style={[styles.pill, { backgroundColor: "#e67e22" }]}
              onPress={syncOfflineQueue} disabled={syncing || !isOnline}>
              {syncing ? <ActivityIndicator size={10} color="#fff" /> : <Ionicons name="sync-outline" size={12} color="#fff" />}
              <Text style={styles.pillText}>{syncQueue.length}</Text>
            </TouchableOpacity>
          )}
          {/* Log */}
          <TouchableOpacity style={styles.iconBtn} onPress={openLog}>
            <Ionicons name="list-outline" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

   <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        
        {/* ── OFFLINE BANNER ── */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={13} color="#fff" />
            <Text style={styles.offlineBannerText} numberOfLines={2}>
              Offline — {syncQueue.length > 0 ? `${syncQueue.length} pending` : "records queued locally"}
            </Text>
          </View>
        )}

        {/* ── SESSION SETUP BAR ── */}
        <View style={styles.sessionBar}>
          {!startTime ? (
            <TouchableOpacity style={styles.setupBtn} onPress={() => setSessionModal(true)}>
              <Ionicons name="play-circle-outline" size={16} color="#fff" />
              <Text style={styles.setupBtnText}>Setup & Start Service</Text>
            </TouchableOpacity>
          ) : isSessionLocked ? (
            <View style={styles.sessionStatusRow}>
              <View style={styles.sessionEndedBadge}>
                <Ionicons name="lock-closed" size={13} color="#e74c3c" />
                <Text style={styles.sessionEndedText}>Service Ended · Locked</Text>
              </View>
              {userRole === "admin" && (
                <TouchableOpacity style={styles.unlockBtn} onPress={() => setUnlockModal(true)}>
                  <Ionicons name="key-outline" size={13} color="#fff" />
                  <Text style={styles.unlockBtnText}>Unlock</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.sessionStatusRow}>
              <View style={styles.sessionOpenBadge}>
                <Ionicons name="radio-button-on" size={11} color="#27ae60" />
                <Text style={styles.sessionOpenText}>
                  {sessionStatus === "extended" ? "Extended" : "In Progress"} · {startTime}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity style={styles.extendBtn} onPress={() => setExtendModal(true)}>
                  <Ionicons name="time-outline" size={13} color="#fff" />
                  <Text style={styles.extendBtnText}>Extend</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.endBtn} onPress={() => setEndServiceModal(true)}>
                  <Ionicons name="stop-circle-outline" size={13} color="#fff" />
                  <Text style={styles.endBtnText}>End Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── DATE ── */}
        <TouchableOpacity style={styles.box} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={14} color="#4B3F72" />
          <Text style={styles.boxText}>{today}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={dateObj} mode="date"
            onChange={(e, d) => { setShowDatePicker(false); if (d) setDateObj(d); }} />
        )}

        {/* ── DROPDOWNS ── */}
        <DropdownRow label="Service" value={selectedService} open={showServiceDD}
          onToggle={() => setShowServiceDD(p=>!p)} items={services}
          onSelect={v=>{setSelectedService(v);setShowServiceDD(false);}}
          onLongPress={(i,v)=>{setManageEditIdx(i);setManageInput(v);setManageType("service");setManageModal(true);}}
          onAdd={()=>{setManageType("service");setManageModal(true);}} />

        <DropdownRow label="Type" value={selectedType} open={showTypeDD}
          onToggle={() => setShowTypeDD(p=>!p)} items={types}
          onSelect={v=>{setSelectedType(v);setShowTypeDD(false);}}
          onLongPress={(i,v)=>{setManageEditIdx(i);setManageInput(v);setManageType("type");setManageModal(true);}}
          onAdd={()=>{setManageType("type");setManageModal(true);}} />

        <DropdownRow label="Event" value={selectedEvent} open={showEventDD}
          onToggle={() => setShowEventDD(p=>!p)} items={events}
          onSelect={v=>{setSelectedEvent(v);setShowEventDD(false);}}
          onLongPress={(i,v)=>{setManageEditIdx(i);setManageInput(v);setManageType("event");setManageModal(true);}}
          onAdd={()=>{setManageType("event");setManageModal(true);}} />

        {/* ── STATS CARDS ── */}
        <View style={styles.statsRow}>
          <StatCard icon="checkmark-circle" label="Present" value={presentCount}      color="#27ae60" bg="#e8f8f0" />
          <StatCard icon="close-circle"     label="Absent"  value={absentCount}        color="#e74c3c" bg="#fce8e8" />
          <StatCard icon="people"           label="Total"   value={members.length}     color="#2980b9" bg="#e8f4fd" />
          <StatCard icon="trending-up"      label="Rate"    value={`${attendanceRate}%`} color="#8e44ad" bg="#f3e8fd" />
        </View>

        {/* ── MODE TABS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}
          contentContainerStyle={{ paddingHorizontal: 2, gap: 8 }}>
          {METHODS.map(m => (
            <TouchableOpacity key={m.id}
              style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]}
              onPress={() => setMode(m.id)}>
              <Ionicons name={m.icon} size={14} color={mode === m.id ? "#fff" : "#555"} />
              <Text style={[styles.modeBtnText, mode === m.id && { color: "#fff" }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>


        {/* ══ MANUAL MODE ══ */}
        {mode === "manual" && (
          <View>
            {/* ── SEARCH + FILTER + RECORDS ── */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={15} color="#aaa" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Name, phone or ID…"
                  placeholderTextColor="#bbb"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <Ionicons name="close-circle" size={15} color="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterPanel(p=>!p)}>
                <Ionicons name="options-outline" size={16} color={showFilterPanel ? "#fff" : "#4B3F72"} />
              </TouchableOpacity>
              {/* ✅ Records quick button */}
              <TouchableOpacity style={[styles.recordsBtn, recordsVisible && styles.recordsBtnActive]}
                onPress={() => setRecordsVisible(p=>!p)}>
                <Ionicons name="flash-outline" size={14} color={recordsVisible ? "#fff" : "#4B3F72"} />
                <Text style={[styles.recordsBtnText, recordsVisible && { color: "#fff" }]}>Records</Text>
              </TouchableOpacity>
            </View>

            {/* ── FILTER PANEL ── */}
            {showFilterPanel && (
              <View style={styles.filterPanel}>
                <Text style={styles.filterLabel}>Ministry</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {ministries.map(min => (
                    <TouchableOpacity key={min}
                      style={[styles.filterChip, filterMinistry===min && styles.filterChipActive]}
                      onPress={() => setFilterMinistry(min)}>
                      <Text style={[styles.filterChipText, filterMinistry===min && { color: "#fff" }]}>{min}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={[styles.filterLabel, { marginTop: 8 }]}>Status</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[["All","apps"],["present","checkmark-circle"],["absent","close-circle"],["unmarked","remove-circle"]].map(([s, icon]) => (
                    <TouchableOpacity key={s}
                      style={[styles.filterChip, filterStatus===s && styles.filterChipActive]}
                      onPress={() => setFilterStatus(s)}>
                      <Ionicons name={icon} size={12} color={filterStatus===s?"#fff":"#555"} />
                      <Text style={[styles.filterChipText, filterStatus===s && { color:"#fff" }, { marginLeft:3 }]}>
                        {s.charAt(0).toUpperCase()+s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.filterResult}>{filtered.length} member{filtered.length!==1?"s":""} shown</Text>
              </View>
            )}

            {/* ── RECORDS PANEL (recent marks) ── */}
            {recordsVisible && (
              <View style={styles.recordsPanel}>
                <View style={styles.recordsPanelHeader}>
                  <Ionicons name="flash" size={14} color="#4B3F72" />
                  <Text style={styles.recordsPanelTitle}>Recently Marked</Text>
                  <Text style={styles.recordsPanelCount}>{recentlyMarked.length}</Text>
                </View>
                {recentlyMarked.length === 0 ? (
                  <Text style={styles.recordsEmpty}>No marks yet for this session</Text>
                ) : (
                  recentlyMarked.map((r, i) => (
                    <View key={r.id || i} style={styles.recordsRow}>
                      <View style={[styles.recordsDot, { backgroundColor: r.status==="present"?"#27ae60":"#e74c3c" }]} />
                      <Text style={styles.recordsName} numberOfLines={1}>{r.name}</Text>
                      <View style={[styles.recordsBadge, { backgroundColor: r.status==="present"?"#e8f8f0":"#fce8e8" }]}>
                        <Text style={[styles.recordsBadgeText, { color: r.status==="present"?"#27ae60":"#e74c3c" }]}>
                          {r.status==="present"?"Present":"Absent"}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── MEMBER LIST ── */}
            {filtered.map(item => {
              const status  = attendance[item.id]?.status;
              const isMarked = !!status;
              const canUndo  = !!undoMap[item.id];

              return (
                <View key={item.id} style={[styles.card, isSessionLocked && styles.cardLocked]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.memberName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {[item.memberCode && `ID: ${item.memberCode}`, item.ministry].filter(Boolean).join("  ·  ")}
                    </Text>
                    {status && (
                      <View style={[styles.statusBadge, { backgroundColor: status==="present"?"#e8f8f0":"#fce8e8" }]}>
                        <Text style={[styles.statusText, { color: status==="present"?"#27ae60":"#e74c3c" }]}>
                          {status==="present" ? "✓ Present" : "✗ Absent"}
                          {attendance[item.id]?.id?.startsWith("offline_") ? " ⏱" : ""}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.btnGroup}>
                    <TouchableOpacity
                      style={[styles.markBtn, status==="present" ? styles.btnPresent : styles.btnPresentOff,
                        isMarked && status!=="present" && styles.btnGreyed]}
                      onPress={() => (!isMarked || status==="present") ? toggleAttendance(item,"present") : null}
                      activeOpacity={isMarked && status!=="present" ? 1 : 0.7}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.markBtn, status==="absent" ? styles.btnAbsent : styles.btnAbsentOff,
                        isMarked && status!=="absent" && styles.btnGreyed]}
                      onPress={() => (!isMarked || status==="absent") ? toggleAttendance(item,"absent") : null}
                      activeOpacity={isMarked && status!=="absent" ? 1 : 0.7}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>

                    {canUndo && (
                      <TouchableOpacity style={styles.btnUndo} onPress={() => undoMember(item)}>
                        <Ionicons name="arrow-undo" size={13} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={36} color="#ddd" />
                <Text style={styles.emptyText}>No members match your search</Text>
              </View>
            )}
          </View>
        )}

        {/* ══ QR SCAN ══ */}
        {mode === "qr" && (
          <View style={styles.qrWrapper}>
            {!permission ? (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="camera-off-outline" size={40} color="#bbb" />
                <Text style={styles.qrPlaceholderText}>Camera permission denied</Text>
              </View>
            ) : (
              <>
                <CameraView style={styles.camera} facing="back"
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
                <View style={styles.qrOverlay}>
                  <View style={styles.qrFrame} />
                </View>
                {scanFeedback ? (
                  <View style={[styles.scanFeedback, {
                    backgroundColor: scanFeedback.startsWith("✅") ? "#27ae60" :
                      scanFeedback.startsWith("⚠️") ? "#e67e22" : "#e74c3c"
                  }]}>
                    <Text style={{ color:"#fff", fontWeight:"700" }} numberOfLines={1}>{scanFeedback}</Text>
                  </View>
                ) : null}
                <Text style={styles.qrHint}>Scan member's QR code</Text>
                {scanned && (
                  <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                    <Ionicons name="scan-outline" size={15} color="#fff" />
                    <Text style={{ color:"#fff", marginLeft:6, fontSize:13, fontWeight:"700" }}>Scan Next</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* ══ SELF QR ══ */}
        {mode === "selfqr" && (
          <View style={styles.infoBox}>
            <Ionicons name="phone-portrait-outline" size={36} color="#4B3F72" />
            <Text style={styles.infoBoxTitle}>Member Self Check-In</Text>
            <Text style={styles.infoBoxDesc}>Members scan the church entrance QR code with their phone.</Text>
            <TextInput style={[styles.input, { marginTop: 12, alignSelf: "stretch" }]}
              placeholder="Or type Member ID / Code"
              value={memberGeoCode} onChangeText={setMemberGeoCode} />
            <TouchableOpacity style={styles.geoBtn} onPress={async () => {
              const member = members.find(m => m.id===memberGeoCode.trim() || m.memberCode===memberGeoCode.trim());
              if (!member) { Alert.alert("Not found"); return; }
              if (attendance[member.id]) { Alert.alert("Already marked", `${member.name} is recorded.`); return; }
              await toggleAttendance(member, "present");
              Alert.alert("✅ Marked", `${member.name} marked Present.`);
              setMemberGeoCode("");
            }}>
              <Ionicons name="checkmark-circle" size={15} color="#fff" />
              <Text style={styles.geoBtnText}>Mark Present</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══ GEO ══ */}
        {mode === "geo" && (
          <View style={styles.infoBox}>
            <Ionicons name="location" size={36} color={geoStatus==="inside"?"#27ae60":geoStatus==="outside"?"#e74c3c":"#4B3F72"} />
            <Text style={styles.infoBoxTitle}>Geofenced Attendance</Text>
            <Text style={styles.infoBoxDesc}>Must be within {CHURCH_GEOFENCE.radiusMetres}m of the church.</Text>
            {!locationPerm && <Text style={styles.geoWarning}>⚠️ Location permission not granted</Text>}
            {geoStatus==="inside"  && <Text style={styles.geoInside}>📍 Inside church boundary</Text>}
            {geoStatus==="outside" && <Text style={styles.geoOutside}>📍 Outside church boundary</Text>}
            <TextInput style={[styles.input, { marginTop:10, alignSelf:"stretch" }]}
              placeholder="Enter Member ID" value={memberGeoCode} onChangeText={setMemberGeoCode} />
            <TouchableOpacity style={styles.geoBtn} onPress={handleGeoAttendance}>
              <Ionicons name="location" size={15} color="#fff" />
              <Text style={styles.geoBtnText}>Verify & Mark Present</Text>
            </TouchableOpacity>
          </View>
        )}
       </ScrollView>   
      </View>

      {/* ══ SESSION SETUP MODAL ══ */}
      <Modal visible={sessionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Setup Service Session</Text>
            <Text style={styles.modalSub}>Service start time is required before marking attendance.</Text>

            <Text style={styles.fieldLabel}>Service Start Time *</Text>
            <TouchableOpacity style={styles.timePicker} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="time-outline" size={16} color="#4B3F72" />
              <Text style={styles.timePickerText}>{startTime || "Tap to set start time"}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker value={startTimeObj} mode="time" display={Platform.OS==="ios"?"spinner":"default"}
                onChange={(e,d) => {
                  setShowStartPicker(false);
                  if (d) { setStartTimeObj(d); setStartTime(fmt12(d)); }
                }} />
            )}

            <Text style={styles.fieldLabel}>Expected End Time (optional)</Text>
            <TouchableOpacity style={styles.timePicker} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="time-outline" size={16} color="#888" />
              <Text style={[styles.timePickerText, { color: endTime?"#333":"#bbb" }]}>{endTime || "Tap to set end time (optional)"}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker value={endTimeObj} mode="time" display={Platform.OS==="ios"?"spinner":"default"}
                onChange={(e,d) => {
                  setShowEndPicker(false);
                  if (d) { setEndTimeObj(d); setEndTime(fmt12(d)); }
                }} />
            )}

            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={startSession}>
              <Ionicons name="play-circle-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Start Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setSessionModal(false)}>
              <Text style={styles.cancelTxtText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ END SERVICE MODAL ══ */}
      <Modal visible={endServiceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="stop-circle" size={40} color="#e74c3c" />
            </View>
            <Text style={styles.modalTitle}>End Service?</Text>
            <Text style={styles.modalSub}>
              Attendance will be locked. Only an admin can unlock it to make further changes.
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#e74c3c", marginTop: 12 }]} onPress={endSession}>
              <Ionicons name="lock-closed-outline" size={15} color="#fff" />
              <Text style={styles.primaryBtnText}>End & Lock Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setEndServiceModal(false)}>
              <Text style={styles.cancelTxtText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ EXTEND SERVICE MODAL ══ */}
      <Modal visible={extendModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="time" size={40} color="#e67e22" />
            </View>
            <Text style={styles.modalTitle}>Extend Service?</Text>
            <Text style={styles.modalSub}>Mark the service as extended. Attendance remains open.</Text>
            <Text style={styles.fieldLabel}>New End Time (optional)</Text>
            <TouchableOpacity style={styles.timePicker} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="time-outline" size={16} color="#888" />
              <Text style={[styles.timePickerText, { color: endTime?"#333":"#bbb" }]}>{endTime || "Update end time"}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker value={endTimeObj} mode="time" display={Platform.OS==="ios"?"spinner":"default"}
                onChange={(e,d) => { setShowEndPicker(false); if (d) { setEndTimeObj(d); setEndTime(fmt12(d)); } }} />
            )}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#e67e22", marginTop: 14 }]} onPress={extendSession}>
              <Ionicons name="time-outline" size={15} color="#fff" />
              <Text style={styles.primaryBtnText}>Confirm Extension</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setExtendModal(false)}>
              <Text style={styles.cancelTxtText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ UNLOCK MODAL ══ */}
      <Modal visible={unlockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="key" size={36} color="#4B3F72" />
            </View>
            <Text style={styles.modalTitle}>Admin Unlock</Text>
            <Text style={styles.modalSub}>Enter your admin PIN to unlock attendance for editing.</Text>
            <TextInput style={[styles.input, { marginTop: 12, textAlign: "center", letterSpacing: 8, fontSize: 18 }]}
              placeholder="PIN" secureTextEntry keyboardType="number-pad"
              value={adminPin} onChangeText={setAdminPin} maxLength={6} />
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={unlockSession}>
              <Ionicons name="lock-open-outline" size={15} color="#fff" />
              <Text style={styles.primaryBtnText}>Unlock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => { setUnlockModal(false); setAdminPin(""); }}>
              <Text style={styles.cancelTxtText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ MANAGE LIST MODAL ══ */}
      <Modal visible={manageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{manageEditIdx!==null?"Edit":"Add"} {manageType}</Text>
            <TextInput style={[styles.input, { marginTop:10 }]} value={manageInput}
              onChangeText={setManageInput} placeholder={`Enter ${manageType} name`} autoFocus />
            <View style={{ flexDirection:"row", gap:8, marginTop:12 }}>
              <TouchableOpacity style={[styles.primaryBtn, { flex:1 }]} onPress={saveManage}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex:1, backgroundColor:"#888" }]}
                onPress={() => { setManageModal(false); setManageEditIdx(null); setManageInput(""); }}>
                <Text style={styles.primaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            {manageEditIdx !== null && (
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor:"#e74c3c", marginTop:8 }]} onPress={deleteManage}>
                <Text style={styles.primaryBtnText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
   
     {/* ══ LOG MODAL ══ */}
<Modal visible={logVisible} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={[styles.modalSheet, { maxHeight: "85%" }]}>
      
      <Text style={styles.modalTitle}>Attendance Log</Text>
      <Text style={styles.modalSub} numberOfLines={1}>
        {selectedService} · {selectedType} · {today}
      </Text>

      <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
        
        {logData.length === 0 ? (
          <Text style={styles.emptyText}>No records for this session.</Text>
        ) : (
          logData.map(r => (
            <View key={r.docId} style={styles.logRow}>
              
              <View style={{ flex:1, minWidth:0 }}>
                <Text style={styles.logName} numberOfLines={1}>
                  {r.name}
                </Text>

                <Text style={styles.logMeta} numberOfLines={1}>
                  {r.method || "manual"}
                  {r.homeChurchId !== r.visitingChurchId ? " · Visitor" : ""}
                  {r.ministry ? ` · ${r.ministry}` : ""}
                </Text>
              </View>

              <View
                style={[
                  styles.logBadge,
                  { backgroundColor: r.status === "present" ? "#e8f8f0" : "#fce8e8" }
                ]}
              >
                <Text
                  style={[
                    styles.logBadgeText,
                    { color: r.status === "present" ? "#27ae60" : "#e74c3c" }
                  ]}
                >
                  {r.status === "present" ? "Present" : "Absent"}
                </Text>
              </View>

            </View>
          ))
        )}

      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop:12, backgroundColor:"#888" }]}
        onPress={() => setLogVisible(false)}
      >
        <Text style={styles.primaryBtnText}>Close</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>
      {/* ══ CONTACT MODAL ══ */}
      <Modal visible={contactModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems:"center", marginBottom:8 }}>
              <Ionicons name="alert-circle" size={36} color="#e67e22" />
            </View>
            <Text style={styles.modalTitle}>Follow-Up Needed</Text>
            <Text style={styles.modalSub} numberOfLines={2}>
              <Text style={{ fontWeight:"700" }}>{contactMember?.name}</Text> has been absent twice.
            </Text>
            <View style={styles.contactRow}>
              {[
                { bg:"#25D366", icon:"logo-whatsapp", label:"WhatsApp", fn:()=>sendWhatsApp(contactMember) },
                { bg:"#2980b9", icon:"chatbubble",    label:"SMS",      fn:()=>sendSMS(contactMember)       },
                { bg:"#8e44ad", icon:"call",          label:"Call",     fn:()=>callMember(contactMember)    },
              ].map(b => (
                <TouchableOpacity key={b.label} style={[styles.contactBtn, { backgroundColor:b.bg }]}
                  onPress={() => { b.fn(); setContactModal(false); }}>
                  <Ionicons name={b.icon} size={18} color="#fff" />
                  <Text style={styles.contactBtnText}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor:"#888", marginTop:8 }]}
              onPress={() => setContactModal(false)}>
              <Text style={styles.primaryBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ RED FLAG MODAL ══ */}
      <Modal visible={redFlagModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems:"center", marginBottom:8 }}>
              <Ionicons name="flag" size={36} color="#e74c3c" />
            </View>
            <Text style={[styles.modalTitle, { color:"#e74c3c" }]}>🚩 Red Flag</Text>
            <Text style={styles.modalSub}>
              <Text style={{ fontWeight:"700" }}>{redFlagMember?.name}</Text> has been absent{" "}
              <Text style={{ fontWeight:"800", color:"#e74c3c" }}>{redFlagCount} times</Text>.
              Immediate pastoral follow-up recommended.
            </Text>
            <View style={styles.contactRow}>
              {[
                { bg:"#25D366", icon:"logo-whatsapp", label:"WhatsApp", fn:()=>sendWhatsApp(redFlagMember) },
                { bg:"#2980b9", icon:"chatbubble",    label:"SMS",      fn:()=>sendSMS(redFlagMember)       },
                { bg:"#8e44ad", icon:"call",          label:"Call",     fn:()=>callMember(redFlagMember)    },
              ].map(b => (
                <TouchableOpacity key={b.label} style={[styles.contactBtn, { backgroundColor:b.bg }]}
                  onPress={() => { b.fn(); setRedFlagModal(false); }}>
                  <Ionicons name={b.icon} size={18} color="#fff" />
                  <Text style={styles.contactBtnText}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor:"#e74c3c", marginTop:8 }]}
              onPress={() => setRedFlagModal(false)}>
              <Text style={styles.primaryBtnText}>Acknowledge & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        </Modal>
</SafeAreaView>
);
}   // ✅ ✅ ✅ ADD THIS LINE
  


/* ── StatCard ─────────────────────────────────────────── */
function StatCard({ icon, label, value, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ── DropdownRow ──────────────────────────────────────── */
function DropdownRow({ label, value, open, onToggle, items, onSelect, onLongPress, onAdd }) {
  return (
    <View style={{ marginBottom: 2 }}>
      <TouchableOpacity style={styles.box} onPress={onToggle}>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color="#4B3F72" style={{ marginRight: 6 }} />
        <Text style={styles.boxLabel}>{label}:</Text>
        <Text style={styles.boxValue} numberOfLines={1}>{value}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {items.map((s, i) => (
            <TouchableOpacity key={i} style={styles.dropdownItem}
              onPress={() => onSelect(s)} onLongPress={() => onLongPress(i, s)}>
              <Text style={styles.dropdownItemText} numberOfLines={1}>{s}</Text>
              <Text style={styles.longPressHint}>hold to edit</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addDropdownBtn} onPress={onAdd}>
            <Ionicons name="add-circle-outline" size={13} color="#4B3F72" />
            <Text style={styles.addDropdownText}> + Add {label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ── STYLES ──────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  /* Header */
header: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#4B3F72",
  paddingHorizontal: 14,
  paddingVertical: 10,
  paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 20) + 10 : 30,
},
backBtn: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(255,255,255,0.15)",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
},
  headerTitle: { color:"#fff", fontSize:16, fontWeight:"800" },
  headerSub: { color:"rgba(255,255,255,0.7)", fontSize:10, marginTop:1 },
  headerActions: { flexDirection:"row", gap:5, alignItems:"center" },
  pill: { flexDirection:"row", alignItems:"center", paddingHorizontal:7, paddingVertical:4, borderRadius:8, gap:3 },
  pillText: { color:"#fff", fontSize:10, fontWeight:"700" },
  iconBtn: { width:30, height:30, alignItems:"center", justifyContent:"center",
    backgroundColor:"rgba(255,255,255,0.15)", borderRadius:8 },

  /* Session bar */
  sessionBar: { backgroundColor:"#fff", padding:10, marginBottom:4,
    borderBottomWidth:1, borderBottomColor:"#eee" },
  setupBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center",
    backgroundColor:"#4B3F72", borderRadius:10, padding:10, gap:6 },
  setupBtnText: { color:"#fff", fontWeight:"700", fontSize:13 },
  sessionStatusRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  sessionOpenBadge: { flexDirection:"row", alignItems:"center", gap:5 },
  sessionOpenText: { fontSize:12, color:"#27ae60", fontWeight:"700" },
  sessionEndedBadge: { flexDirection:"row", alignItems:"center", gap:5 },
  sessionEndedText: { fontSize:12, color:"#e74c3c", fontWeight:"700" },
  endBtn: { flexDirection:"row", alignItems:"center", backgroundColor:"#e74c3c",
    paddingHorizontal:10, paddingVertical:6, borderRadius:8, gap:4 },
  endBtnText: { color:"#fff", fontSize:11, fontWeight:"700" },
  extendBtn: { flexDirection:"row", alignItems:"center", backgroundColor:"#e67e22",
    paddingHorizontal:10, paddingVertical:6, borderRadius:8, gap:4 },
  extendBtnText: { color:"#fff", fontSize:11, fontWeight:"700" },
  unlockBtn: { flexDirection:"row", alignItems:"center", backgroundColor:"#4B3F72",
    paddingHorizontal:10, paddingVertical:6, borderRadius:8, gap:4 },
  unlockBtnText: { color:"#fff", fontSize:11, fontWeight:"700" },

  /* Offline */
  offlineBanner: { flexDirection:"row", alignItems:"center", backgroundColor:"#e74c3c",
    margin:10, marginBottom:4, borderRadius:8, padding:8, gap:6 },
  offlineBannerText: { color:"#fff", fontSize:11, flex:1 },

  /* Date / dropdowns */
  box: { flexDirection:"row", alignItems:"center", backgroundColor:"#fff",
    padding:11, marginVertical:2, marginHorizontal:10, borderRadius:10, elevation:1 },
  boxLabel: { fontSize:13, color:"#888", marginRight:4 },
  boxValue: { fontSize:13, color:"#222", fontWeight:"700", flex:1 },
  dropdownList: { backgroundColor:"#fff", marginHorizontal:10, borderRadius:10,
    paddingVertical:4, paddingHorizontal:14, marginBottom:2, elevation:3 },
  dropdownItem: { flexDirection:"row", justifyContent:"space-between", alignItems:"center",
    paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#f5f5f5" },
  dropdownItemText: { fontSize:13, color:"#333", flex:1 },
  longPressHint: { fontSize:10, color:"#bbb", marginLeft:8 },
  addDropdownBtn: { flexDirection:"row", alignItems:"center", paddingVertical:8 },
  addDropdownText: { color:"#4B3F72", fontSize:12, fontWeight:"600" },

  /* Stats */
  statsRow: { flexDirection:"row", marginHorizontal:10, marginVertical:8, gap:6 },
  statCard: { flex:1, borderRadius:12, padding:10, alignItems:"center",
    borderTopWidth:3, elevation:2 },
  statValue: { fontSize:18, fontWeight:"900", marginTop:3 },
  statLabel: { fontSize:10, color:"#666", marginTop:1, fontWeight:"600" },

  /* Mode tabs */
  modeBtn: { flexDirection:"row", alignItems:"center", backgroundColor:"#e8e8e8",
    paddingHorizontal:12, paddingVertical:8, borderRadius:20, gap:4 },
  modeBtnActive: { backgroundColor:"#4B3F72" },
  modeBtnText: { fontSize:12, color:"#555", fontWeight:"600" },

  /* Search */
  searchRow: { flexDirection:"row", alignItems:"center", marginHorizontal:10, gap:6, marginBottom:6 },
  searchBox: { flex:1, flexDirection:"row", alignItems:"center", backgroundColor:"#fff",
    borderRadius:10, paddingHorizontal:10, paddingVertical:8, elevation:1, gap:6 },
  searchInput: { flex:1, fontSize:13, color:"#222", padding:0 },
  filterBtn: { width:38, height:38, backgroundColor:"#fff", borderRadius:10,
    alignItems:"center", justifyContent:"center", elevation:1 },
  recordsBtn: { flexDirection:"row", alignItems:"center", backgroundColor:"#fff",
    borderRadius:10, paddingHorizontal:10, paddingVertical:8, elevation:1, gap:4,
    borderWidth:1.5, borderColor:"#4B3F72" },
  recordsBtnActive: { backgroundColor:"#4B3F72", borderColor:"#4B3F72" },
  recordsBtnText: { fontSize:11, fontWeight:"700", color:"#4B3F72" },

  /* Filter panel */
  filterPanel: { backgroundColor:"#fff", marginHorizontal:10, borderRadius:12,
    padding:12, marginBottom:6, elevation:1 },
  filterLabel: { fontSize:10, fontWeight:"700", color:"#aaa", textTransform:"uppercase", marginBottom:6 },
  filterChip: { flexDirection:"row", alignItems:"center", paddingHorizontal:10, paddingVertical:5,
    backgroundColor:"#f0f0f0", borderRadius:20, marginRight:6 },
  filterChipActive: { backgroundColor:"#4B3F72" },
  filterChipText: { fontSize:11, color:"#555", fontWeight:"600" },
  filterResult: { fontSize:11, color:"#888", marginTop:8, fontStyle:"italic" },

  /* Records panel */
  recordsPanel: { backgroundColor:"#fff", marginHorizontal:10, borderRadius:12,
    padding:12, marginBottom:8, elevation:1 },
  recordsPanelHeader: { flexDirection:"row", alignItems:"center", gap:6, marginBottom:8 },
  recordsPanelTitle: { fontSize:13, fontWeight:"700", color:"#4B3F72", flex:1 },
  recordsPanelCount: { fontSize:11, color:"#fff", backgroundColor:"#4B3F72",
    borderRadius:10, paddingHorizontal:7, paddingVertical:1, fontWeight:"700" },
  recordsRow: { flexDirection:"row", alignItems:"center", paddingVertical:6,
    borderBottomWidth:1, borderBottomColor:"#f5f5f5", gap:8 },
  recordsDot: { width:8, height:8, borderRadius:4 },
  recordsName: { flex:1, fontSize:13, color:"#222", fontWeight:"600" },
  recordsBadge: { paddingHorizontal:8, paddingVertical:3, borderRadius:12 },
  recordsBadgeText: { fontSize:10, fontWeight:"700" },
  recordsEmpty: { textAlign:"center", color:"#bbb", padding:12, fontSize:12 },

  /* Member card */
  card: { flexDirection:"row", alignItems:"center", backgroundColor:"#fff",
    padding:12, marginVertical:3, marginHorizontal:10, borderRadius:12, elevation:1 },
  cardLocked: { opacity:0.75 },
  memberName: { fontSize:14, fontWeight:"700", color:"#222" },
  memberMeta: { fontSize:11, color:"#888", marginTop:2 },
  statusBadge: { marginTop:4, alignSelf:"flex-start", paddingHorizontal:8, paddingVertical:2, borderRadius:20 },
  statusText: { fontSize:10, fontWeight:"700" },

  btnGroup: { flexDirection:"row", gap:5, alignItems:"center", marginLeft:8 },
  markBtn: { width:36, height:36, borderRadius:10, alignItems:"center", justifyContent:"center" },
  btnPresent: { backgroundColor:"#27ae60" },
  btnPresentOff: { backgroundColor:"#a8d5b8" },
  btnAbsent: { backgroundColor:"#e74c3c" },
  btnAbsentOff: { backgroundColor:"#f0a0a0" },
  btnGreyed: { backgroundColor:"#ddd", opacity:0.5 },
  btnUndo: { width:30, height:30, borderRadius:8, backgroundColor:"#6c47b8",
    alignItems:"center", justifyContent:"center" },

  /* QR */
  qrWrapper: { marginHorizontal:10, borderRadius:16, overflow:"hidden", marginTop:4 },
  camera: { height: Math.min(SCREEN_W - 20, 320), borderRadius:16 },
  qrOverlay: { ...StyleSheet.absoluteFillObject, justifyContent:"center", alignItems:"center" },
  qrFrame: { width:160, height:160, borderWidth:2, borderColor:"#fff", borderRadius:12 },
  qrPlaceholder: { height:200, backgroundColor:"#f0f0f0", borderRadius:16,
    alignItems:"center", justifyContent:"center" },
  qrPlaceholderText: { color:"#aaa", marginTop:10, fontSize:13 },
  qrHint: { textAlign:"center", color:"#888", fontSize:12, marginTop:8, marginHorizontal:10 },
  scanFeedback: { margin:10, padding:10, borderRadius:10, alignItems:"center" },
  rescanBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center",
    backgroundColor:"#4B3F72", padding:10, borderRadius:10, marginTop:8, marginHorizontal:10 },

  /* Info boxes */
  infoBox: { backgroundColor:"#fff", borderRadius:14, padding:20,
    alignItems:"center", marginHorizontal:10, marginTop:6 },
  infoBoxTitle: { fontSize:15, fontWeight:"700", color:"#4B3F72", marginTop:10, textAlign:"center" },
  infoBoxDesc: { fontSize:12, color:"#666", textAlign:"center", marginTop:6, lineHeight:18 },
  geoBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center",
    backgroundColor:"#4B3F72", borderRadius:10, padding:12, marginTop:10, width:"100%", gap:6 },
  geoBtnText: { color:"#fff", fontWeight:"700", fontSize:13 },
  geoWarning: { color:"#e74c3c", fontSize:12, marginTop:8, fontWeight:"600" },
  geoInside:  { color:"#27ae60", fontSize:12, fontWeight:"700", marginTop:8 },
  geoOutside: { color:"#e74c3c", fontSize:12, fontWeight:"700", marginTop:8 },
  input: { backgroundColor:"#f5f5f5", padding:11, borderRadius:10, fontSize:13,
    borderWidth:1.5, borderColor:"#eee", color:"#222" },

  /* Modals */
  modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.55)", justifyContent:"flex-end" },
  modalSheet: { backgroundColor:"#fff", borderTopLeftRadius:20, borderTopRightRadius:20,
    padding:20, paddingBottom:Platform.OS==="ios"?36:24 },
  modalTitle: { fontWeight:"800", fontSize:17, color:"#222", textAlign:"center", marginBottom:4 },
  modalSub: { fontSize:12, color:"#888", textAlign:"center", marginBottom:8, lineHeight:18 },
  fieldLabel: { fontSize:11, fontWeight:"700", color:"#aaa", textTransform:"uppercase",
    marginTop:12, marginBottom:4 },
  timePicker: { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#f5f5f5",
    padding:12, borderRadius:10, borderWidth:1.5, borderColor:"#eee" },
  timePickerText: { fontSize:14, fontWeight:"600", color:"#333", flex:1 },

  primaryBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center",
    backgroundColor:"#4B3F72", borderRadius:12, padding:13, gap:6, marginTop:4 },
  primaryBtnText: { color:"#fff", fontSize:14, fontWeight:"800" },
  cancelTxt: { alignItems:"center", padding:12, marginTop:4 },
  cancelTxtText: { color:"#888", fontSize:13 },

  /* Log */
  logRow: { flexDirection:"row", alignItems:"center", paddingVertical:8,
    borderBottomWidth:1, borderBottomColor:"#f5f5f5", gap:8 },
  logName: { fontSize:13, color:"#222", fontWeight:"600" },
  logMeta: { fontSize:10, color:"#aaa", marginTop:1 },
  logBadge: { paddingHorizontal:10, paddingVertical:3, borderRadius:12 },
  logBadgeText: { fontSize:11, fontWeight:"700" },
  emptyText: { textAlign:"center", color:"#bbb", padding:20, fontSize:13 },
  emptyState: { alignItems:"center", padding:40 },

  /* Contact */
  contactRow: { flexDirection:"row", gap:8, marginTop:8 },
  contactBtn: { flex:1, alignItems:"center", justifyContent:"center",
    paddingVertical:12, borderRadius:10, gap:4 },
  contactBtnText: { color:"#fff", fontSize:11, fontWeight:"700" },
});