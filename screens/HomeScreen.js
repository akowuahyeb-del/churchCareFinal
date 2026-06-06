

import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions, Modal,
  Pressable, TextInput, Alert, Platform,
  SafeAreaView, StatusBar
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db, storage } from "../firebase";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, updateDoc, query, where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const { width: SCREEN_W } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {

  const scrollRef    = useRef(null);
  const currentIndex = useRef(0);

  const [activeIndex,   setActiveIndex]   = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  /* ── CAROUSEL HEADING ── */
  const [carouselHeading,        setCarouselHeading]        = useState("Featured Events");
  const [editingCarouselHeading, setEditingCarouselHeading] = useState(false);

  /* ── PASTOR MESSAGE ── */
  const [pastorHeading,        setPastorHeading]        = useState("Message from Pastor");
  const [pastorMessage,        setPastorMessage]        = useState("Stay strong in faith. Continue to grow spiritually.");
  const [editingPastorHeading, setEditingPastorHeading] = useState(false);
  const [editingPastorMessage, setEditingPastorMessage] = useState(false);

  /* ── FLYERS (persisted in Firebase) ── */
  const [flyers,              setFlyers]              = useState([]);
  const [flyerSectionVisible, setFlyerSectionVisible] = useState(true);
  const [manageFlyersExpanded,setManageFlyersExpanded]= useState(true);
  const [uploadingFlyer,      setUploadingFlyer]      = useState(false);

  /* ── FLYER EXPIRY ── */
  const [flyerExpiryModal,    setFlyerExpiryModal]    = useState(false);
  const [flyerExpiryTarget,   setFlyerExpiryTarget]   = useState(null);
  const [flyerExpiryDate,     setFlyerExpiryDate]     = useState(new Date());
  const [showFlyerDatePicker, setShowFlyerDatePicker] = useState(false);
  const [showFlyerTimePicker, setShowFlyerTimePicker] = useState(false);

  /* ── FLYER DELETE ── */
  const [flyerToDelete,           setFlyerToDelete]           = useState(null);
  const [deleteFlyerModalVisible, setDeleteFlyerModalVisible] = useState(false);

  /* ── EVENTS (3-tab) ── */
  const [eventsTab,    setEventsTab]    = useState("upcoming"); // upcoming | program | preacher
  const [eventsVisible,setEventsVisible]= useState(true);

  const [events, setEvents] = useState([
    { id: "1", title: "Sunday Service", date: "9:00 AM",    desc: "Main worship",     active: true, expiry: null },
    { id: "2", title: "Youth Meetup",   date: "Friday 6PM", desc: "Youth fellowship", active: true, expiry: null },
  ]);

  /* ── PROGRAM ── */
  const [program, setProgram] = useState([
    { id: "1", time: "9:00 AM", item: "Opening Prayer" },
    { id: "2", time: "9:15 AM", item: "Praise & Worship" },
    { id: "3", time: "10:00 AM",item: "Sermon" },
    { id: "4", time: "11:00 AM",item: "Offering" },
    { id: "5", time: "11:15 AM",item: "Announcements & Benediction" },
  ]);
  const [programModal,     setProgramModal]     = useState(false);
  const [programEditId,    setProgramEditId]    = useState(null);
  const [programTime,      setProgramTime]      = useState("");
  const [programItem,      setProgramItem]      = useState("");
  const [programDeleteId,  setProgramDeleteId]  = useState(null);
  const [programDeleteModal,setProgramDeleteModal]=useState(false);

  /* ── PREACHER ── */
  const [preacher, setPreacher] = useState({
    name: "", title: "", bio: "", topic: "", photo: null
  });
  const [preacherModal,    setPreacherModal]    = useState(false);
  const [editPreacher,     setEditPreacher]     = useState({ ...preacher });
  const [uploadingPreacher,setUploadingPreacher]= useState(false);

  /* ── EVENT EXPIRY ── */
  const [eventExpiryModal,    setEventExpiryModal]    = useState(false);
  const [eventExpiryTarget,   setEventExpiryTarget]   = useState(null);
  const [eventExpiryDate,     setEventExpiryDate]     = useState(new Date());
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [showEventTimePicker, setShowEventTimePicker] = useState(false);

  /* ── EVENT CRUD ── */
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible,   setEditModalVisible]   = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingEvent,  setEditingEvent]  = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate,  setNewDate]  = useState("");
  const [newDesc,  setNewDesc]  = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDate,  setEditDate]  = useState("");
  const [editDesc,  setEditDesc]  = useState("");

  /* ══════════════ INIT ══════════════ */
  useEffect(() => { loadFlyers(); }, []);

  /* ══════════════ FLYERS — Firebase persistence ══════════════ */
  const loadFlyers = async () => {
    try {
      const snap = await getDocs(collection(db, "flyers"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFlyers(data);
    } catch (e) { console.log("loadFlyers:", e); }
  };

  const now          = new Date();
  const activeFlyers = flyerSectionVisible
    ? flyers.filter(f => f.active && (!f.expiry || new Date(f.expiry) > now))
    : [];
  const showCarousel = activeFlyers.length > 0;

  /* Upload flyer → Firebase Storage + Firestore */
  const handleUpload = () => {
    Alert.alert("Upload Flyer", "Choose a source", [
      {
        text: "Photo Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8
          });
          if (!result.canceled) await uploadFlyerToFirebase(result.assets[0].uri);
        }
      },
      {
        text: "Take Photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access."); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
          if (!result.canceled) await uploadFlyerToFirebase(result.assets[0].uri);
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const uploadFlyerToFirebase = async (uri) => {
    setUploadingFlyer(true);
    try {
      const response  = await fetch(uri);
      const blob      = await response.blob();
      const filename  = `flyers/${Date.now()}.jpg`;
      const storageRef= ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      await addDoc(collection(db, "flyers"), {
        imageUrl: downloadURL,
        active:   true,
        expiry:   null,
        uploadedAt: new Date().toISOString(),
      });
      await loadFlyers();
      Alert.alert("✅ Flyer uploaded", "It will appear in the carousel.");
    } catch (e) {
      Alert.alert("Upload failed", e.message);
    } finally { setUploadingFlyer(false); }
  };

  const openFlyerExpiry = (id) => {
    setFlyerExpiryTarget(id);
    const existing = flyers.find(f => f.id === id)?.expiry;
    setFlyerExpiryDate(existing ? new Date(existing) : new Date());
    setFlyerExpiryModal(true);
  };
  const saveFlyerExpiry = async () => {
    try {
      await updateDoc(doc(db, "flyers", flyerExpiryTarget), {
        expiry: flyerExpiryDate.toISOString()
      });
      await loadFlyers();
    } catch (e) { console.log(e); }
    setFlyerExpiryModal(false);
  };
  const clearFlyerExpiry = async () => {
    try {
      await updateDoc(doc(db, "flyers", flyerExpiryTarget), { expiry: null });
      await loadFlyers();
    } catch (e) { console.log(e); }
    setFlyerExpiryModal(false);
  };
  const toggleFlyerActive = async (id, current) => {
    try {
      await updateDoc(doc(db, "flyers", id), { active: !current });
      await loadFlyers();
    } catch (e) { console.log(e); }
  };
  const confirmDeleteFlyer = async () => {
    try {
      await deleteDoc(doc(db, "flyers", flyerToDelete.id));
      await loadFlyers();
    } catch (e) { console.log(e); }
    setDeleteFlyerModalVisible(false);
    setFlyerToDelete(null);
  };

  /* ══════════════ AUTO-SLIDE ══════════════ */
  useEffect(() => {
    if (activeFlyers.length === 0) return;
    const interval = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % activeFlyers.length;
      setActiveIndex(currentIndex.current);
      scrollRef.current?.scrollTo({ x: currentIndex.current * (SCREEN_W - 30), animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [flyers, flyerSectionVisible]);

  /* ══════════════ EVENTS ══════════════ */
  const activeEvents = events.filter(e => e.active && (!e.expiry || new Date(e.expiry) > now));

  const openEventExpiry = (id) => {
    setEventExpiryTarget(id);
    const existing = events.find(e => e.id === id)?.expiry;
    setEventExpiryDate(existing ? new Date(existing) : new Date());
    setEventExpiryModal(true);
  };
  const saveEventExpiry = () => {
    setEvents(prev => prev.map(e =>
      e.id === eventExpiryTarget ? { ...e, expiry: eventExpiryDate.toISOString() } : e
    ));
    setEventExpiryModal(false);
  };
  const clearEventExpiry = () => {
    setEvents(prev => prev.map(e =>
      e.id === eventExpiryTarget ? { ...e, expiry: null } : e
    ));
    setEventExpiryModal(false);
  };
  const createEvent = () => {
    if (!newTitle.trim()) return;
    setEvents(prev => [{ id: Date.now().toString(), title: newTitle, date: newDate, desc: newDesc, active: true, expiry: null }, ...prev]);
    setCreateModalVisible(false);
    setNewTitle(""); setNewDate(""); setNewDesc("");
  };
  const editEvent = (event) => {
    setEditingEvent(event);
    setEditTitle(event.title); setEditDate(event.date); setEditDesc(event.desc);
    setEditModalVisible(true);
  };
  const saveEdit = () => {
    setEvents(prev => prev.map(e =>
      e.id === editingEvent.id ? { ...e, title: editTitle, date: editDate, desc: editDesc } : e
    ));
    setEditModalVisible(false);
  };
  const deleteEvent   = (event) => { setEventToDelete(event); setDeleteModalVisible(true); };
  const confirmDelete = () => {
    setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
    setDeleteModalVisible(false);
  };

  /* ══════════════ PROGRAM ══════════════ */
  const openProgramModal = (item = null) => {
    setProgramEditId(item?.id || null);
    setProgramTime(item?.time || "");
    setProgramItem(item?.item || "");
    setProgramModal(true);
  };
  const saveProgram = () => {
    if (!programItem.trim()) return;
    if (programEditId) {
      setProgram(prev => prev.map(p => p.id === programEditId ? { ...p, time: programTime, item: programItem } : p));
    } else {
      setProgram(prev => [...prev, { id: Date.now().toString(), time: programTime, item: programItem }]);
    }
    setProgramModal(false);
  };
  const confirmDeleteProgram = () => {
    setProgram(prev => prev.filter(p => p.id !== programDeleteId));
    setProgramDeleteModal(false);
    setProgramDeleteId(null);
  };

  /* ══════════════ PREACHER PHOTO ══════════════ */
  const pickPreacherPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8
    });
    if (!result.canceled) {
      setUploadingPreacher(true);
      try {
        const uri      = result.assets[0].uri;
        const response = await fetch(uri);
        const blob     = await response.blob();
        const storageRef= ref(storage, `preachers/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        setEditPreacher(prev => ({ ...prev, photo: url }));
      } catch (e) { Alert.alert("Upload failed", e.message); }
      finally { setUploadingPreacher(false); }
    }
  };

  /* ══════════════ NAVIGATION ══════════════ */
  const goToMembers = () => navigation.jumpTo("Members", { screen: "MembersMain" });
  const goToDonate  = () => navigation.navigate("Donate");

  /* ══════════════ HELPERS ══════════════ */
  const fmtDateTime = (iso) => {
    if (!iso) return "No expiry";
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /* ══════════════ RENDER ══════════════ */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>ChurchCare</Text>
            <Text style={styles.headerSub}>Welcome Back</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── 1. CAROUSEL ── */}
        <View style={styles.carouselWrapper}>
          <View style={styles.carouselHeadingRow}>
            {editingCarouselHeading ? (
              <TextInput style={styles.inlineInput} value={carouselHeading} onChangeText={setCarouselHeading}
                autoFocus onBlur={() => setEditingCarouselHeading(false)} onSubmitEditing={() => setEditingCarouselHeading(false)} />
            ) : (
              <TouchableOpacity onPress={() => setEditingCarouselHeading(true)} style={{ flex: 1 }}>
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {carouselHeading}{"  "}<Ionicons name="pencil-outline" size={12} color="#4B3F72" />
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploadingFlyer}>
              <Ionicons name="cloud-upload-outline" size={13} color="#fff" />
              <Text style={styles.uploadBtnText}>{uploadingFlyer ? "..." : "Upload"}</Text>
            </TouchableOpacity>
          </View>

          {showCarousel ? (
            <>
              <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {activeFlyers.map(item => (
                  <TouchableOpacity key={item.id}
                    onPress={() => setSelectedImage({ uri: item.imageUrl })}
                    style={{ width: SCREEN_W - 30 }}>
                    <Image source={{ uri: item.imageUrl }} style={styles.carouselImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.dotsContainer}>
                {activeFlyers.map((_, i) => <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />)}
              </View>
            </>
          ) : (
            <View style={styles.noFlyerBox}>
              <Ionicons name="images-outline" size={28} color="#ccc" />
              <Text style={styles.noFlyerText}>No active flyers</Text>
            </View>
          )}
        </View>

        {/* ── 2. MESSAGE FROM PASTOR ── */}
        <View style={styles.messageCard}>
          {editingPastorHeading ? (
            <TextInput style={styles.inlineInput} value={pastorHeading} onChangeText={setPastorHeading}
              autoFocus onBlur={() => setEditingPastorHeading(false)} onSubmitEditing={() => setEditingPastorHeading(false)} />
          ) : (
            <TouchableOpacity onPress={() => setEditingPastorHeading(true)}>
              <Text style={styles.messageTitle}>
                {pastorHeading}{"  "}<Ionicons name="pencil-outline" size={11} color="#4B3F72" />
              </Text>
            </TouchableOpacity>
          )}
          {editingPastorMessage ? (
            <TextInput style={[styles.inlineInput, { fontSize: 13, marginTop: 4 }]} value={pastorMessage}
              onChangeText={setPastorMessage} multiline autoFocus onBlur={() => setEditingPastorMessage(false)} />
          ) : (
            <TouchableOpacity onPress={() => setEditingPastorMessage(true)}>
              <Text style={styles.messageText}>
                {pastorMessage}{"  "}<Ionicons name="pencil-outline" size={10} color="#bbb" />
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 3. MANAGE FLYERS ── */}
        <View style={styles.adminPanel}>
          <View style={styles.manageFlyersHeader}>
            <Text style={styles.adminTitle}>Manage Flyers</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity style={[styles.toggleAllBtn, { backgroundColor: flyerSectionVisible ? "#4B3F72" : "#1BA97F" }]}
                onPress={() => setFlyerSectionVisible(p => !p)}>
                <Ionicons name={flyerSectionVisible ? "eye-off-outline" : "eye-outline"} size={12} color="#fff" />
                <Text style={styles.toggleAllText}>{flyerSectionVisible ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleAllBtn, { backgroundColor: "#888" }]}
                onPress={() => setManageFlyersExpanded(p => !p)}>
                <Ionicons name={manageFlyersExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={12} color="#fff" />
                <Text style={styles.toggleAllText}>{manageFlyersExpanded ? "Collapse" : "Expand"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {manageFlyersExpanded && flyers.map(item => (
            <View key={item.id} style={styles.adminRow}>
              <Image source={{ uri: item.imageUrl }} style={styles.adminImage} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.statusText}>{item.active ? "Active" : "Inactive"}</Text>
                {item.expiry && <Text style={styles.expiryBadge}>⏱ {fmtDateTime(item.expiry)}</Text>}
              </View>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: "#6c47b8" }]}
                onPress={() => openFlyerExpiry(item.id)}>
                <Ionicons name="time-outline" size={11} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: item.active ? "#ff4d4d" : "#1BA97F", marginLeft: 4 }]}
                onPress={() => toggleFlyerActive(item.id, item.active)}>
                <Text style={styles.adminBtnText}>{item.active ? "Deact." : "Activ."}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: "#7f1d1d", marginLeft: 4 }]}
                onPress={() => { setFlyerToDelete(item); setDeleteFlyerModalVisible(true); }}>
                <Text style={styles.adminBtnText}>Del</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── 4. QUICK ACTIONS ── */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: 15, marginTop: 6 }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#EEF2FF" }]}
            onPress={() => navigation.navigate("Attendance")}>
            <View style={[styles.quickIcon, { backgroundColor: "#4F46E5" }]}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#4F46E5" }]} numberOfLines={1}>Attendance</Text>
            <Text style={styles.quickSub} numberOfLines={1}>Mark & track</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#ECFDF5" }]}
            onPress={goToMembers}>
            <View style={[styles.quickIcon, { backgroundColor: "#059669" }]}>
              <Ionicons name="people" size={20} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#059669" }]} numberOfLines={1}>Members</Text>
            <Text style={styles.quickSub} numberOfLines={1}>View all</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#FFFBEB" }]}
            onPress={() => navigation.navigate("AdminDashboard")}>
            <View style={[styles.quickIcon, { backgroundColor: "#D97706" }]}>
              <Ionicons name="bar-chart" size={20} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#D97706" }]} numberOfLines={1}>Reports</Text>
            <Text style={styles.quickSub} numberOfLines={1}>Dashboard</Text>
          </TouchableOpacity>

          {/* ✅ Donate — fixed navigation */}
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#FFF1F2" }]}
            onPress={goToDonate}>
            <View style={[styles.quickIcon, { backgroundColor: "#E11D48" }]}>
              <Ionicons name="heart" size={20} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#E11D48" }]} numberOfLines={1}>Donate</Text>
            <Text style={styles.quickSub} numberOfLines={1}>Give now</Text>
          </TouchableOpacity>

        </View>

        {/* ── 5. EVENTS (3 TABS) ── */}
        <View style={{ paddingHorizontal: 15, marginTop: 14 }}>

          {/* Section header */}
          <View style={styles.eventsSectionHeader}>
            <Text style={styles.sectionTitle}>Events & Services</Text>
            <TouchableOpacity style={[styles.toggleAllBtn, { backgroundColor: eventsVisible ? "#4B3F72" : "#1BA97F" }]}
              onPress={() => setEventsVisible(p => !p)}>
              <Ionicons name={eventsVisible ? "eye-off-outline" : "eye-outline"} size={12} color="#fff" />
              <Text style={styles.toggleAllText}>{eventsVisible ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          {eventsVisible && (
            <>
              {/* Tab row */}
              <View style={styles.tabRow}>
                {[
                  { key: "upcoming", label: "Upcoming",  icon: "calendar-outline"  },
                  { key: "program",  label: "Programme", icon: "list-outline"       },
                  { key: "preacher", label: "Preacher",  icon: "person-outline"    },
                ].map(tab => (
                  <TouchableOpacity key={tab.key}
                    style={[styles.tabBtn, eventsTab === tab.key && styles.tabBtnActive]}
                    onPress={() => setEventsTab(tab.key)}>
                    <Ionicons name={tab.icon} size={13} color={eventsTab === tab.key ? "#4B3F72" : "#aaa"} />
                    <Text style={[styles.tabBtnText, eventsTab === tab.key && styles.tabBtnTextActive]}
                      numberOfLines={1}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── TAB: UPCOMING EVENTS ── */}
              {eventsTab === "upcoming" && (
                <>
                  <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
                    <Ionicons name="add-circle-outline" size={15} color="#fff" />
                    <Text style={styles.addBtnText}>Add Event</Text>
                  </TouchableOpacity>

                  {activeEvents.map(event => (
                    <View key={event.id} style={styles.eventCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.eventDate}>{event.date}</Text>
                        <Text style={styles.eventDesc} numberOfLines={2}>{event.desc}</Text>
                        {event.expiry && <Text style={styles.expiryBadge}>⏱ {fmtDateTime(event.expiry)}</Text>}
                      </View>
                      <View style={{ alignItems: "center", gap: 8, paddingLeft: 8 }}>
                        <TouchableOpacity onPress={() => openEventExpiry(event.id)}>
                          <Ionicons name="time-outline" size={19} color="#6c47b8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => editEvent(event)}>
                          <Ionicons name="create-outline" size={19} color="#1BA97F" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteEvent(event)}>
                          <Ionicons name="trash-outline" size={19} color="#ff4d4d" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* ── TAB: PROGRAMME / ORDER OF SERVICE ── */}
              {eventsTab === "program" && (
                <>
                  <TouchableOpacity style={styles.addBtn} onPress={() => openProgramModal()}>
                    <Ionicons name="add-circle-outline" size={15} color="#fff" />
                    <Text style={styles.addBtnText}>Add Item</Text>
                  </TouchableOpacity>

                  {program.map((p, idx) => (
                    <View key={p.id} style={styles.programRow}>
                      <View style={styles.programNum}>
                        <Text style={styles.programNumText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.programItem} numberOfLines={1}>{p.item}</Text>
                        {p.time ? <Text style={styles.programTime}>{p.time}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => openProgramModal(p)} style={styles.programAction}>
                        <Ionicons name="create-outline" size={17} color="#1BA97F" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setProgramDeleteId(p.id); setProgramDeleteModal(true); }} style={styles.programAction}>
                        <Ionicons name="trash-outline" size={17} color="#ff4d4d" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {/* ── TAB: PREACHER / SPEAKER ── */}
              {eventsTab === "preacher" && (
                <View style={styles.preacherCard}>
                  {preacher.photo ? (
                    <Image source={{ uri: preacher.photo }} style={styles.preacherPhoto} />
                  ) : (
                    <View style={styles.preacherPhotoPlaceholder}>
                      <Ionicons name="person-outline" size={42} color="#ccc" />
                    </View>
                  )}
                  {preacher.name ? (
                    <>
                      <Text style={styles.preacherName}>{preacher.name}</Text>
                      {preacher.title ? <Text style={styles.preacherTitle}>{preacher.title}</Text> : null}
                      {preacher.topic ? (
                        <View style={styles.preacherTopicBox}>
                          <Text style={styles.preacherTopicLabel}>Topic</Text>
                          <Text style={styles.preacherTopic}>{preacher.topic}</Text>
                        </View>
                      ) : null}
                      {preacher.bio ? (
                        <View style={styles.preacherBioBox}>
                          <Text style={styles.preacherBioLabel}>Profile</Text>
                          <Text style={styles.preacherBio}>{preacher.bio}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.preacherEmpty}>No preacher set for this service</Text>
                  )}
                  <TouchableOpacity style={[styles.addBtn, { marginTop: 16 }]}
                    onPress={() => { setEditPreacher({ ...preacher }); setPreacherModal(true); }}>
                    <Ionicons name={preacher.name ? "create-outline" : "add-circle-outline"} size={15} color="#fff" />
                    <Text style={styles.addBtnText}>{preacher.name ? "Edit Preacher" : "Add Preacher"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

      </ScrollView>

      {/* ══════════ MODALS ══════════ */}

      {/* Create Event */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Create Event</Text>
          <TextInput style={styles.input} placeholder="Title" value={newTitle} onChangeText={setNewTitle} />
          <TextInput style={styles.input} placeholder="Date / Time" value={newDate} onChangeText={setNewDate} />
          <TextInput style={styles.input} placeholder="Description" value={newDesc} onChangeText={setNewDesc} multiline />
          <TouchableOpacity style={styles.modalBtn} onPress={createEvent}><Text style={styles.white}>Create</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setCreateModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Edit Event */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Edit Event</Text>
          <TextInput style={styles.input} placeholder="Title" value={editTitle} onChangeText={setEditTitle} />
          <TextInput style={styles.input} placeholder="Date / Time" value={editDate} onChangeText={setEditDate} />
          <TextInput style={styles.input} placeholder="Description" value={editDesc} onChangeText={setEditDesc} multiline />
          <TouchableOpacity style={styles.modalBtn} onPress={saveEdit}><Text style={styles.white}>Save Changes</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setEditModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Delete Event */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Delete Event?</Text>
          <Text style={styles.modalSubText}>"{eventToDelete?.title}" will be permanently removed.</Text>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d" }]} onPress={confirmDelete}><Text style={styles.white}>Yes, Delete</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setDeleteModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Delete Flyer */}
      <Modal visible={deleteFlyerModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Delete Flyer?</Text>
          <Text style={styles.modalSubText}>This flyer will be permanently removed from Firebase.</Text>
          {flyerToDelete?.imageUrl && <Image source={{ uri: flyerToDelete.imageUrl }} style={styles.flyerPreview} />}
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d", marginTop: 12 }]} onPress={confirmDeleteFlyer}><Text style={styles.white}>Yes, Delete</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setDeleteFlyerModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Flyer Expiry */}
      <Modal visible={flyerExpiryModal} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Set Flyer Expiry</Text>
          <Text style={styles.modalSubText}>Flyer auto-hides from carousel after this date & time.</Text>
          <Text style={styles.pickerLabel}>Date</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowFlyerDatePicker(true)}>
            <Ionicons name="calendar-outline" size={15} color="#4B3F72" />
            <Text style={styles.pickerValue}>{flyerExpiryDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showFlyerDatePicker && (
            <DateTimePicker value={flyerExpiryDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowFlyerDatePicker(false); if (d) setFlyerExpiryDate(prev => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; }); }} />
          )}
          <Text style={styles.pickerLabel}>Time</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowFlyerTimePicker(true)}>
            <Ionicons name="time-outline" size={15} color="#4B3F72" />
            <Text style={styles.pickerValue}>{flyerExpiryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </TouchableOpacity>
          {showFlyerTimePicker && (
            <DateTimePicker value={flyerExpiryDate} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowFlyerTimePicker(false); if (d) setFlyerExpiryDate(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }} />
          )}
          <TouchableOpacity style={[styles.modalBtn, { marginTop: 12 }]} onPress={saveFlyerExpiry}><Text style={styles.white}>Save Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#e74c3c", marginTop: 6 }]} onPress={clearFlyerExpiry}><Text style={styles.white}>Clear Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setFlyerExpiryModal(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Event Expiry */}
      <Modal visible={eventExpiryModal} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Set Event Expiry</Text>
          <Text style={styles.modalSubText}>Event auto-hides after this date & time.</Text>
          <Text style={styles.pickerLabel}>Date</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowEventDatePicker(true)}>
            <Ionicons name="calendar-outline" size={15} color="#4B3F72" />
            <Text style={styles.pickerValue}>{eventExpiryDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showEventDatePicker && (
            <DateTimePicker value={eventExpiryDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowEventDatePicker(false); if (d) setEventExpiryDate(prev => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; }); }} />
          )}
          <Text style={styles.pickerLabel}>Time</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowEventTimePicker(true)}>
            <Ionicons name="time-outline" size={15} color="#4B3F72" />
            <Text style={styles.pickerValue}>{eventExpiryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </TouchableOpacity>
          {showEventTimePicker && (
            <DateTimePicker value={eventExpiryDate} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowEventTimePicker(false); if (d) setEventExpiryDate(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }} />
          )}
          <TouchableOpacity style={[styles.modalBtn, { marginTop: 12 }]} onPress={saveEventExpiry}><Text style={styles.white}>Save Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#e74c3c", marginTop: 6 }]} onPress={clearEventExpiry}><Text style={styles.white}>Clear Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setEventExpiryModal(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Programme item modal */}
      <Modal visible={programModal} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{programEditId ? "Edit" : "Add"} Programme Item</Text>
          <Text style={styles.pickerLabel}>Time (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. 9:30 AM" value={programTime} onChangeText={setProgramTime} />
          <Text style={styles.pickerLabel}>Item *</Text>
          <TextInput style={styles.input} placeholder="e.g. Opening Prayer" value={programItem} onChangeText={setProgramItem} autoFocus />
          <TouchableOpacity style={[styles.modalBtn, { marginTop: 10 }]} onPress={saveProgram}><Text style={styles.white}>Save</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setProgramModal(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Programme delete */}
      <Modal visible={programDeleteModal} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Remove Item?</Text>
          <Text style={styles.modalSubText}>This programme item will be removed.</Text>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d" }]} onPress={confirmDeleteProgram}><Text style={styles.white}>Yes, Remove</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setProgramDeleteModal(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Preacher modal */}
      <Modal visible={preacherModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={[styles.modalBox, { marginVertical: 40 }]}>
              <Text style={styles.modalTitle}>Preacher / Speaker</Text>

              {/* Photo upload */}
              <TouchableOpacity style={styles.preacherPhotoUpload} onPress={pickPreacherPhoto} disabled={uploadingPreacher}>
                {editPreacher.photo
                  ? <Image source={{ uri: editPreacher.photo }} style={styles.preacherPhotoUploadImg} />
                  : (
                    <View style={styles.preacherPhotoPlaceholderSm}>
                      <Ionicons name="camera-outline" size={28} color="#aaa" />
                      <Text style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>
                        {uploadingPreacher ? "Uploading..." : "Tap to upload photo"}
                      </Text>
                    </View>
                  )
                }
              </TouchableOpacity>

              <Text style={styles.pickerLabel}>Full Name</Text>
              <TextInput style={styles.input} placeholder="Rev. John Mensah" value={editPreacher.name}
                onChangeText={t => setEditPreacher(p => ({ ...p, name: t }))} />

              <Text style={styles.pickerLabel}>Title / Position</Text>
              <TextInput style={styles.input} placeholder="Senior Pastor" value={editPreacher.title}
                onChangeText={t => setEditPreacher(p => ({ ...p, title: t }))} />

              <Text style={styles.pickerLabel}>Sermon Topic</Text>
              <TextInput style={styles.input} placeholder="Walking in Faith" value={editPreacher.topic}
                onChangeText={t => setEditPreacher(p => ({ ...p, topic: t }))} />

              <Text style={styles.pickerLabel}>Profile / Bio</Text>
              <TextInput style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                placeholder="Brief biography or background..."
                value={editPreacher.bio} onChangeText={t => setEditPreacher(p => ({ ...p, bio: t }))}
                multiline />

              <TouchableOpacity style={[styles.modalBtn, { marginTop: 12 }]}
                onPress={() => { setPreacher({ ...editPreacher }); setPreacherModal(false); }}>
                <Text style={styles.white}>Save Preacher</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]}
                onPress={() => setPreacherModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Fullscreen image */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={[styles.modalWrap, { backgroundColor: "#000e" }]}>
          <Pressable onPress={() => setSelectedImage(null)} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            {selectedImage && <Image source={selectedImage} style={styles.fullImage} resizeMode="contain" />}
          </Pressable>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  /* Header */
  header: { backgroundColor: "#4B3F72", paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 32, height: 32, marginRight: 10, borderRadius: 6 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 },

  /* Carousel */
  carouselWrapper: { marginTop: 10, paddingHorizontal: 15, backgroundColor: "#f4f6fb" },
  carouselHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingTop: 12 },
  uploadBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4B3F72", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4, minWidth: 70 },
  uploadBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  carouselImage: { width: "100%", height: 170, borderRadius: 12 },
  dotsContainer: { flexDirection: "row", justifyContent: "center", marginTop: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, backgroundColor: "#ccc", margin: 3, borderRadius: 3 },
  activeDot: { backgroundColor: "#4B3F72", width: 18, borderRadius: 3 },
  noFlyerBox: { height: 80, backgroundColor: "#eee", borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 8 },
  noFlyerText: { color: "#bbb", fontSize: 13 },

  /* Message */
  messageCard: { backgroundColor: "#fff", marginHorizontal: 15, marginTop: 12, padding: 14, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  messageTitle: { fontWeight: "700", fontSize: 14, color: "#222", marginBottom: 5 },
  messageText: { fontSize: 13, color: "#555", lineHeight: 20 },
  inlineInput: { borderBottomWidth: 1.5, borderBottomColor: "#4B3F72", paddingVertical: 3, fontSize: 14, fontWeight: "600", color: "#222" },

  /* Manage flyers */
  adminPanel: { paddingHorizontal: 15, marginTop: 14 },
  manageFlyersHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  adminTitle: { fontWeight: "700", fontSize: 15, color: "#222" },
  toggleAllBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, gap: 4 },
  toggleAllText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  adminRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, backgroundColor: "#fff", padding: 8, borderRadius: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  adminImage: { width: 52, height: 52, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#333" },
  expiryBadge: { fontSize: 10, color: "#6c47b8", marginTop: 2 },
  adminBtn: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  adminBtnText: { color: "#fff", fontSize: 10, fontWeight: "600" },

  /* Section title */
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#222", marginBottom: 8 },

  /* Quick actions */
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 15, gap: 10, marginBottom: 4 },
  quickCard: { width: "47%", borderRadius: 14, padding: 13, alignItems: "center", gap: 5, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  quickSub: { fontSize: 10, color: "#999" },

  /* Events tabs */
  eventsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 10, padding: 4, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8, gap: 4 },
  tabBtnActive: { backgroundColor: "#EEF0FA" },
  tabBtnText: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  tabBtnTextActive: { color: "#4B3F72", fontWeight: "800" },

  /* Add button */
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", padding: 10, borderRadius: 8, marginBottom: 10, gap: 6 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  /* Event cards */
  eventCard: { flexDirection: "row", backgroundColor: "#fff", padding: 13, borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  eventTitle: { fontWeight: "700", fontSize: 14, color: "#222" },
  eventDate: { fontSize: 12, color: "#4B3F72", marginTop: 2, fontWeight: "600" },
  eventDesc: { fontSize: 12, color: "#666", marginTop: 2, lineHeight: 17 },

  /* Programme */
  programRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 6, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  programNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center", marginRight: 10 },
  programNumText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  programItem: { fontSize: 13, fontWeight: "600", color: "#222" },
  programTime: { fontSize: 11, color: "#4B3F72", marginTop: 2 },
  programAction: { padding: 5 },

  /* Preacher */
  preacherCard: { backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  preacherPhoto: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: "#4B3F72" },
  preacherPhotoPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  preacherName: { fontSize: 18, fontWeight: "800", color: "#222", marginTop: 12, textAlign: "center" },
  preacherTitle: { fontSize: 13, color: "#4B3F72", fontWeight: "600", marginTop: 3, textAlign: "center" },
  preacherTopicBox: { backgroundColor: "#EEF2FF", borderRadius: 10, padding: 12, marginTop: 12, width: "100%" },
  preacherTopicLabel: { fontSize: 10, fontWeight: "700", color: "#4F46E5", textTransform: "uppercase", marginBottom: 3 },
  preacherTopic: { fontSize: 14, fontWeight: "700", color: "#222" },
  preacherBioBox: { backgroundColor: "#f9f9f9", borderRadius: 10, padding: 12, marginTop: 8, width: "100%" },
  preacherBioLabel: { fontSize: 10, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 4 },
  preacherBio: { fontSize: 13, color: "#444", lineHeight: 20 },
  preacherEmpty: { color: "#bbb", fontSize: 13, marginTop: 12, marginBottom: 4 },
  preacherPhotoUpload: { alignItems: "center", marginBottom: 12 },
  preacherPhotoUploadImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "#4B3F72" },
  preacherPhotoPlaceholderSm: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },

  /* Modals */
  modalWrap: { flex: 1, backgroundColor: "#000a", justifyContent: "center" },
  modalBox: { backgroundColor: "#fff", padding: 20, marginHorizontal: 20, borderRadius: 16 },
  modalTitle: { fontWeight: "800", fontSize: 16, marginBottom: 6, textAlign: "center", color: "#222" },
  modalSubText: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 12, lineHeight: 19 },
  input: { borderWidth: 1.5, borderColor: "#e8e8e8", borderRadius: 10, marginBottom: 10, padding: 11, fontSize: 13, color: "#222", backgroundColor: "#fafafa" },
  modalBtn: { backgroundColor: "#1BA97F", padding: 13, alignItems: "center", borderRadius: 10 },
  white: { color: "#fff", fontWeight: "700", fontSize: 14 },

  pickerLabel: { fontSize: 11, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginTop: 6, marginBottom: 4 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f5f5f5", padding: 12, borderRadius: 10, marginBottom: 4 },
  pickerValue: { fontSize: 14, fontWeight: "600", color: "#333" },

  flyerPreview: { width: "100%", height: 110, borderRadius: 8, resizeMode: "cover", marginTop: 6 },
  fullImage: { width: SCREEN_W, height: SCREEN_W * 1.4 },
});

