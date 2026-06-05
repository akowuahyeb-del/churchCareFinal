import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Linking, Alert,
  Platform, Switch, ActivityIndicator, AppState
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CameraView, Camera } from "expo-camera";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";

import { db } from "../firebase";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, writeBatch, serverTimestamp
} from "firebase/firestore";

// ─── CHURCH GEOFENCE CONFIG ───────────────────────────────────────
// Replace with your actual church coordinates and radius (metres)
const CHURCH_GEOFENCE = {
  latitude:  5.6037,
  longitude: -0.1870,
  radiusMetres: 200,
};

const OFFLINE_KEY = "offline_attendance_queue";

// ─── ATTENDANCE METHODS ──────────────────────────────────────────
const METHODS = [
  { id: "manual",   label: "Manual",   icon: "pencil-outline"    },
  { id: "qr",       label: "QR Scan",  icon: "qr-code-outline"   },
  { id: "selfqr",   label: "Self QR",  icon: "phone-portrait-outline" },
  { id: "geo",      label: "Geo",      icon: "location-outline"  },
];

export default function AttendanceScreen({ navigation }) {

  /* ── ROLE ── */
  const userRole = "admin";

  /* ── MODE ── */
  const [mode, setMode] = useState("manual");

  /* ── ONLINE / OFFLINE ── */
  const [isOnline, setIsOnline]     = useState(true);
  const [syncQueue, setSyncQueue]   = useState([]);
  const [syncing, setSyncing]       = useState(false);

  /* ── CAMERA ── */
  const [permission, setPermission] = useState(false);
  const [scanned, setScanned]       = useState(false);
  const [scanFeedback, setScanFeedback] = useState("");

  /* ── GEO ── */
  const [locationPerm, setLocationPerm] = useState(false);
  const [geoStatus, setGeoStatus]       = useState(""); // "inside"|"outside"|""
  const [memberGeoCode, setMemberGeoCode] = useState(""); // member types their ID

  /* ── DATE ── */
  const [dateObj, setDateObj]   = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const today = dateObj.toISOString().split("T")[0];

  /* ── CHURCH ── */
  const [selectedChurch] = useState("church_1");

  /* ── MEMBERS ── */
  const [members, setMembers]         = useState([]);
  const [searchMember, setSearchMember] = useState("");

  /* ── SERVICES / TYPES / EVENTS ── */
  const [services, setServices] = useState(["Sunday"]);
  const [types,    setTypes]    = useState(["First"]);
  const [events,   setEvents]   = useState(["General Service"]);

  const [selectedService, setSelectedService] = useState("Sunday");
  const [selectedType,    setSelectedType]    = useState("First");
  const [selectedEvent,   setSelectedEvent]   = useState("General Service");

  /* ── DROPDOWNS ── */
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showTypeDropdown,    setShowTypeDropdown]    = useState(false);
  const [showEventDropdown,   setShowEventDropdown]   = useState(false);

  /* ── MANAGE MODAL ── */
  const [modalVisible,  setModalVisible]  = useState(false);
  const [modalType,     setModalType]     = useState("");
  const [inputValue,    setInputValue]    = useState("");
  const [editingIndex,  setEditingIndex]  = useState(null);

  /* ── ATTENDANCE ── */
  const [attendance,    setAttendance]    = useState({});
  const [presentCount,  setPresentCount]  = useState(0);

  /* ── UNDO — per member ── */
  // Map of memberId → { prevRecord }
  const [undoMap, setUndoMap] = useState({});

  /* ── ATTENDANCE LOG ── */
  const [logVisible, setLogVisible] = useState(false);
  const [logData,    setLogData]    = useState([]);

  /* ── CONTACT MODAL ── */
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactMember,       setContactMember]       = useState(null);

  /* ── RED FLAG MODAL ── */
  const [redFlagModal,   setRedFlagModal]   = useState(false);
  const [redFlagMember,  setRedFlagMember]  = useState(null);
  const [redFlagCount,   setRedFlagCount]   = useState(0);

  /* ══════════════ INIT ══════════════ */

  // Network listener
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });
    return () => unsub();
  }, []);

  // Camera permission
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermission(status === "granted");
    })();
  }, []);

  // Location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPerm(status === "granted");
    })();
  }, []);

  // Load offline queue on mount
  useEffect(() => {
    loadOfflineQueue();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  useEffect(() => { loadMembers(); }, []);
  useEffect(() => { loadAttendance(); }, [dateObj, selectedService, selectedType]);

  /* ══════════════ OFFLINE QUEUE ══════════════ */

  const loadOfflineQueue = async () => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_KEY);
      if (raw) setSyncQueue(JSON.parse(raw));
    } catch (e) { console.log(e); }
  };

  const saveOfflineQueue = async (queue) => {
    try {
      await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
      setSyncQueue(queue);
    } catch (e) { console.log(e); }
  };

  const syncOfflineQueue = async () => {
    if (syncing || syncQueue.length === 0) return;
    setSyncing(true);
    try {
      const batch = writeBatch(db);
      for (const item of syncQueue) {
        if (item.action === "add") {
          const ref = doc(collection(db, "attendance"));
          batch.set(ref, { ...item.data, syncedAt: serverTimestamp() });
        } else if (item.action === "delete" && item.docId) {
          batch.delete(doc(db, "attendance", item.docId));
        }
      }
      await batch.commit();
      await saveOfflineQueue([]);
      Alert.alert("Synced ✅", `${syncQueue.length} offline record(s) synced successfully.`);
      loadAttendance();
    } catch (e) {
      Alert.alert("Sync failed", "Could not sync offline records. Will retry when online.");
    } finally {
      setSyncing(false);
    }
  };

  /* ══════════════ DATA LOADING ══════════════ */

  const loadMembers = async () => {
    try {
      const q = query(collection(db, "members"), where("churchId", "==", selectedChurch));
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        const snapAll = await getDocs(collection(db, "members"));
        data = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setMembers(data);
    } catch (e) { console.log(e); }
  };

  const loadAttendance = async () => {
    if (!isOnline) return; // use cached state offline
    try {
      const q = query(collection(db, "attendance"), where("churchId", "==", selectedChurch));
      const snap = await getDocs(q);
      let map = {};
      let present = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.date === today && data.service === selectedService && data.type === selectedType) {
          map[data.memberId] = { id: d.id, status: data.status };
          if (data.status === "present") present++;
        }
      });
      setAttendance(map);
      setPresentCount(present);
    } catch (e) { console.log(e); }
  };

  /* ══════════════ ATTENDANCE RECORD ══════════════ */

  // ✅ #8 — Universal member record: captures visitingChurchId separately from homeChurchId
  const buildRecord = (member, status) => ({
    memberId:         member.id,
    name:             member.name,
    homeChurchId:     member.churchId || selectedChurch,  // member's registered home church
    visitingChurchId: selectedChurch,                      // church they're attending today
    service:          selectedService,
    type:             selectedType,
    event:            selectedEvent,
    date:             today,
    status,
    method:           mode,
    timestamp:        new Date().toISOString(),
  });

  /* ══════════════ TOGGLE ATTENDANCE ══════════════ */

  const toggleAttendance = async (member, status) => {
    const existing = attendance[member.id];

    // ✅ #6 — Save undo snapshot per member
    setUndoMap(prev => ({
      ...prev,
      [member.id]: { prevRecord: existing ? { ...existing } : null }
    }));

    const record = buildRecord(member, status);

    if (existing && existing.status === status) {
      // Toggle off — remove
      await writeDelete(existing.id);
      setAttendance(prev => { const n = { ...prev }; delete n[member.id]; return n; });
      setPresentCount(p => status === "present" ? p - 1 : p);
    } else {
      if (existing) await writeDelete(existing.id);
      const newId = await writeAdd(record);
      setAttendance(prev => ({ ...prev, [member.id]: { id: newId, status } }));
      setPresentCount(p => {
        if (!existing && status === "present") return p + 1;
        if (existing?.status === "present" && status === "absent") return p - 1;
        if (existing?.status === "absent"  && status === "present") return p + 1;
        return p;
      });
      if (status === "absent") checkAbsenceStreak(member);
    }
  };

  const writeAdd = async (data) => {
    if (isOnline) {
      try {
        const ref = await addDoc(collection(db, "attendance"), data);
        return ref.id;
      } catch (e) {
        // fall through to offline
      }
    }
    // Offline — queue it
    const tempId = `offline_${Date.now()}_${Math.random()}`;
    const queue = [...syncQueue, { action: "add", data, tempId }];
    await saveOfflineQueue(queue);
    return tempId;
  };

  const writeDelete = async (docId) => {
    if (!docId || docId.startsWith("offline_")) {
      // Remove from offline queue instead
      const queue = syncQueue.filter(q => q.tempId !== docId);
      await saveOfflineQueue(queue);
      return;
    }
    if (isOnline) {
      try { await deleteDoc(doc(db, "attendance", docId)); return; } catch (e) {}
    }
    const queue = [...syncQueue, { action: "delete", docId }];
    await saveOfflineQueue(queue);
  };

  /* ══════════════ UNDO PER MEMBER ══════════════ */

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

  /* ══════════════ ABSENCE CHECK ══════════════ */

  // ✅ #3 — 3+ absences = red flag
  const checkAbsenceStreak = async (member) => {
    try {
      const q = query(
        collection(db, "attendance"),
        where("memberId", "==", member.id),
        where("status", "==", "absent")
      );
      const snap = await getDocs(q);
      const count = snap.docs.length;
      if (count >= 3) {
        setRedFlagMember(member);
        setRedFlagCount(count);
        setRedFlagModal(true);
      } else if (count >= 2) {
        setContactMember(member);
        setContactModalVisible(true);
      }
    } catch (e) { console.log(e); }
  };

  /* ══════════════ CONTACT ══════════════ */

  const sendSMS = (member) => {
    const phone = member.phone || "";
    const msg   = encodeURIComponent(`Hi ${member.name}, we missed you at ${selectedService} service. We hope you are doing well. Please reach out to us.`);
    Linking.openURL(`sms:${phone}?body=${msg}`);
  };

  const sendWhatsApp = (member) => {
    const phone = (member.phone || "").replace(/\D/g, "");
    const msg   = encodeURIComponent(`Hi ${member.name}, we missed you at ${selectedService} service. We hope you are doing well. Please reach out to us.`);
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  const callMember = (member) => {
    Linking.openURL(`tel:${member.phone || ""}`);
  };

  /* ══════════════ GEO ATTENDANCE ══════════════ */

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleGeoAttendance = async () => {
    if (!locationPerm) {
      Alert.alert("Permission needed", "Location permission is required for geo attendance.");
      return;
    }
    if (!memberGeoCode.trim()) {
      Alert.alert("Member ID required", "Please enter your Member ID.");
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const dist = getDistance(
        loc.coords.latitude, loc.coords.longitude,
        CHURCH_GEOFENCE.latitude, CHURCH_GEOFENCE.longitude
      );

      if (dist > CHURCH_GEOFENCE.radiusMetres) {
        setGeoStatus("outside");
        Alert.alert(
          "Not at church",
          `You are ${Math.round(dist)}m away from the church. You must be within ${CHURCH_GEOFENCE.radiusMetres}m to register attendance.`
        );
        return;
      }

      setGeoStatus("inside");
      const member = members.find(m => m.id === memberGeoCode.trim() || m.memberCode === memberGeoCode.trim());
      if (!member) {
        Alert.alert("Member not found", "No member found with that ID. Please check and try again.");
        return;
      }

      if (attendance[member.id]) {
        Alert.alert("Already marked", `${member.name} has already been marked for this session.`);
        return;
      }

      await toggleAttendance(member, "present");
      Alert.alert("✅ Attendance recorded", `${member.name} has been marked Present via Geofence.`);
      setMemberGeoCode("");
    } catch (e) {
      Alert.alert("Location error", "Could not get your location. Please try again.");
    }
  };

  /* ══════════════ QR SCAN ══════════════ */

  const handleBarCodeScanned = async ({ data: scannedId }) => {
    if (scanned) return;
    setScanned(true);
    const found = members.find(m => m.id === scannedId || m.memberCode === scannedId);
    if (found) {
      if (attendance[found.id]) {
        setScanFeedback(`⚠️ ${found.name} already marked`);
      } else {
        await toggleAttendance(found, "present");
        setScanFeedback(`✅ ${found.name} marked Present`);
      }
    } else {
      setScanFeedback("❌ Member not found");
    }
    setTimeout(() => { setScanned(false); setScanFeedback(""); }, 2500);
  };

  /* ══════════════ ATTENDANCE LOG ══════════════ */

  const openLog = async () => {
    try {
      const q = query(collection(db, "attendance"), where("visitingChurchId", "==", selectedChurch));
      const snap = await getDocs(q);
      const records = snap.docs
        .map(d => ({ docId: d.id, ...d.data() }))
        .filter(r => r.date === today && r.service === selectedService && r.type === selectedType)
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setLogData(records);
      setLogVisible(true);
    } catch (e) { console.log(e); }
  };

  /* ══════════════ MANAGE MODAL ══════════════ */

  const handleSave = () => {
    if (!inputValue) return;
    let list, setter;
    if (modalType === "service")      { list = services; setter = setServices; }
    else if (modalType === "type")    { list = types;    setter = setTypes;    }
    else                              { list = events;   setter = setEvents;   }
    if (editingIndex !== null) { const u = [...list]; u[editingIndex] = inputValue; setter(u); }
    else setter([...list, inputValue]);
    resetModal();
  };

  const handleDelete = () => {
    let list, setter;
    if (modalType === "service")   { list = services; setter = setServices; }
    else if (modalType === "type") { list = types;    setter = setTypes;    }
    else                           { list = events;   setter = setEvents;   }
    setter(list.filter((_, i) => i !== editingIndex));
    resetModal();
  };

  const resetModal = () => { setModalVisible(false); setEditingIndex(null); setInputValue(""); };

  const filtered = members.filter(m =>
    (m.name || "").toLowerCase().includes(searchMember.toLowerCase())
  );

  /* ══════════════════════════════════════
                  RENDER
  ══════════════════════════════════════ */
  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation?.navigate("Home")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.header}>Attendance</Text>

        <View style={styles.headerActions}>
          {/* ✅ #7 — Online/Offline toggle */}
          <TouchableOpacity
            style={[styles.onlineToggle, { backgroundColor: isOnline ? "#27ae60" : "#e74c3c" }]}
            onPress={() => setIsOnline(p => !p)}
          >
            <Ionicons name={isOnline ? "wifi-outline" : "wifi-outline"} size={12} color="#fff" />
            <Text style={styles.onlineToggleText}>{isOnline ? "Online" : "Offline"}</Text>
          </TouchableOpacity>

          {/* Sync badge */}
          {syncQueue.length > 0 && (
            <TouchableOpacity style={styles.syncBtn} onPress={syncOfflineQueue} disabled={syncing || !isOnline}>
              {syncing
                ? <ActivityIndicator size={12} color="#fff" />
                : <Ionicons name="sync-outline" size={14} color="#fff" />
              }
              <Text style={styles.syncBtnText}>{syncQueue.length}</Text>
            </TouchableOpacity>
          )}

          {/* Log button */}
          <TouchableOpacity style={styles.iconBtn} onPress={openLog}>
            <Ionicons name="list-outline" size={16} color="#fff" />
            <Text style={styles.iconBtnText}>Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Offline banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
            <Text style={styles.offlineBannerText}>
              Offline mode — records will sync when you reconnect
              {syncQueue.length > 0 ? ` (${syncQueue.length} pending)` : ""}
            </Text>
          </View>
        )}

        {/* ── DATE ── */}
        <TouchableOpacity style={styles.box} onPress={() => setShowPicker(true)}>
          <Ionicons name="calendar-outline" size={14} color="#4B3F72" style={{ marginRight: 6 }} />
          <Text style={styles.boxText}>{today}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker value={dateObj} mode="date"
            onChange={(e, d) => { setShowPicker(false); if (d) setDateObj(d); }} />
        )}

        {/* ── SERVICE ── */}
        <DropdownRow label="Service" value={selectedService} open={showServiceDropdown}
          onToggle={() => setShowServiceDropdown(p => !p)} items={services}
          onSelect={v => { setSelectedService(v); setShowServiceDropdown(false); }}
          onLongPress={(i, v) => { setEditingIndex(i); setInputValue(v); setModalType("service"); setModalVisible(true); }}
          onAdd={() => { setModalType("service"); setModalVisible(true); }} />

        {/* ── TYPE ── */}
        <DropdownRow label="Type" value={selectedType} open={showTypeDropdown}
          onToggle={() => setShowTypeDropdown(p => !p)} items={types}
          onSelect={v => { setSelectedType(v); setShowTypeDropdown(false); }}
          onLongPress={(i, v) => { setEditingIndex(i); setInputValue(v); setModalType("type"); setModalVisible(true); }}
          onAdd={() => { setModalType("type"); setModalVisible(true); }} />

        {/* ── EVENT ── */}
        <DropdownRow label="Event" value={selectedEvent} open={showEventDropdown}
          onToggle={() => setShowEventDropdown(p => !p)} items={events}
          onSelect={v => { setSelectedEvent(v); setShowEventDropdown(false); }}
          onLongPress={(i, v) => { setEditingIndex(i); setInputValue(v); setModalType("event"); setModalVisible(true); }}
          onAdd={() => { setModalType("event"); setModalVisible(true); }} />

        {/* ── STATS ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#fce8e8" }]}>
            <Text style={[styles.statNum, { color: "#e74c3c" }]}>{members.length - presentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#e8f4fd" }]}>
            <Text style={[styles.statNum, { color: "#2980b9" }]}>{members.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* ── MODE TABS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
          {METHODS.map(m => (
            <TouchableOpacity key={m.id}
              style={[styles.modeBtn, mode === m.id && styles.activeMode]}
              onPress={() => setMode(m.id)}>
              <Ionicons name={m.icon} size={14} color={mode === m.id ? "#fff" : "#555"} />
              <Text style={[styles.modeBtnText, mode === m.id && styles.white]}> {m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ══ MANUAL MODE ══ */}
        {mode === "manual" && (
          <View>
            <TextInput placeholder="🔍  Search members..." value={searchMember}
              onChangeText={setSearchMember} style={styles.input} />

            {filtered.map(item => {
              const status   = attendance[item.id]?.status;
              const isMarked = !!status;
              const canUndo  = !!undoMap[item.id];

              return (
                <View key={item.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    {item.memberCode && <Text style={styles.memberCode}>ID: {item.memberCode}</Text>}
                    {status && (
                      <View style={[styles.statusBadge, { backgroundColor: status === "present" ? "#e8f8f0" : "#fce8e8" }]}>
                        <Text style={[styles.statusBadgeText, { color: status === "present" ? "#27ae60" : "#e74c3c" }]}>
                          {status === "present" ? "✓ Present" : "✗ Absent"}
                          {attendance[item.id]?.id?.startsWith("offline_") ? "  ⏱" : ""}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* ✅ #1 & #6 — Present / Absent / Undo inline */}
                  <View style={styles.btnGroup}>
                    {/* ✅ #6 — grey out when already marked with a different status */}
                    <TouchableOpacity
                      style={[styles.btn, status === "present" ? styles.present : styles.btnGreen,
                        isMarked && status !== "present" && styles.btnGreyed]}
                      onPress={() => !isMarked || status === "present" ? toggleAttendance(item, "present") : null}
                      activeOpacity={isMarked && status !== "present" ? 1 : 0.7}
                    >
                      <Ionicons name="checkmark" size={15} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, status === "absent" ? styles.absent : styles.btnRed,
                        isMarked && status !== "absent" && styles.btnGreyed]}
                      onPress={() => !isMarked || status === "absent" ? toggleAttendance(item, "absent") : null}
                      activeOpacity={isMarked && status !== "absent" ? 1 : 0.7}
                    >
                      <Ionicons name="close" size={15} color="#fff" />
                    </TouchableOpacity>

                    {/* ✅ #1 — Undo button per member, only when action exists */}
                    {canUndo && (
                      <TouchableOpacity style={styles.btnUndo} onPress={() => undoMember(item)}>
                        <Ionicons name="arrow-undo" size={13} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ══ QR SCAN MODE ══ */}
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
                  <View style={[styles.scanFeedback,
                    { backgroundColor: scanFeedback.startsWith("✅") ? "#27ae60" : scanFeedback.startsWith("⚠️") ? "#e67e22" : "#e74c3c" }]}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>{scanFeedback}</Text>
                  </View>
                ) : null}
                <Text style={styles.qrHint}>Admin scans member's QR code</Text>
                {scanned && (
                  <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                    <Ionicons name="scan-outline" size={16} color="#fff" />
                    <Text style={{ color: "#fff", marginLeft: 6 }}>Scan Next</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* ══ SELF QR — Member scans themselves ══ */}
        {/* ✅ #3 — Members use their phone to scan a church QR code */}
        {mode === "selfqr" && (
          <View style={styles.selfQrBox}>
            <Ionicons name="phone-portrait-outline" size={40} color="#4B3F72" />
            <Text style={styles.selfQrTitle}>Member Self Check-In</Text>
            <Text style={styles.selfQrDesc}>
              Display the church QR code on a screen at the entrance. Members scan it with their phone camera to check in automatically.
            </Text>
            <View style={styles.selfQrSteps}>
              {[
                "1. Generate church QR from Settings",
                "2. Display on entrance screen / print",
                "3. Member scans → attendance logged",
                "4. Geofence verifies location (optional)",
              ].map((s, i) => (
                <View key={i} style={styles.selfQrStep}>
                  <Ionicons name="checkmark-circle" size={14} color="#1BA97F" />
                  <Text style={styles.selfQrStepText}>{s}</Text>
                </View>
              ))}
            </View>
            {/* Admin can also type member ID manually as fallback */}
            <TextInput style={[styles.input, { marginTop: 12 }]}
              placeholder="Or type Member ID to mark present"
              value={memberGeoCode} onChangeText={setMemberGeoCode} />
            <TouchableOpacity style={styles.geoBtn} onPress={async () => {
              const member = members.find(m => m.id === memberGeoCode.trim() || m.memberCode === memberGeoCode.trim());
              if (!member) { Alert.alert("Not found", "No member found with that ID."); return; }
              if (attendance[member.id]) { Alert.alert("Already marked", `${member.name} is already recorded.`); return; }
              await toggleAttendance(member, "present");
              Alert.alert("✅ Marked", `${member.name} marked Present.`);
              setMemberGeoCode("");
            }}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.geoBtnText}>Mark Present</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══ GEO MODE ══ */}
        {/* ✅ #3 — Geofenced attendance */}
        {mode === "geo" && (
          <View style={styles.selfQrBox}>
            <Ionicons name="location" size={40} color={geoStatus === "inside" ? "#27ae60" : geoStatus === "outside" ? "#e74c3c" : "#4B3F72"} />
            <Text style={styles.selfQrTitle}>Geofenced Attendance</Text>
            <Text style={styles.selfQrDesc}>
              Member must be within {CHURCH_GEOFENCE.radiusMetres}m of the church to register.
            </Text>
            {!locationPerm && (
              <Text style={styles.geoWarning}>⚠️ Location permission not granted</Text>
            )}
            {geoStatus === "inside" && <Text style={styles.geoInside}>📍 You are inside the church boundary</Text>}
            {geoStatus === "outside" && <Text style={styles.geoOutside}>📍 You are outside the church boundary</Text>}

            <TextInput style={[styles.input, { marginTop: 10 }]}
              placeholder="Enter your Member ID"
              value={memberGeoCode} onChangeText={setMemberGeoCode} />
            <TouchableOpacity style={styles.geoBtn} onPress={handleGeoAttendance}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.geoBtnText}>Verify & Mark Present</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ══ MANAGE MODAL ══ */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modal}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{editingIndex !== null ? `Edit ${modalType}` : `Add ${modalType}`}</Text>
          <TextInput value={inputValue} onChangeText={setInputValue} style={styles.input}
            placeholder={`Enter ${modalType} name`} autoFocus />
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.white}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}><Text style={styles.white}>Cancel</Text></TouchableOpacity>
          </View>
          {editingIndex !== null && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}><Text style={styles.white}>Delete</Text></TouchableOpacity>
          )}
        </View></View>
      </Modal>

      {/* ══ ATTENDANCE LOG MODAL ══ */}
      <Modal visible={logVisible} transparent animationType="slide">
        <View style={styles.modal}><View style={[styles.modalBox, { maxHeight: "82%" }]}>
          <Text style={styles.modalTitle}>Attendance Log — {today}</Text>
          <Text style={styles.logSubtitle}>{selectedService} · {selectedType} · {selectedEvent}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {logData.length === 0
              ? <Text style={styles.emptyText}>No records for this session.</Text>
              : logData.map(r => (
                <View key={r.docId} style={styles.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logName}>{r.name}</Text>
                    {r.homeChurchId !== r.visitingChurchId && (
                      <Text style={styles.logVisitor}>Visitor from {r.homeChurchId}</Text>
                    )}
                    <Text style={styles.logMeta}>{r.method || "manual"}</Text>
                  </View>
                  <View style={[styles.logBadge, { backgroundColor: r.status === "present" ? "#e8f8f0" : "#fce8e8" }]}>
                    <Text style={[styles.logBadgeText, { color: r.status === "present" ? "#27ae60" : "#e74c3c" }]}>
                      {r.status === "present" ? "Present" : "Absent"}
                    </Text>
                  </View>
                </View>
              ))
            }
          </ScrollView>
          <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12, flex: 0, width: "100%" }]} onPress={() => setLogVisible(false)}>
            <Text style={styles.white}>Close</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

      {/* ══ CONTACT MODAL (2 absences) ══ */}
      {/* ✅ #4 — Properly labelled contact buttons with icons */}
      <Modal visible={contactModalVisible} transparent animationType="fade">
        <View style={styles.modal}><View style={styles.modalBox}>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="alert-circle" size={36} color="#e67e22" />
          </View>
          <Text style={styles.modalTitle}>Follow-Up Needed</Text>
          <Text style={styles.alertText}>
            <Text style={{ fontWeight: "700" }}>{contactMember?.name}</Text> has been absent twice.
          </Text>
          <View style={styles.contactBtnRow}>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: "#25D366" }]}
              onPress={() => { sendWhatsApp(contactMember); setContactModalVisible(false); }}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: "#2980b9" }]}
              onPress={() => { sendSMS(contactMember); setContactModalVisible(false); }}>
              <Ionicons name="chatbubble" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: "#8e44ad" }]}
              onPress={() => { callMember(contactMember); setContactModalVisible(false); }}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.cancelBtn, { marginTop: 8, flex: 0, width: "100%" }]}
            onPress={() => setContactModalVisible(false)}>
            <Text style={styles.white}>Dismiss</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

      {/* ══ RED FLAG MODAL (3+ absences) ══ */}
      {/* ✅ #3 — 3+ absences triggers red flag */}
      <Modal visible={redFlagModal} transparent animationType="fade">
        <View style={styles.modal}><View style={styles.modalBox}>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="flag" size={36} color="#e74c3c" />
          </View>
          <Text style={[styles.modalTitle, { color: "#e74c3c" }]}>🚩 Red Flag</Text>
          <Text style={styles.alertText}>
            <Text style={{ fontWeight: "700" }}>{redFlagMember?.name}</Text> has been absent{" "}
            <Text style={{ fontWeight: "800", color: "#e74c3c" }}>{redFlagCount} times</Text>.
            Immediate pastoral follow-up is recommended.
          </Text>
          <View style={styles.contactBtnRow}>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: "#25D366" }]}
              onPress={() => { sendWhatsApp(redFlagMember); setRedFlagModal(false); }}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: "#2980b9" }]}
              onPress={() => { sendSMS(redFlagMember); setRedFlagModal(false); }}>
              <Ionicons name="chatbubble" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: "#8e44ad" }]}
              onPress={() => { callMember(redFlagMember); setRedFlagModal(false); }}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.deleteBtn, { flex: 0, width: "100%", marginTop: 8 }]}
            onPress={() => setRedFlagModal(false)}>
            <Text style={styles.white}>Acknowledge & Close</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>

    </View>
  );
}

/* ── DROPDOWN COMPONENT ── */
function DropdownRow({ label, value, open, onToggle, items, onSelect, onLongPress, onAdd }) {
  return (
    <View style={{ marginBottom: 2 }}>
      <TouchableOpacity style={styles.box} onPress={onToggle}>
        <Ionicons name="chevron-down" size={13} color="#4B3F72" style={{ marginRight: 6 }} />
        <Text style={styles.boxText}>{label}: <Text style={{ fontWeight: "700" }}>{value}</Text></Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {items.map((s, i) => (
            <TouchableOpacity key={i} style={styles.dropdownItem}
              onPress={() => onSelect(s)} onLongPress={() => onLongPress(i, s)}>
              <Text style={styles.dropdownItemText}>{s}</Text>
              <Text style={styles.longPressHint}>hold to edit</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addDropdownBtn} onPress={onAdd}>
            <Ionicons name="add-circle-outline" size={14} color="#4B3F72" />
            <Text style={styles.link}> + Add {label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb", paddingHorizontal: 15, paddingTop: 50 },

  headerRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#4B3F72",
    marginHorizontal: -15, paddingHorizontal: 15, paddingVertical: 12,
    marginTop: -50, paddingTop: 50, marginBottom: 12
  },
  backBtn: { marginRight: 10, padding: 2 },
  header: { fontSize: 18, fontWeight: "700", color: "#fff", flex: 1 },
  headerActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  iconBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4 },
  iconBtnText: { color: "#fff", fontSize: 12 },

  onlineToggle: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, gap: 4 },
  onlineToggleText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  syncBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#e67e22", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, gap: 3 },
  syncBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  offlineBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#e74c3c", borderRadius: 8, padding: 10, marginBottom: 8, gap: 6 },
  offlineBannerText: { color: "#fff", fontSize: 12, flex: 1 },

  box: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 11, marginVertical: 4, borderRadius: 8, elevation: 1 },
  boxText: { fontSize: 13, color: "#333" },

  dropdownList: { backgroundColor: "#fff", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 4, elevation: 2 },
  dropdownItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  dropdownItemText: { fontSize: 13, color: "#333" },
  longPressHint: { fontSize: 10, color: "#bbb" },
  addDropdownBtn: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  link: { color: "#4B3F72", fontSize: 12 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 10, gap: 8 },
  statBox: { flex: 1, backgroundColor: "#e8f8f0", borderRadius: 10, alignItems: "center", paddingVertical: 10 },
  statNum: { fontSize: 22, fontWeight: "800", color: "#27ae60" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2 },

  methodScroll: { marginBottom: 10 },
  modeBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#e0e0e0", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, marginRight: 8 },
  activeMode: { backgroundColor: "#4B3F72" },
  modeBtnText: { fontSize: 13, color: "#555" },
  white: { color: "#fff" },

  input: { backgroundColor: "#fff", padding: 11, marginVertical: 6, borderRadius: 8, fontSize: 13, elevation: 1 },

  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, marginVertical: 4, borderRadius: 10, elevation: 1 },
  memberName: { fontSize: 13, fontWeight: "600", color: "#222" },
  memberCode: { fontSize: 10, color: "#aaa", marginTop: 1 },
  statusBadge: { marginTop: 3, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },

  btnGroup: { flexDirection: "row", gap: 5, alignItems: "center" },
  btn: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnGreen: { backgroundColor: "#27ae60" },
  btnRed:   { backgroundColor: "#e74c3c" },
  btnGreyed: { backgroundColor: "#ccc", opacity: 0.4 },
  present: { backgroundColor: "#27ae60" },
  absent:  { backgroundColor: "#e74c3c" },
  btnUndo: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#6c47b8", alignItems: "center", justifyContent: "center" },

  qrWrapper: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  camera: { height: 320, borderRadius: 16 },
  qrOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  qrFrame: { width: 180, height: 180, borderWidth: 2, borderColor: "#fff", borderRadius: 12, backgroundColor: "transparent" },
  qrPlaceholder: { height: 260, backgroundColor: "#f0f0f0", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  qrPlaceholderText: { color: "#aaa", marginTop: 10, fontSize: 13 },
  qrHint: { textAlign: "center", color: "#888", fontSize: 12, marginTop: 8 },
  scanFeedback: { marginTop: 8, padding: 10, borderRadius: 8, alignItems: "center" },
  rescanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", padding: 10, borderRadius: 8, marginTop: 8 },

  selfQrBox: { backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", marginTop: 8 },
  selfQrTitle: { fontSize: 16, fontWeight: "700", color: "#4B3F72", marginTop: 12 },
  selfQrDesc: { fontSize: 12, color: "#666", textAlign: "center", marginTop: 6, lineHeight: 18 },
  selfQrSteps: { alignSelf: "stretch", marginTop: 14 },
  selfQrStep: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  selfQrStepText: { fontSize: 12, color: "#444" },
  geoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", borderRadius: 10, padding: 12, marginTop: 8, width: "100%", gap: 8 },
  geoBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  geoWarning: { color: "#e74c3c", fontSize: 12, marginTop: 8 },
  geoInside:  { color: "#27ae60", fontSize: 12, fontWeight: "700", marginTop: 8 },
  geoOutside: { color: "#e74c3c", fontSize: 12, fontWeight: "700", marginTop: 8 },

  modal: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBox: { backgroundColor: "#fff", margin: 24, padding: 20, borderRadius: 14 },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 6, textAlign: "center", color: "#222" },

  saveBtn: { backgroundColor: "#27ae60", padding: 11, flex: 1, marginRight: 5, alignItems: "center", borderRadius: 8, flexDirection: "row", justifyContent: "center" },
  cancelBtn: { backgroundColor: "#888", padding: 11, flex: 1, alignItems: "center", borderRadius: 8 },
  deleteBtn: { backgroundColor: "#e74c3c", padding: 11, marginTop: 10, alignItems: "center", borderRadius: 8 },

  logSubtitle: { textAlign: "center", color: "#888", fontSize: 12, marginBottom: 10 },
  logRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  logName: { fontSize: 13, color: "#333", fontWeight: "600" },
  logVisitor: { fontSize: 10, color: "#e67e22", marginTop: 1 },
  logMeta: { fontSize: 10, color: "#bbb", marginTop: 1 },
  logBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  logBadgeText: { fontSize: 11, fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#bbb", marginVertical: 20 },

  alertText: { textAlign: "center", color: "#555", fontSize: 13, marginBottom: 12, lineHeight: 20 },

  /* ✅ #4 — Properly sized, labelled contact buttons */
  contactBtnRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  contactBtn: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, gap: 4 },
  contactBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
