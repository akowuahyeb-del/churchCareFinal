import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet,
  FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView,
  Linking, Platform, Alert
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { CameraView, Camera } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  deleteDoc, doc, query, where, getDoc
} from "firebase/firestore";

// ─────────────────────────────────────────────
// NOTE: QR code generation is handled in MembersScreen.
// Each member doc should have a `qrValue` field = member.id.
// Use expo-barcode-scanner / CameraView to scan on this screen.
// Install: expo install expo-barcode-scanner expo-camera
// ─────────────────────────────────────────────

export default function AttendanceScreen({ navigation }) {

  /* ── ROLE ── */
  const userRole = "admin";

  /* ── MODE ── */
  const [mode, setMode] = useState("manual");

  /* ── CAMERA ── */
  const [permission, setPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanFeedback, setScanFeedback] = useState("");

  /* ── DATE ── */
  const [dateObj, setDateObj] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const today = dateObj.toISOString().split("T")[0];

  /* ── CHURCH ── */
  const [selectedChurch] = useState("church_1");

  /* ── MEMBERS ── */
  const [members, setMembers] = useState([]);
  const [searchMember, setSearchMember] = useState("");

  /* ── SERVICES / TYPES / EVENTS ── */
  const [services, setServices] = useState(["Sunday"]);
  const [types, setTypes] = useState(["First"]);
  const [events, setEvents] = useState(["General Service"]);

  const [selectedService, setSelectedService] = useState("Sunday");
  const [selectedType, setSelectedType] = useState("First");
  const [selectedEvent, setSelectedEvent] = useState("General Service");

  /* ── DROPDOWNS ── */
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  /* ── MANAGE MODAL ── */
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  /* ── ATTENDANCE ── */
  const [attendance, setAttendance] = useState({});
  const [presentCount, setPresentCount] = useState(0);

  /* ── UNDO ── */
  // lastAction: { memberId, prevRecord: {id, status} | null }
  const [lastAction, setLastAction] = useState(null);

  /* ── ATTENDANCE LOG MODAL ── */
  const [logVisible, setLogVisible] = useState(false);
  const [logData, setLogData] = useState([]);

  /* ── CONTACT MODAL (absence alert) ── */
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactMember, setContactMember] = useState(null);

  /* ────────────── CAMERA PERMISSION ────────────── */
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermission(status === "granted");
    })();
  }, []);

  /* ────────────── LOAD MEMBERS ────────────── */
  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    try {
      const q = query(
        collection(db, "members"),
        where("churchId", "==", selectedChurch)
      );
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (data.length === 0) {
        const snapAll = await getDocs(collection(db, "members"));
        data = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setMembers(data);
    } catch (e) { console.log(e); }
  };

  /* ────────────── LOAD ATTENDANCE ────────────── */
  useEffect(() => { loadAttendance(); },
    [dateObj, selectedService, selectedType]);

  const loadAttendance = async () => {
    const q = query(
      collection(db, "attendance"),
      where("churchId", "==", selectedChurch)
    );
    const snap = await getDocs(q);
    let map = {};
    let present = 0;

    snap.docs.forEach(d => {
      const data = d.data();
      if (
        data.date === today &&
        data.service === selectedService &&
        data.type === selectedType
      ) {
        map[data.memberId] = { id: d.id, status: data.status };
        if (data.status === "present") present++;
      }
    });

    setAttendance(map);
    setPresentCount(present);
  };

  /* ────────────── CHECK ABSENCE STREAK → notify ────────────── */
  const checkAbsenceStreak = async (member) => {
    const q = query(
      collection(db, "attendance"),
      where("churchId", "==", selectedChurch),
      where("memberId", "==", member.id),
      where("status", "==", "absent")
    );
    const snap = await getDocs(q);
    // Sort by date desc, take last 2
    const records = snap.docs
      .map(d => d.data())
      .sort((a, b) => b.date.localeCompare(a.date));

    if (records.length >= 2) {
      // Two most recent are absent → trigger contact prompt
      setContactMember(member);
      setContactModalVisible(true);
    }
  };

  /* ────────────── CONTACT VIA SMS / WHATSAPP ────────────── */
  const sendSMS = (member) => {
    const phone = member.phone || "";
    const msg = encodeURIComponent(
      `Hi ${member.name}, we missed you at ${selectedService} service. We hope you are doing well!`
    );
    Linking.openURL(`sms:${phone}?body=${msg}`);
  };

  const sendWhatsApp = (member) => {
    const phone = (member.phone || "").replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hi ${member.name}, we missed you at ${selectedService} service. We hope you are doing well!`
    );
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  };

  /* ────────────── TOGGLE ATTENDANCE ────────────── */
  const toggleAttendance = async (member, status) => {
    const existing = attendance[member.id];

    // Save snapshot for undo
    setLastAction({
      member,
      status,
      prevRecord: existing ? { ...existing } : null
    });

    if (existing && existing.status === status) {
      // toggling off
      await deleteDoc(doc(db, "attendance", existing.id));
    } else {
      if (existing) await deleteDoc(doc(db, "attendance", existing.id));
      await addDoc(collection(db, "attendance"), {
        memberId: member.id,
        name: member.name,
        churchId: selectedChurch,
        service: selectedService,
        type: selectedType,
        event: selectedEvent,
        date: today,
        status
      });

      // Check absence streak only when marking absent
      if (status === "absent") {
        await checkAbsenceStreak(member);
      }
    }

    loadAttendance();
  };

  /* ────────────── UNDO LAST ACTION ────────────── */
  const undoLast = async () => {
    if (!lastAction) return;
    const { member, status, prevRecord } = lastAction;

    // Delete what we just wrote
    const currentRecord = attendance[member.id];
    if (currentRecord) {
      await deleteDoc(doc(db, "attendance", currentRecord.id));
    }

    // Restore previous if there was one
    if (prevRecord) {
      await addDoc(collection(db, "attendance"), {
        memberId: member.id,
        name: member.name,
        churchId: selectedChurch,
        service: selectedService,
        type: selectedType,
        event: selectedEvent,
        date: today,
        status: prevRecord.status
      });
    }

    setLastAction(null);
    loadAttendance();
  };

  /* ────────────── QR SCAN ────────────── */
  const handleBarCodeScanned = async ({ data: scannedId }) => {
    if (scanned) return;
    setScanned(true);

    // scannedId should be the member's Firestore doc ID
    const found = members.find(m => m.id === scannedId);
    if (found) {
      await toggleAttendance(found, "present");
      setScanFeedback(`✅ ${found.name} marked Present`);
    } else {
      setScanFeedback("❌ Member not found");
    }

    setTimeout(() => {
      setScanned(false);
      setScanFeedback("");
    }, 2500);
  };

  /* ────────────── ATTENDANCE LOG ────────────── */
  const openLog = async () => {
    const q = query(
      collection(db, "attendance"),
      where("churchId", "==", selectedChurch)
    );
    const snap = await getDocs(q);
    const records = snap.docs
      .map(d => ({ docId: d.id, ...d.data() }))
      .filter(r =>
        r.date === today &&
        r.service === selectedService &&
        r.type === selectedType
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    setLogData(records);
    setLogVisible(true);
  };

  /* ────────────── MANAGE MODAL ────────────── */
  const handleSave = () => {
    if (!inputValue) return;
    let list, setter;
    if (modalType === "service") { list = services; setter = setServices; }
    else if (modalType === "type") { list = types; setter = setTypes; }
    else { list = events; setter = setEvents; }

    if (editingIndex !== null) {
      const updated = [...list];
      updated[editingIndex] = inputValue;
      setter(updated);
    } else {
      setter([...list, inputValue]);
    }
    resetModal();
  };

  const handleDelete = () => {
    let list, setter;
    if (modalType === "service") { list = services; setter = setServices; }
    else if (modalType === "type") { list = types; setter = setTypes; }
    else { list = events; setter = setEvents; }
    setter(list.filter((_, i) => i !== editingIndex));
    resetModal();
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditingIndex(null);
    setInputValue("");
  };

  /* ────────────── FILTER ────────────── */
  const filtered = members.filter(m =>
    (m.name || "").toLowerCase().includes(searchMember.toLowerCase())
  );

  /* ══════════════════════════════════════════════
                        RENDER
  ══════════════════════════════════════════════ */
  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation?.navigate("Home")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.header}>Attendance</Text>

        <View style={styles.headerActions}>
          {/* Undo button */}
          <TouchableOpacity
            style={[styles.iconBtn, !lastAction && styles.iconBtnDisabled]}
            onPress={undoLast}
            disabled={!lastAction}
          >
            <Ionicons name="arrow-undo" size={16} color={lastAction ? "#fff" : "#aaa"} />
            <Text style={[styles.iconBtnText, !lastAction && { color: "#aaa" }]}>Undo</Text>
          </TouchableOpacity>

          {/* Log button */}
          <TouchableOpacity style={styles.iconBtn} onPress={openLog}>
            <Ionicons name="list-outline" size={16} color="#fff" />
            <Text style={styles.iconBtnText}>Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── DATE ── */}
        <TouchableOpacity style={styles.box} onPress={() => setShowPicker(true)}>
          <Ionicons name="calendar-outline" size={14} color="#4B3F72" style={{ marginRight: 6 }} />
          <Text style={styles.boxText}>{today}</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={dateObj}
            mode="date"
            onChange={(e, d) => { setShowPicker(false); if (d) setDateObj(d); }}
          />
        )}

        {/* ── SERVICE ── */}
        <DropdownRow
          label="Service"
          value={selectedService}
          open={showServiceDropdown}
          onToggle={() => setShowServiceDropdown(p => !p)}
          items={services}
          onSelect={v => { setSelectedService(v); setShowServiceDropdown(false); }}
          onLongPress={(i, v) => { setEditingIndex(i); setInputValue(v); setModalType("service"); setModalVisible(true); }}
          onAdd={() => { setModalType("service"); setModalVisible(true); }}
        />

        {/* ── TYPE ── */}
        <DropdownRow
          label="Type"
          value={selectedType}
          open={showTypeDropdown}
          onToggle={() => setShowTypeDropdown(p => !p)}
          items={types}
          onSelect={v => { setSelectedType(v); setShowTypeDropdown(false); }}
          onLongPress={(i, v) => { setEditingIndex(i); setInputValue(v); setModalType("type"); setModalVisible(true); }}
          onAdd={() => { setModalType("type"); setModalVisible(true); }}
        />

        {/* ── EVENT ── */}
        <DropdownRow
          label="Event"
          value={selectedEvent}
          open={showEventDropdown}
          onToggle={() => setShowEventDropdown(p => !p)}
          items={events}
          onSelect={v => { setSelectedEvent(v); setShowEventDropdown(false); }}
          onLongPress={(i, v) => { setEditingIndex(i); setInputValue(v); setModalType("event"); setModalVisible(true); }}
          onAdd={() => { setModalType("event"); setModalVisible(true); }}
        />

        {/* ── PRESENT COUNT ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#fce8e8" }]}>
            <Text style={[styles.statNum, { color: "#e74c3c" }]}>
              {members.length - presentCount}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#e8f4fd" }]}>
            <Text style={[styles.statNum, { color: "#2980b9" }]}>{members.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* ── MODE TOGGLE ── */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "manual" && styles.activeMode]}
            onPress={() => setMode("manual")}
          >
            <Ionicons name="pencil-outline" size={14} color={mode === "manual" ? "#fff" : "#555"} />
            <Text style={[styles.modeBtnText, mode === "manual" && styles.white]}> Manual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, mode === "qr" && styles.activeMode]}
            onPress={() => setMode("qr")}
          >
            <Ionicons name="qr-code-outline" size={14} color={mode === "qr" ? "#fff" : "#555"} />
            <Text style={[styles.modeBtnText, mode === "qr" && styles.white]}> QR Scan</Text>
          </TouchableOpacity>
        </View>

        {/* ── MANUAL MODE ── */}
        {mode === "manual" && (
          <View>
            <TextInput
              placeholder="🔍  Search members..."
              value={searchMember}
              onChangeText={setSearchMember}
              style={styles.input}
            />

            {filtered.map(item => {
              const status = attendance[item.id]?.status;
              const isMarked = !!status;

              return (
                <View key={item.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    {status && (
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: status === "present" ? "#e8f8f0" : "#fce8e8" }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          { color: status === "present" ? "#27ae60" : "#e74c3c" }
                        ]}>
                          {status === "present" ? "✓ Present" : "✗ Absent"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.btnGroup}>
                    <TouchableOpacity
                      style={[
                        styles.btn,
                        status === "present" ? styles.present : styles.btnOutlineGreen,
                        isMarked && status !== "present" && styles.btnGreyed
                      ]}
                      onPress={() => toggleAttendance(item, "present")}
                      disabled={isMarked && status !== "present"}
                    >
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.btn,
                        status === "absent" ? styles.absent : styles.btnOutlineRed,
                        isMarked && status !== "absent" && styles.btnGreyed
                      ]}
                      onPress={() => toggleAttendance(item, "absent")}
                      disabled={isMarked && status !== "absent"}
                    >
                      <Ionicons name="close" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── QR SCAN MODE ── */}
        {mode === "qr" && (
          <View style={styles.qrWrapper}>
            {!permission ? (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="camera-off-outline" size={40} color="#bbb" />
                <Text style={styles.qrPlaceholderText}>Camera permission denied</Text>
              </View>
            ) : (
              <>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
                <View style={styles.qrOverlay}>
                  <View style={styles.qrFrame} />
                </View>
                {scanFeedback ? (
                  <View style={[
                    styles.scanFeedback,
                    { backgroundColor: scanFeedback.startsWith("✅") ? "#27ae60" : "#e74c3c" }
                  ]}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>{scanFeedback}</Text>
                  </View>
                ) : null}
                <Text style={styles.qrHint}>Point camera at a member's QR code</Text>

                {scanned && (
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={{ color: "#fff" }}>Scan Next</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

      </ScrollView>

      {/* ══════════ MANAGE (service/type/event) MODAL ══════════ */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modal}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingIndex !== null ? `Edit ${modalType}` : `Add ${modalType}`}
            </Text>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              style={styles.input}
              placeholder={`Enter ${modalType} name`}
              autoFocus
            />
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.white}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
            {editingIndex !== null && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.white}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════ ATTENDANCE LOG MODAL ══════════ */}
      <Modal visible={logVisible} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={[styles.modalBox, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>
              Attendance Log — {today}
            </Text>
            <Text style={styles.logSubtitle}>
              {selectedService} · {selectedType} · {selectedEvent}
            </Text>

            <ScrollView style={{ maxHeight: 380 }}>
              {logData.length === 0 ? (
                <Text style={styles.emptyText}>No records yet for this session.</Text>
              ) : (
                logData.map(r => (
                  <View key={r.docId} style={styles.logRow}>
                    <Text style={styles.logName}>{r.name}</Text>
                    <View style={[
                      styles.logBadge,
                      { backgroundColor: r.status === "present" ? "#e8f8f0" : "#fce8e8" }
                    ]}>
                      <Text style={[
                        styles.logBadgeText,
                        { color: r.status === "present" ? "#27ae60" : "#e74c3c" }
                      ]}>
                        {r.status === "present" ? "Present" : "Absent"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12, flex: 0, width: "100%" }]}
              onPress={() => setLogVisible(false)}
            >
              <Text style={styles.white}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ ABSENCE CONTACT MODAL ══════════ */}
      <Modal visible={contactModalVisible} transparent animationType="fade">
        <View style={styles.modal}>
          <View style={styles.modalBox}>
            <View style={styles.alertIconWrap}>
              <Ionicons name="alert-circle" size={36} color="#e74c3c" />
            </View>
            <Text style={styles.modalTitle}>Repeated Absence</Text>
            <Text style={styles.alertText}>
              <Text style={{ fontWeight: "700" }}>{contactMember?.name}</Text> has been absent
              at least twice. Would you like to reach out?
            </Text>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#25D366", marginTop: 12 }]}
              onPress={() => { sendWhatsApp(contactMember); setContactModalVisible(false); }}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.white}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#2980b9", marginTop: 8 }]}
              onPress={() => { sendSMS(contactMember); setContactModalVisible(false); }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.white}>Send SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 8 }]}
              onPress={() => setContactModalVisible(false)}
            >
              <Text style={styles.white}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ─────────────────────────────────────
   Dropdown helper component
───────────────────────────────────── */
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
            <TouchableOpacity
              key={i}
              style={styles.dropdownItem}
              onPress={() => onSelect(s)}
              onLongPress={() => onLongPress(i, s)}
            >
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

/* ─────────────────────────────────────
   STYLES
───────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb", paddingHorizontal: 15, paddingTop: 50 },

  /* Header */
  headerRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#4B3F72", marginHorizontal: -15,
    paddingHorizontal: 15, paddingVertical: 12, marginTop: -50,
    paddingTop: 50, marginBottom: 12
  },
  backBtn: { marginRight: 10, padding: 2 },
  header: { fontSize: 18, fontWeight: "700", color: "#fff", flex: 1 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4
  },
  iconBtnDisabled: { backgroundColor: "rgba(255,255,255,0.08)" },
  iconBtnText: { color: "#fff", fontSize: 12 },

  /* Date / dropdown box */
  box: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", padding: 11,
    marginVertical: 4, borderRadius: 8,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
  },
  boxText: { fontSize: 13, color: "#333" },

  /* Dropdown list */
  dropdownList: {
    backgroundColor: "#fff", borderRadius: 8, paddingVertical: 6,
    paddingHorizontal: 12, marginBottom: 4,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2
  },
  dropdownItem: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0"
  },
  dropdownItemText: { fontSize: 13, color: "#333" },
  longPressHint: { fontSize: 10, color: "#bbb" },
  addDropdownBtn: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  link: { color: "#4B3F72", fontSize: 12 },

  /* Stats */
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 10, gap: 8 },
  statBox: {
    flex: 1, backgroundColor: "#e8f8f0", borderRadius: 10,
    alignItems: "center", paddingVertical: 10
  },
  statNum: { fontSize: 22, fontWeight: "800", color: "#27ae60" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2 },

  /* Mode */
  modeRow: { flexDirection: "row", marginBottom: 10, gap: 8 },
  modeBtn: {
    flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center",
    backgroundColor: "#e0e0e0", padding: 10, borderRadius: 10
  },
  activeMode: { backgroundColor: "#4B3F72" },
  modeBtnText: { fontSize: 13, color: "#555" },
  white: { color: "#fff" },

  /* Search */
  input: {
    backgroundColor: "#fff", padding: 11, marginVertical: 6,
    borderRadius: 8, fontSize: 13,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
  },

  /* Member card */
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", padding: 12,
    marginVertical: 4, borderRadius: 10,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
  },
  memberName: { fontSize: 13, fontWeight: "600", color: "#222" },
  statusBadge: { marginTop: 3, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },

  btnGroup: { flexDirection: "row", gap: 6 },
  btn: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: "center", justifyContent: "center"
  },
  btnOutlineGreen: { backgroundColor: "#27ae60" },
  btnOutlineRed: { backgroundColor: "#e74c3c" },
  btnGreyed: { backgroundColor: "#ccc", opacity: 0.5 },
  present: { backgroundColor: "#27ae60" },
  absent: { backgroundColor: "#e74c3c" },

  /* QR */
  qrWrapper: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  camera: { height: 320, borderRadius: 16 },
  qrOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  qrFrame: {
    width: 180, height: 180, borderWidth: 2,
    borderColor: "#fff", borderRadius: 12,
    backgroundColor: "transparent"
  },
  qrPlaceholder: {
    height: 260, backgroundColor: "#f0f0f0", borderRadius: 16,
    alignItems: "center", justifyContent: "center"
  },
  qrPlaceholderText: { color: "#aaa", marginTop: 10, fontSize: 13 },
  qrHint: { textAlign: "center", color: "#888", fontSize: 12, marginTop: 8 },
  scanFeedback: {
    marginTop: 8, padding: 10, borderRadius: 8, alignItems: "center"
  },
  rescanBtn: {
    backgroundColor: "#4B3F72", padding: 10, borderRadius: 8,
    alignItems: "center", marginTop: 8
  },

  /* Modal */
  modal: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBox: {
    backgroundColor: "#fff", margin: 24,
    padding: 20, borderRadius: 14
  },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 6, textAlign: "center", color: "#222" },

  saveBtn: {
    backgroundColor: "#27ae60", padding: 11,
    flex: 1, marginRight: 5, alignItems: "center",
    borderRadius: 8, flexDirection: "row", justifyContent: "center"
  },
  cancelBtn: {
    backgroundColor: "#888", padding: 11,
    flex: 1, alignItems: "center", borderRadius: 8
  },
  deleteBtn: {
    backgroundColor: "#e74c3c", padding: 11,
    marginTop: 10, alignItems: "center", borderRadius: 8
  },

  /* Log */
  logSubtitle: { textAlign: "center", color: "#888", fontSize: 12, marginBottom: 10 },
  logRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0"
  },
  logName: { fontSize: 13, color: "#333", flex: 1 },
  logBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  logBadgeText: { fontSize: 11, fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#bbb", marginVertical: 20 },

  /* Absence alert */
  alertIconWrap: { alignItems: "center", marginBottom: 8 },
  alertText: { textAlign: "center", color: "#555", fontSize: 13, marginBottom: 4, lineHeight: 20 },
});
