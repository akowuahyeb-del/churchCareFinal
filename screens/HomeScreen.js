
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl, TouchableOpacity, Modal, TextInput,
  Alert, Platform, Image, Dimensions, SafeAreaView, StatusBar
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";

/* ── components ── */
import AppHeader        from "../components/AppHeader";
import Section          from "../components/Section";
import StatCard         from "../components/StatCard";
import FeaturedEventCard from "../components/FeaturedEventCard";
import FlyerUploadModal  from "../components/FlyerUploadModal";
import PastorMessageCard from "../components/PastorMessageCard";
import EditableContentModal from "../components/EditableContentModal";
import EventsTabs       from "../components/EventsTabs";
import PreacherModal    from "../components/PreacherModal";
import QuickActions     from "../components/QuickActions";
import SectionHeader    from "../components/SectionHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";


/* ── firebase ── */
import { db, storage } from "../firebase";
import {
  collection, onSnapshot, doc,
  updateDoc, deleteDoc, setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const { width: W } = Dimensions.get("window");

// ── helpers ───────────────────────────────────────────────────────
const fmtDT = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString() + "  " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function HomeScreen() {
  const navigation = useNavigation();

  /* ── data state ── */
  const [events,      setEvents]      = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [program,     setProgram]     = useState([]);
  const [preachers,   setPreachers]   = useState([]);
  const [churchId, setChurchId] = useState(null);

  /* ── notifications (mock) ── */
  const [notifCount,  setNotifCount]  = useState(3);
  const [notifModal,  setNotifModal]  = useState(false);
  const MOCK_NOTIFS = [
    { id:1, icon:"people-outline",      color:"#0984E3", title:"5 new members registered",    time:"2 min ago"  },
    { id:2, icon:"checkmark-circle-outline", color:"#00B894", title:"Sunday attendance marked", time:"1 hr ago"   },
    { id:3, icon:"heart-outline",       color:"#E11D48", title:"New donation received: ₵200", time:"3 hrs ago"  },
  ];

  /* ── pastor message ── */
  const [pastorData,    setPastorData]    = useState({ title: "Message from Pastor", message: "Welcome! Stay blessed 🙏", expiry: null });
  const [pastorModal,   setPastorModal]   = useState(false);
  const [editTitle,     setEditTitle]     = useState("");
  const [editMessage,   setEditMessage]   = useState("");
  const [editExpiry,    setEditExpiry]    = useState(null);
  const [showDatePicker,setShowDatePicker]= useState(false);
  const [showTimePicker,setShowTimePicker]= useState(false);
  const [pickerDate,    setPickerDate]    = useState(new Date());

  /* ── featured event modal ── */
  const [selectedEvent,    setSelectedEvent]    = useState(null);
  const [eventModalVisible,setEventModalVisible]= useState(false);
  useEffect(() => {
  const loadChurchId = async () => {
    const id = await AsyncStorage.getItem("churchId");
    console.log("✅ Active Church:", id);
    setChurchId(id);
  };
  loadChurchId();
}, []);
  /* ── preacher ── */
  const [preacherModal,   setPreacherModal]   = useState(false);
  const [editingPreacher, setEditingPreacher] = useState(null);

  /* ── programme ── */
  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [editingProgram,      setEditingProgram]      = useState(null);

  /* ── QR modal ── */
  const [qrModal, setQrModal] = useState(false);

  /* ── firestore listeners ── */
//   useEffect(() => {
//     const u1 = onSnapshotcollection(db, "churches", churchId, "events")
// snap => {
//       setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
//     });
//     const u2 = onSnapshot(doc(db, "settings", "pastorMessage"), snap => {
//       if (snap.exists()) setPastorData(snap.data());
//     });
//     const u3 = onSnapshot(doc(db, "churches", churchId, "settings", "programList")
// , snap => {
//       if (snap.exists()) setProgram(snap.data().items || []);
//     });
//     return () => { u1(); u2(); u3(); };
//   }, []);



useEffect(() => {
  if (!churchId) return;   // ✅ prevents crash

  const u1 = onSnapshot(
    collection(db, "churches", churchId, "events"),
    snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
  );

  const u2 = onSnapshot(
    doc(db, "churches", churchId, "settings", "pastorMessage"),
    snap => {
      if (snap.exists()) setPastorData(snap.data());
    }
  );

  const u3 = onSnapshot(
    doc(db, "churches", churchId, "settings", "programList"),
    snap => {
      if (snap.exists()) setProgram(snap.data().items || []);
    }
  );

  return () => { u1(); u2(); u3(); };

}, [churchId]);




  const featuredEvents = events.filter(ev => ev.featured);
  const upcomingEvents = events.slice(0, 5);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  /* ── open pastor modal ── */
  const openPastorModal = () => {
    setEditTitle(pastorData.title || "");
    setEditMessage(pastorData.message || "");
    setEditExpiry(pastorData.expiry || null);
    setPickerDate(pastorData.expiry ? new Date(pastorData.expiry) : new Date());
    setPastorModal(true);
  };

  /* ── save pastor message ── */
  const savePastorMessage = async () => {
    if (!editTitle.trim()) { Alert.alert("Required", "Heading is required"); return; }
    const updated = { title: editTitle.trim(), message: editMessage.trim(), expiry: editExpiry };
    try {
      await setDoc(doc(db, "churches", churchId, "settings", "pastorMessage"), updated);
      setPastorData(updated);
      setPastorModal(false);
    } catch (e) { Alert.alert("Save failed", e.message); }
  };

  /* ── date / time picker handlers ── */
  const onDateChange = (e, selected) => {
    setShowDatePicker(false);
    if (!selected) return;
    const base = editExpiry ? new Date(editExpiry) : new Date();
    base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    setPickerDate(base);
    setEditExpiry(base.toISOString());
  };
  const onTimeChange = (e, selected) => {
    setShowTimePicker(false);
    if (!selected) return;
    const base = editExpiry ? new Date(editExpiry) : new Date();
    base.setHours(selected.getHours(), selected.getMinutes());
    setPickerDate(base);
    setEditExpiry(base.toISOString());
  };

  /* ══════════════════════════════════ RENDER ══════════════════════ */
  return (
    <View style={styles.safe}>

      {/* ── HEADER with notification bell ── */}
      <SafeAreaView style={{ backgroundColor: "#4B3F72" }}>
        <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
        <View style={styles.headerBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>ChurchCare</Text>
            <Text style={styles.headerSub}>Welcome back 👋</Text>
          </View>

          {/* ── 1. NOTIFICATION BELL ── */}
          <TouchableOpacity style={styles.headerIcon} onPress={() => { setNotifModal(true); setNotifCount(0); }}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {notifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Flyer upload icon */}
          <TouchableOpacity style={styles.headerIcon} onPress={() => setShowUpload(true)}>
            <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 2. FEATURED EVENTS — clean, no extra text ── */}
        {featuredEvents.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredHeader}>
              <Text style={styles.featuredHeading}>Featured Events</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 14, paddingRight: 6 }}>
              {featuredEvents.map(ev => (
                <FeaturedEventCard key={ev.id} event={ev}
                  onPress={() => { setSelectedEvent(ev); setEventModalVisible(true); }} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 6. PASTOR MESSAGE — tap to open stable modal ── */}
        <TouchableOpacity onPress={openPastorModal} activeOpacity={0.85} style={styles.pastorCard}>
          <View style={styles.pastorCardLeft}>
            <Ionicons name="book-outline" size={20} color="#4B3F72" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pastorCardTitle} numberOfLines={1}>{pastorData.title}</Text>
            <Text style={styles.pastorCardMsg} numberOfLines={2}>{pastorData.message}</Text>
            {pastorData.expiry && (
              <Text style={styles.pastorExpiry}>⏱ Expires {fmtDT(pastorData.expiry)}</Text>
            )}
          </View>
          <Ionicons name="pencil-outline" size={16} color="#4B3F72" />
        </TouchableOpacity>

        {/* ── OVERVIEW STATS ── */}
        <Section title="Overview">
          <View style={styles.statsRow}>
            <StatCard label="Members"    value="245" />
            <StatCard label="Attendance" value="180" />
          </View>
        </Section>

        {/* ── 4. QUICK ACTIONS with QR ── */}
        <View style={styles.qaSection}>
          <View style={styles.qaHeaderRow}>
            <Text style={styles.qaHeading}>Quick Actions</Text>
          </View>
          <View style={styles.qaRow}>
            {[
              { icon: "checkmark-circle-outline", label: "Attendance", onPress: () => navigation.navigate("Attendance") },
              { icon: "people-outline",            label: "Members",    onPress: () => navigation.navigate("Members")    },
              { icon: "bar-chart-outline",         label: "Reports",    onPress: () => navigation.navigate("AdminDashboard") },
              { icon: "heart-outline",             label: "Donate",     onPress: () => navigation.navigate("Donate")    },
              { icon: "help-circle-outline",       label: "Help",       onPress: () => navigation.navigate("Help")      },
              { icon: "qr-code-outline",           label: "QR Code",    onPress: () => setQrModal(true)                 },
            ].map(a => (
              <TouchableOpacity key={a.label} style={styles.qaItem} onPress={a.onPress} activeOpacity={0.75}>
                <View style={styles.qaCircle}>
                  <Ionicons name={a.icon} size={22} color="#fff" />
                </View>
                <Text style={styles.qaLabel} numberOfLines={1}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SERVICE FLOW / EVENTS TABS ── */}
        <Section title="Service Flow">
          <EventsTabs
            events={upcomingEvents}
            program={program}
            preachers={preachers}
            setProgram={setProgram}
            /* 3. Preacher modal wired up */
            onAddPreacher={() => { setEditingPreacher(null); setPreacherModal(true); }}
            onEditPreacher={(p) => { setEditingPreacher(p); setPreacherModal(true); }}
          />
        </Section>

      </ScrollView>

      {/* ══ NOTIFICATION MODAL ══ */}
      <Modal visible={notifModal} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setNotifModal(false)}>
          <View style={styles.notifSheet}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifModal(false)}>
                <Ionicons name="close" size={20} color="#aaa" />
              </TouchableOpacity>
            </View>
            {MOCK_NOTIFS.map(n => (
              <View key={n.id} style={styles.notifRow}>
                <View style={[styles.notifIcon, { backgroundColor: n.color + "18" }]}>
                  <Ionicons name={n.icon} size={18} color={n.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifText}>{n.title}</Text>
                  <Text style={styles.notifTime}>{n.time}</Text>
                </View>
              </View>
            ))}
            {MOCK_NOTIFS.length === 0 && (
              <Text style={{ textAlign: "center", color: "#bbb", padding: 20 }}>No notifications</Text>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ══ 6. PASTOR MESSAGE MODAL — stable, full-featured ══ */}
      <Modal visible={pastorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandleRow}><View style={styles.modalHandle} /></View>

            <Text style={styles.modalTitle}>Message from Pastor</Text>
            <Text style={styles.modalSub}>Edit the heading, message and optional expiry.</Text>

            <Text style={styles.fieldLabel}>Heading *</Text>
            <TextInput style={styles.input} placeholder="e.g. Message from Pastor"
              value={editTitle} onChangeText={setEditTitle} />

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              placeholder="Type the pastor's message…"
              value={editMessage} onChangeText={setEditMessage} multiline />

            {/* Expiry section */}
            <Text style={styles.fieldLabel}>Auto-hide expiry (optional)</Text>
            <View style={styles.expiryRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={14} color="#4B3F72" />
                <Text style={styles.dateBtnText}>
                  {editExpiry ? new Date(editExpiry).toLocaleDateString() : "Set date"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={14} color="#4B3F72" />
                <Text style={styles.dateBtnText}>
                  {editExpiry
                    ? new Date(editExpiry).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Set time"
                  }
                </Text>
              </TouchableOpacity>
              {editExpiry && (
                <TouchableOpacity style={styles.clearExpiry} onPress={() => setEditExpiry(null)}>
                  <Ionicons name="close-circle" size={18} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker value={pickerDate} mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange} />
            )}
            {showTimePicker && (
              <DateTimePicker value={pickerDate} mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange} />
            )}

            {editExpiry && (
              <Text style={styles.expiryPreview}>
                Message will hide after {fmtDT(editExpiry)}
              </Text>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={savePastorMessage}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPastorModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ 4. QR CODE MODAL ══ */}
      <Modal visible={qrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { alignItems: "center" }]}>
            <View style={styles.modalHandleRow}><View style={styles.modalHandle} /></View>
            <Text style={styles.modalTitle}>Church QR Code</Text>
            <Text style={styles.modalSub}>Members scan this to check-in at the entrance</Text>

            {/* QR placeholder — replace with <QRCode value={churchId} size={200} /> when react-native-qrcode-svg is installed */}
            <View style={styles.qrBox}>
              <Ionicons name="qr-code-outline" size={120} color="#4B3F72" />
              <Text style={styles.qrLabel}>Install react-native-qrcode-svg{"\n"}to render the live QR</Text>
            </View>

            <View style={styles.qrInfoRow}>
              <Ionicons name="location-outline" size={14} color="#4B3F72" />
              <Text style={styles.qrInfoText}>Main Branch · Accra</Text>
            </View>

            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrBtn} onPress={() => Alert.alert("Share", "QR shared!")}>
                <Ionicons name="share-outline" size={16} color="#fff" />
                <Text style={styles.qrBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.qrBtn, { backgroundColor: "#0984E3" }]}
                onPress={() => Alert.alert("Download", "QR saved to gallery!")}>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={styles.qrBtnText}>Download</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setQrModal(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ FEATURED EVENT MODAL ══ */}
      {selectedEvent && (
        <EditableContentModal
          visible={eventModalVisible}
          onClose={() => setEventModalVisible(false)}
          titleValue={selectedEvent.title}
          messageValue={selectedEvent.description}
          onSave={async (data) => {
            await updateDoc(doc(db, "events", selectedEvent.id), {
              title: data.title, description: data.message
            });
          }}
          onDelete={async () => {
            await deleteDoc(doc(db, "events", selectedEvent.id));
            setEventModalVisible(false);
          }}
        />
      )}

      {/* ══ 3. PREACHER MODAL — wired ══ */}
      <PreacherModal
        visible={preacherModal}
        onClose={() => setPreacherModal(false)}
        initialData={editingPreacher}
        onSave={(data) => {
          if (data.delete && editingPreacher) {
            setPreachers(p => p.filter(x => x.id !== editingPreacher.id));
            return;
          }
          if (editingPreacher) {
            setPreachers(p => p.map(x => x.id === editingPreacher.id ? { ...x, ...data } : x));
          } else {
            setPreachers(p => [...p, { ...data, id: Date.now().toString() }]);
          }
          setPreacherModal(false);
        }}
      />

      {/* ══ PROGRAMME MODAL ══ */}
      <EditableContentModal
        visible={programModalVisible}
        onClose={() => setProgramModalVisible(false)}
        titleValue={editingProgram?.item || ""}
        onSave={(data) => {
          if (data.delete && editingProgram) {
            setProgram(p => p.filter(x => x.id !== editingProgram.id));
            return;
          }
          if (editingProgram) {
            setProgram(p => p.map(x => x.id === editingProgram.id ? { ...x, item: data.title } : x));
          } else {
            setProgram(p => [...p, { id: Date.now().toString(), item: data.title }]);
          }
          setProgramModalVisible(false);
        }}
      />

      {/* ══ FLYER UPLOAD ══ */}
      <FlyerUploadModal visible={showUpload} onClose={() => setShowUpload(false)} />

    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { paddingBottom: 110 },

  /* Header */
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 1 },
  headerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginLeft: 8, position: "relative" },
  notifBadge: { position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center" },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  /* Featured Events */
  featuredSection: { marginTop: 14 },
  featuredHeader: { paddingHorizontal: 14, marginBottom: 10 },
  featuredHeading: { fontSize: 15, fontWeight: "800", color: "#222" },

  /* Pastor card */
  pastorCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 14, marginTop: 12, borderRadius: 14, padding: 14, gap: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: "#4B3F72" },
  pastorCardLeft: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  pastorCardTitle: { fontSize: 13, fontWeight: "800", color: "#222" },
  pastorCardMsg: { fontSize: 12, color: "#666", marginTop: 3, lineHeight: 17 },
  pastorExpiry: { fontSize: 10, color: "#6c47b8", marginTop: 4 },

  /* Stats */
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14 },

  /* Quick actions */
  qaSection: { paddingHorizontal: 14, marginTop: 18, marginBottom: 6 },
  qaHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  qaHeading: { fontSize: 15, fontWeight: "800", color: "#222" },
  qaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  qaItem: { width: "30%", alignItems: "center" },
  qaCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#3C3A4E", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6 },
  qaLabel: { fontSize: 10, fontWeight: "700", color: "#444", marginTop: 6, textAlign: "center" },

  /* Notification modal */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start" },
  notifSheet: { backgroundColor: "#fff", margin: 14, marginTop: 90, borderRadius: 16, padding: 16, elevation: 10 },
  notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  notifTitle: { fontSize: 15, fontWeight: "800", color: "#222" },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  notifIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifText: { fontSize: 13, color: "#222", fontWeight: "600" },
  notifTime: { fontSize: 11, color: "#aaa", marginTop: 2 },

  /* Shared modal styles */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  modalHandleRow: { alignItems: "center", marginBottom: 14 },
  modalHandle: { width: 36, height: 4, backgroundColor: "#ddd", borderRadius: 2 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#222", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 18 },

  /* Pastor modal fields */
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 5, marginTop: 12 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 12, padding: 12, fontSize: 13, color: "#222", borderWidth: 1.5, borderColor: "#eee" },
  expiryRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 6 },
  dateBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: "#eee" },
  dateBtnText: { fontSize: 12, color: "#4B3F72", fontWeight: "600", flex: 1 },
  clearExpiry: { padding: 4 },
  expiryPreview: { fontSize: 11, color: "#6c47b8", marginBottom: 10, fontStyle: "italic" },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", borderRadius: 12, padding: 14, marginTop: 14, gap: 8 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cancelBtn: { alignItems: "center", padding: 12, marginTop: 4 },
  cancelBtnText: { color: "#888", fontSize: 13 },

  /* QR modal */
  qrBox: { width: 200, height: 200, backgroundColor: "#f5f5f5", borderRadius: 16, alignItems: "center", justifyContent: "center", marginVertical: 16, borderWidth: 2, borderColor: "#eee", borderStyle: "dashed" },
  qrLabel: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 8, lineHeight: 16 },
  qrInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  qrInfoText: { fontSize: 13, color: "#4B3F72", fontWeight: "600" },
  qrActions: { flexDirection: "row", gap: 10, marginBottom: 8, width: "100%" },
  qrBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", borderRadius: 12, padding: 12, gap: 6 },
  qrBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

