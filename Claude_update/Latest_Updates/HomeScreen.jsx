import React, { useRef, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions, Modal,
  Pressable, TextInput, Alert, Platform
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function HomeScreen({ navigation }) {

  const screenWidth  = Dimensions.get("window").width;
  const scrollRef    = useRef(null);
  const currentIndex = useRef(0);

  const [activeIndex,   setActiveIndex]   = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  const [carouselHeading,        setCarouselHeading]        = useState("Featured Events");
  const [editingCarouselHeading, setEditingCarouselHeading] = useState(false);

  const [pastorHeading,        setPastorHeading]        = useState("Message from Pastor");
  const [pastorMessage,        setPastorMessage]        = useState("Stay strong in faith. Continue to grow spiritually.");
  const [editingPastorHeading, setEditingPastorHeading] = useState(false);
  const [editingPastorMessage, setEditingPastorMessage] = useState(false);

  const [flyers, setFlyers] = useState([
    { id: "1", image: require("../assets/flyer1.jpg"), active: true,  expiry: null },
    { id: "2", image: require("../assets/flyer2.jpg"), active: true,  expiry: null },
    { id: "3", image: require("../assets/flyer3.jpg"), active: false, expiry: null },
  ]);

  const [flyerSectionVisible,  setFlyerSectionVisible]  = useState(true);
  const [manageFlyersExpanded, setManageFlyersExpanded] = useState(true);

  const [flyerExpiryModal,    setFlyerExpiryModal]    = useState(false);
  const [flyerExpiryTarget,   setFlyerExpiryTarget]   = useState(null);
  const [flyerExpiryDate,     setFlyerExpiryDate]     = useState(new Date());
  const [showFlyerDatePicker, setShowFlyerDatePicker] = useState(false);
  const [showFlyerTimePicker, setShowFlyerTimePicker] = useState(false);

  const openFlyerExpiry = (id) => {
    setFlyerExpiryTarget(id);
    const existing = flyers.find(f => f.id === id)?.expiry;
    setFlyerExpiryDate(existing ? new Date(existing) : new Date());
    setFlyerExpiryModal(true);
  };
  const saveFlyerExpiry = () => {
    setFlyers(prev => prev.map(f =>
      f.id === flyerExpiryTarget ? { ...f, expiry: flyerExpiryDate.toISOString() } : f
    ));
    setFlyerExpiryModal(false);
  };
  const clearFlyerExpiry = () => {
    setFlyers(prev => prev.map(f =>
      f.id === flyerExpiryTarget ? { ...f, expiry: null } : f
    ));
    setFlyerExpiryModal(false);
  };

  const now          = new Date();
  const activeFlyers = flyerSectionVisible
    ? flyers.filter(f => f.active && (!f.expiry || new Date(f.expiry) > now))
    : [];
  const showCarousel = activeFlyers.length > 0;

  const [flyerToDelete,           setFlyerToDelete]           = useState(null);
  const [deleteFlyerModalVisible, setDeleteFlyerModalVisible] = useState(false);
  const confirmDeleteFlyer = () => {
    setFlyers(prev => prev.filter(f => f.id !== flyerToDelete.id));
    setDeleteFlyerModalVisible(false);
    setFlyerToDelete(null);
  };

  const [events, setEvents] = useState([
    { id: "1", title: "Sunday Service", date: "9:00 AM",    desc: "Main worship",     active: true, expiry: null },
    { id: "2", title: "Youth Meetup",   date: "Friday 6PM", desc: "Youth fellowship", active: true, expiry: null },
  ]);

  const [eventsVisible, setEventsVisible] = useState(true);
  const activeEvents = events.filter(e => e.active && (!e.expiry || new Date(e.expiry) > now));

  const [eventExpiryModal,    setEventExpiryModal]    = useState(false);
  const [eventExpiryTarget,   setEventExpiryTarget]   = useState(null);
  const [eventExpiryDate,     setEventExpiryDate]     = useState(new Date());
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [showEventTimePicker, setShowEventTimePicker] = useState(false);

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

  const handleUpload = () => {
    Alert.alert("Upload Flyer", "Choose a source", [
      { text: "Photo Library", onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Please allow photo library access."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
          if (!result.canceled) setFlyers(prev => [...prev, { id: Date.now().toString(), image: { uri: result.assets[0].uri }, active: true, expiry: null }]);
      }},
      { text: "Take Photo", onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Please allow camera access."); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
          if (!result.canceled) setFlyers(prev => [...prev, { id: Date.now().toString(), image: { uri: result.assets[0].uri }, active: true, expiry: null }]);
      }},
      { text: "Cancel", style: "cancel" }
    ]);
  };

  // ─────────────────────────────────────────────────────────────────
  // NAVIGATION HELPERS
  // From App.js (this thread):
  //   RootStack > MainTabs (Tab) > Members tab > MembersStack > MembersMain (MembersScreen)
  //
  // jumpTo("Members", { screen: "MembersMain" }) — switches tab AND
  // resets the stack inside to MembersMain (MembersScreen), so this
  // will never land on HomeScreen regardless of prior navigation state.
  //
  // AdminDashboard lives in RootStack (not in tabs), so navigate() works.
  // DonateScreen also lives in RootStack — add it there in App.js.
  // ─────────────────────────────────────────────────────────────────
  const goToMembers = () => {
    navigation.jumpTo("Members", { screen: "MembersMain" });
  };

  const goToDonate = () => {
    navigation.navigate("Donate");   // RootStack screen — see App.js note below
  };

  useEffect(() => {
    if (activeFlyers.length === 0) return;
    const interval = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % activeFlyers.length;
      setActiveIndex(currentIndex.current);
      scrollRef.current?.scrollTo({ x: currentIndex.current * (screenWidth - 30), animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [flyers, flyerSectionVisible]);

  const fmtDateTime = (iso) => {
    if (!iso) return "No expiry set";
    const d = new Date(iso);
    return d.toLocaleDateString() + "  " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fb", paddingBottom: 10 }}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image source={require("../assets/logo.png")} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>ChurchCare</Text>
            <Text style={styles.headerSub}>Welcome Back</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* 1 — CAROUSEL */}
        <View style={styles.carouselWrapper}>
          <View style={styles.carouselHeadingRow}>
            {editingCarouselHeading ? (
              <TextInput style={styles.inlineInput} value={carouselHeading} onChangeText={setCarouselHeading}
                autoFocus onBlur={() => setEditingCarouselHeading(false)} onSubmitEditing={() => setEditingCarouselHeading(false)} />
            ) : (
              <TouchableOpacity onPress={() => setEditingCarouselHeading(true)} style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{carouselHeading}{"  "}<Ionicons name="pencil-outline" size={13} color="#4B3F72" /></Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
              <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
              <Text style={styles.uploadBtnText}>Upload</Text>
            </TouchableOpacity>
          </View>

          {showCarousel && (
            <>
              <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {activeFlyers.map(item => (
                  <TouchableOpacity key={item.id} onPress={() => setSelectedImage(item.image)}
                    style={{ width: screenWidth - 30, marginRight: 10 }}>
                    <Image source={item.image} style={styles.carouselImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.dotsContainer}>
                {activeFlyers.map((_, i) => <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />)}
              </View>
            </>
          )}
        </View>

        {/* 2 — MESSAGE FROM PASTOR */}
        <View style={styles.messageCard}>
          {editingPastorHeading ? (
            <TextInput style={[styles.inlineInput, { marginBottom: 6 }]} value={pastorHeading} onChangeText={setPastorHeading}
              autoFocus onBlur={() => setEditingPastorHeading(false)} onSubmitEditing={() => setEditingPastorHeading(false)} />
          ) : (
            <TouchableOpacity onPress={() => setEditingPastorHeading(true)}>
              <Text style={styles.messageTitle}>{pastorHeading}{"  "}<Ionicons name="pencil-outline" size={12} color="#4B3F72" /></Text>
            </TouchableOpacity>
          )}
          {editingPastorMessage ? (
            <TextInput style={[styles.inlineInput, { fontSize: 12, color: "#555" }]} value={pastorMessage}
              onChangeText={setPastorMessage} multiline autoFocus onBlur={() => setEditingPastorMessage(false)} />
          ) : (
            <TouchableOpacity onPress={() => setEditingPastorMessage(true)}>
              <Text style={styles.messageText}>{pastorMessage}{"  "}<Ionicons name="pencil-outline" size={11} color="#999" /></Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3 — MANAGE FLYERS */}
        <View style={styles.adminPanel}>
          <View style={styles.manageFlyersHeader}>
            <Text style={styles.adminTitle}>Manage Flyers</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity style={[styles.toggleAllBtn, { backgroundColor: flyerSectionVisible ? "#4B3F72" : "#1BA97F" }]}
                onPress={() => setFlyerSectionVisible(p => !p)}>
                <Ionicons name={flyerSectionVisible ? "eye-off-outline" : "eye-outline"} size={13} color="#fff" />
                <Text style={styles.toggleAllText}>{flyerSectionVisible ? "Hide All" : "Show All"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleAllBtn, { backgroundColor: "#888" }]}
                onPress={() => setManageFlyersExpanded(p => !p)}>
                <Ionicons name={manageFlyersExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={13} color="#fff" />
                <Text style={styles.toggleAllText}>{manageFlyersExpanded ? "Collapse" : "Expand"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {manageFlyersExpanded && flyers.map(item => (
            <View key={item.id} style={styles.adminRow}>
              <Image source={item.image} style={styles.adminImage} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.statusText}>{item.active ? "Active" : "Inactive"}</Text>
                {item.expiry && <Text style={styles.expiryBadge}>⏱ {fmtDateTime(item.expiry)}</Text>}
              </View>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: "#6c47b8" }]} onPress={() => openFlyerExpiry(item.id)}>
                <Ionicons name="time-outline" size={12} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: item.active ? "#ff4d4d" : "#1BA97F", marginLeft: 4 }]}
                onPress={() => setFlyers(prev => prev.map(f => f.id === item.id ? { ...f, active: !f.active } : f))}>
                <Text style={styles.adminBtnText}>{item.active ? "Deactivate" : "Activate"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminBtn, { backgroundColor: "#7f1d1d", marginLeft: 4 }]}
                onPress={() => { setFlyerToDelete(item); setDeleteFlyerModalVisible(true); }}>
                <Text style={styles.adminBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 4 — QUICK ACTIONS */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: 15 }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#EEF2FF" }]}
            onPress={() => navigation.navigate("Attendance")}>
            <View style={[styles.quickIcon, { backgroundColor: "#4F46E5" }]}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#4F46E5" }]}>Attendance</Text>
            <Text style={styles.quickSub}>Mark & track</Text>
          </TouchableOpacity>

          {/* ✅ FIXED: jumpTo switches the Members tab and resets stack to MembersScreen */}
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#ECFDF5" }]}
            onPress={goToMembers}>
            <View style={[styles.quickIcon, { backgroundColor: "#059669" }]}>
              <Ionicons name="people" size={22} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#059669" }]}>Members</Text>
            <Text style={styles.quickSub}>View all</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#FFFBEB" }]}
            onPress={() => navigation.navigate("AdminDashboard")}>
            <View style={[styles.quickIcon, { backgroundColor: "#D97706" }]}>
              <Ionicons name="bar-chart" size={22} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#D97706" }]}>Reports</Text>
            <Text style={styles.quickSub}>Dashboard</Text>
          </TouchableOpacity>

          {/* ✅ FIXED: Donate now navigates to DonateScreen */}
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#FFF1F2" }]}
            onPress={goToDonate}>
            <View style={[styles.quickIcon, { backgroundColor: "#E11D48" }]}>
              <Ionicons name="heart" size={22} color="#fff" />
            </View>
            <Text style={[styles.quickLabel, { color: "#E11D48" }]}>Donate</Text>
            <Text style={styles.quickSub}>Give now</Text>
          </TouchableOpacity>

        </View>

        {/* 5 — UPCOMING EVENTS */}
        <View style={{ paddingHorizontal: 15, marginTop: 10 }}>
          <View style={styles.eventsSectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity style={[styles.toggleAllBtn, { backgroundColor: eventsVisible ? "#4B3F72" : "#1BA97F" }]}
              onPress={() => setEventsVisible(p => !p)}>
              <Ionicons name={eventsVisible ? "eye-off-outline" : "eye-outline"} size={13} color="#fff" />
              <Text style={styles.toggleAllText}>{eventsVisible ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          {eventsVisible && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>+ Add Event</Text>
              </TouchableOpacity>
              {activeEvents.map(event => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDate}>{event.date}</Text>
                    <Text style={styles.eventDesc}>{event.desc}</Text>
                    {event.expiry && <Text style={styles.expiryBadge}>⏱ {fmtDateTime(event.expiry)}</Text>}
                  </View>
                  <View style={{ alignItems: "center", gap: 7 }}>
                    <Ionicons name="calendar-outline" size={20} color="#4B3F72" />
                    <TouchableOpacity onPress={() => openEventExpiry(event.id)}>
                      <Ionicons name="time-outline" size={20} color="#6c47b8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => editEvent(event)}>
                      <Ionicons name="create-outline" size={20} color="#1BA97F" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteEvent(event)}>
                      <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

      </ScrollView>

      {/* MODALS — unchanged from your pasted version */}

      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Create Event</Text>
          <TextInput style={styles.input} placeholder="Title" value={newTitle} onChangeText={setNewTitle} />
          <TextInput style={styles.input} placeholder="Date / Time" value={newDate} onChangeText={setNewDate} />
          <TextInput style={styles.input} placeholder="Description" value={newDesc} onChangeText={setNewDesc} />
          <TouchableOpacity style={styles.modalBtn} onPress={createEvent}><Text style={{ color: "#fff" }}>Create</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setCreateModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Edit Event</Text>
          <TextInput style={styles.input} placeholder="Title" value={editTitle} onChangeText={setEditTitle} />
          <TextInput style={styles.input} placeholder="Date / Time" value={editDate} onChangeText={setEditDate} />
          <TextInput style={styles.input} placeholder="Description" value={editDesc} onChangeText={setEditDesc} />
          <TouchableOpacity style={styles.modalBtn} onPress={saveEdit}><Text style={{ color: "#fff" }}>Save Changes</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setEditModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Delete Event?</Text>
          <Text style={{ color: "#666", marginBottom: 14, textAlign: "center" }}>"{eventToDelete?.title}" will be permanently removed.</Text>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d" }]} onPress={confirmDelete}><Text style={{ color: "#fff" }}>Yes, Delete</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setDeleteModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={deleteFlyerModalVisible} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Delete Flyer?</Text>
          <Text style={{ color: "#666", marginBottom: 14, textAlign: "center" }}>This flyer will be permanently removed.</Text>
          {flyerToDelete && <Image source={flyerToDelete.image} style={styles.flyerPreview} />}
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ff4d4d", marginTop: 12 }]} onPress={confirmDeleteFlyer}><Text style={{ color: "#fff" }}>Yes, Delete</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setDeleteFlyerModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={flyerExpiryModal} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Set Flyer Expiry</Text>
          <Text style={styles.expiryModalSub}>Flyer auto-hides from carousel after this date & time.</Text>
          <Text style={styles.pickerLabel}>Date</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowFlyerDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color="#4B3F72" />
            <Text style={styles.pickerValue}>{flyerExpiryDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showFlyerDatePicker && (
            <DateTimePicker value={flyerExpiryDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowFlyerDatePicker(false); if (d) setFlyerExpiryDate(prev => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; }); }} />
          )}
          <Text style={styles.pickerLabel}>Time</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowFlyerTimePicker(true)}>
            <Ionicons name="time-outline" size={16} color="#4B3F72" />
            <Text style={styles.pickerValue}>{flyerExpiryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </TouchableOpacity>
          {showFlyerTimePicker && (
            <DateTimePicker value={flyerExpiryDate} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowFlyerTimePicker(false); if (d) setFlyerExpiryDate(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }} />
          )}
          <TouchableOpacity style={[styles.modalBtn, { marginTop: 14 }]} onPress={saveFlyerExpiry}><Text style={{ color: "#fff" }}>Save Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#e74c3c", marginTop: 6 }]} onPress={clearFlyerExpiry}><Text style={{ color: "#fff" }}>Clear Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setFlyerExpiryModal(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={eventExpiryModal} transparent animationType="fade">
        <View style={styles.modalWrap}><View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Set Event Expiry</Text>
          <Text style={styles.expiryModalSub}>Event auto-hides from the list after this date & time.</Text>
          <Text style={styles.pickerLabel}>Date</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowEventDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color="#4B3F72" />
            <Text style={styles.pickerValue}>{eventExpiryDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showEventDatePicker && (
            <DateTimePicker value={eventExpiryDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowEventDatePicker(false); if (d) setEventExpiryDate(prev => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; }); }} />
          )}
          <Text style={styles.pickerLabel}>Time</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowEventTimePicker(true)}>
            <Ionicons name="time-outline" size={16} color="#4B3F72" />
            <Text style={styles.pickerValue}>{eventExpiryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </TouchableOpacity>
          {showEventTimePicker && (
            <DateTimePicker value={eventExpiryDate} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e, d) => { setShowEventTimePicker(false); if (d) setEventExpiryDate(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }} />
          )}
          <TouchableOpacity style={[styles.modalBtn, { marginTop: 14 }]} onPress={saveEventExpiry}><Text style={{ color: "#fff" }}>Save Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#e74c3c", marginTop: 6 }]} onPress={clearEventExpiry}><Text style={{ color: "#fff" }}>Clear Expiry</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc", marginTop: 6 }]} onPress={() => setEventExpiryModal(false)}><Text>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <Pressable onPress={() => setSelectedImage(null)}>
            <Image source={selectedImage} style={styles.fullImage} />
          </Pressable>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "#4B3F72", paddingTop: 44, paddingBottom: 12, paddingHorizontal: 15 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 28, height: 28, marginRight: 8 },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  headerSub: { color: "#ddd", fontSize: 11 },
  carouselWrapper: { marginTop: 10, paddingHorizontal: 15 },
  carouselHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  uploadBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4B3F72", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  uploadBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  carouselImage: { width: "100%", height: 150, borderRadius: 12 },
  dotsContainer: { flexDirection: "row", justifyContent: "center", marginTop: 6 },
  dot: { width: 6, height: 6, backgroundColor: "#ccc", margin: 4, borderRadius: 3 },
  activeDot: { backgroundColor: "#4B3F72" },
  messageCard: { backgroundColor: "#fff", marginHorizontal: 15, marginTop: 14, padding: 14, borderRadius: 10 },
  messageTitle: { fontWeight: "600", marginBottom: 4 },
  messageText: { fontSize: 12, color: "#555" },
  inlineInput: { borderBottomWidth: 1.5, borderBottomColor: "#4B3F72", paddingVertical: 2, fontSize: 14, fontWeight: "600", color: "#222", flex: 1 },
  adminPanel: { paddingHorizontal: 15, marginTop: 14 },
  manageFlyersHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  adminTitle: { fontWeight: "700", fontSize: 16 },
  toggleAllBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  toggleAllText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  adminRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, backgroundColor: "#fff", padding: 8, borderRadius: 8 },
  adminImage: { width: 50, height: 50, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#333" },
  expiryBadge: { fontSize: 10, color: "#6c47b8", marginTop: 2 },
  adminBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  adminBtnText: { color: "#fff", fontSize: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 15, gap: 10 },
  quickCard: { width: "47%", borderRadius: 16, padding: 14, alignItems: "center", gap: 6, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  quickIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontWeight: "800" },
  quickSub: { fontSize: 10, color: "#999", marginTop: -2 },
  eventsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  eventCard: { flexDirection: "row", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 8 },
  eventTitle: { fontWeight: "700", fontSize: 13 },
  eventDate: { fontSize: 11, color: "#4B3F72" },
  eventDesc: { fontSize: 11, color: "#666" },
  addBtn: { backgroundColor: "#4B3F72", padding: 8, borderRadius: 6, marginBottom: 10, alignItems: "center" },
  modalWrap: { flex: 1, backgroundColor: "#000c", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 14, width: "85%" },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 4, textAlign: "center" },
  expiryModalSub: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 10, padding: 10 },
  modalBtn: { backgroundColor: "#1BA97F", padding: 12, alignItems: "center", borderRadius: 8 },
  pickerLabel: { fontSize: 11, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginTop: 8, marginBottom: 4 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f5f5f5", padding: 12, borderRadius: 10 },
  pickerValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  flyerPreview: { width: "100%", height: 120, borderRadius: 8, resizeMode: "cover" },
  fullImage: { width: 320, height: 480, borderRadius: 16 },
});
