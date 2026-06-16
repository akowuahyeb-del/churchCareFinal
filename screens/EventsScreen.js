
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, Modal, TextInput, Alert,
  Dimensions, Platform, Image, FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { db, storage } from "../firebase";
import AppHeader from "../components/AppHeader";
import {
  collection, addDoc, onSnapshot, deleteDoc,
  doc, updateDoc, query, orderBy, where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";


const { width: W } = Dimensions.get("window");

// ── Role config ───────────────────────────────────────────────────
const USER_ROLE  = "admin"; // replace with auth context
const ROLE_LEVEL = { admin: 5, pastor: 4, elder: 3, deacon: 2, member: 1 };
const canDo = (minRole) => ROLE_LEVEL[USER_ROLE] >= ROLE_LEVEL[minRole];

// ── Event categories ──────────────────────────────────────────────
const CATEGORIES = [
  { key: "all",       label: "All",        icon: "apps-outline",          color: "#4B3F72" },
  { key: "service",   label: "Service",    icon: "book-outline",          color: "#0984E3" },
  { key: "youth",     label: "Youth",      icon: "people-outline",        color: "#00B894" },
  { key: "prayer",    label: "Prayer",     icon: "prism-outline",         color: "#6C5CE7" },
  { key: "outreach",  label: "Outreach",   icon: "earth-outline",         color: "#E17055" },
  { key: "special",   label: "Special",    icon: "star-outline",          color: "#FDCB6E" },
  { key: "meeting",   label: "Meeting",    icon: "business-outline",      color: "#636e72" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

// ── View modes ────────────────────────────────────────────────────
const VIEWS = [
  { key: "featured", icon: "grid-outline"    },
  { key: "list",     icon: "list-outline"    },
  { key: "compact",  icon: "reorder-four-outline" },
];

// ── Status badge ──────────────────────────────────────────────────
function StatusBadge({ event }) {
  const now   = new Date();
  const start = event.startDate ? new Date(event.startDate) : null;
  const expiry = event.expiry   ? new Date(event.expiry)   : null;

  if (expiry && now > expiry)      return <View style={[styles.badge, { backgroundColor: "#fce8e8" }]}><Text style={[styles.badgeText,{color:"#e74c3c"}]}>Expired</Text></View>;
  if (start && now > start)        return <View style={[styles.badge, { backgroundColor: "#e8f8f0" }]}><Text style={[styles.badgeText,{color:"#27ae60"}]}>Live</Text></View>;
  if (start) {
    const daysAway = Math.ceil((start - now) / 86400000);
    if (daysAway <= 3)             return <View style={[styles.badge, { backgroundColor: "#fff3e0" }]}><Text style={[styles.badgeText,{color:"#e67e22"}]}>Soon</Text></View>;
  }
                                   return <View style={[styles.badge, { backgroundColor: "#EEF0FA" }]}><Text style={[styles.badgeText,{color:"#4B3F72"}]}>Upcoming</Text></View>;
}

// ── Date formatter helpers ─────────────────────────────────────────
const fmt = (iso, opts) => iso ? new Date(iso).toLocaleString("en-GB", opts) : "—";
const fmtDate = (iso) => fmt(iso, { day:"numeric", month:"short", year:"numeric" });
const fmtTime = (iso) => fmt(iso, { hour:"2-digit", minute:"2-digit" });
const fmtFull = (iso) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

// ── Empty form ────────────────────────────────────────────────────
const emptyForm = () => ({
  title:       "",
  category:    "service",
  description: "",
  location:    "",
  organizer:   "",
  startDate:   null,
  endDate:     null,
  expiry:      null,
  allDay:      false,
  recurring:   "none",
  coverImage:  null,
  featured:    false,
  rsvpEnabled: false,
  maxAttendees:"",
  notes:       "",
});


export default function EventsScreen() {
  const navigation = useNavigation();
  const entity = activeEntity || {};
const { organizationId, entityId } = entity;


  const [activeEntity, setActiveEntity] = useState(null);

useEffect(() => {
  const loadEntity = async () => {
    const data = await AsyncStorage.getItem("activeEntity");

    if (data) {
      const parsed = JSON.parse(data);
      console.log("✅ Active Entity:", parsed);
      setActiveEntity(parsed);
    }
  };

  loadEntity();
}, []);

  const [events,       setEvents]       = useState([]);
  const [filterCat,    setFilterCat]    = useState("all");
  const [viewMode,     setViewMode]     = useState("featured");
  const [searchText,   setSearchText]   = useState("");
  const [showSearch,   setShowSearch]   = useState(false);

  // Modal states
  const [formModal,    setFormModal]    = useState(false);
  const [detailModal,  setDetailModal]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [form,         setForm]         = useState(emptyForm());
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);

  // Date pickers
  const [picker,       setPicker]       = useState(null); // "start"|"startTime"|"end"|"endTime"|"expiry"|"expiryTime"
  const [pickerDate,   setPickerDate]   = useState(new Date());

  // ── Load ──────────────────────────────────────────────────────

useEffect(() => {
  if (!activeEntity) return;

  const { organizationId, entityId } = activeEntity;

  const unsub = onSnapshot(
    query(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "events"
      ),
      orderBy("startDate", "asc")
    ),
    snap => {
      setEvents(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    }
  );

  return unsub;

}, [activeEntity]);





  // ── Filter ───────────────────────────────────────────────────
  const now = new Date();
  const filtered = events.filter(ev => {
    const matchCat    = filterCat === "all" || ev.category === filterCat;
    const matchSearch = !searchText || (ev.title || "").toLowerCase().includes(searchText.toLowerCase()) || (ev.location || "").toLowerCase().includes(searchText.toLowerCase());
    const notExpired  = !ev.expiry || new Date(ev.expiry) > now;
    return matchCat && matchSearch && notExpired;
  });

  const featured = filtered.filter(e => e.featured);
  const regular  = filtered.filter(e => !e.featured);

  // ── Cover image upload ───────────────────────────────────────
  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16,9], quality: 0.8 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const blob = await new Promise((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.onload  = () => res(xhr.response);
        xhr.onerror = () => rej(new Error("Upload failed"));
        xhr.responseType = "blob";
        xhr.open("GET", result.assets[0].uri, true);
        xhr.send(null);
      });
      const storageRef = ref(storage, `events/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      blob.close && blob.close();
      const url = await getDownloadURL(storageRef);
      setForm(p => ({ ...p, coverImage: url }));
    } catch (e) { Alert.alert("Upload failed"); }
    finally { setUploading(false); }
  };

  // ── Save / update ────────────────────────────────────────────
const handleSave = async () => {
  if (!form.title.trim()) {
    Alert.alert("Event title is required");
    return;
  }

  if (!organizationId || !entityId) {
    Alert.alert("No active church", "Please select a church first");
    return;
  }

  setSaving(true);

  try {
    const payload = {
      ...form,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(
        doc(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "events",
          editingId
        ),
        payload
      );
      Alert.alert("✅ Event updated");
    } else {
      await addDoc(
        collection(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "events"
        ),
        {
          ...payload,
          createdAt: new Date().toISOString()
        }
      );
      Alert.alert("✅ Event created");
    }

    closeForm();

  } catch (e) {
    Alert.alert("Error", e.message);
  } finally {
    setSaving(false);
  }
};


// ── Delete ───────────────────────────────────────────────────
const handleDelete = (event) => {
  if (!canDo("pastor")) {
    Alert.alert("Access denied", "Only pastors and admins can delete events.");
    return;
  }

  Alert.alert(
    "Delete Event?",
    `"${event.title}" will be permanently removed.`,
    [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (!organizationId || !entityId) {
              Alert.alert("Error", "No active church selected");
              return;
            }

            await deleteDoc(
              doc(
                db,
                "organizations",
                organizationId,
                "entities",
                entityId,
                "events",
                event.id
              )
            );

            setDetailModal(false);

          } catch (e) {
            Alert.alert("Error", e.message);
          }
        }
      }
    ]
  );
};


// ── Toggle featured ──────────────────────────────────────────
const toggleFeatured = async (event) => {
  if (!canDo("deacon")) {
    Alert.alert("Access denied");
    return;
  }

  try {
    if (!organizationId || !entityId) {
      Alert.alert("Error", "No active church selected");
      return;
    }

    await updateDoc(
      doc(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "events",
        event.id
      ),
      { featured: !event.featured }
    );

  } catch (e) {
    Alert.alert("Error", e.message);
  }
};

  // ── Open form ────────────────────────────────────────────────
  const openCreate = () => {
    if (!canDo("deacon")) { Alert.alert("Access denied", "You do not have permission to create events."); return; }
    setEditingId(null);
    setForm(emptyForm());
    setFormModal(true);
  };

  const openEdit = (event) => {
    if (!canDo("deacon")) { Alert.alert("Access denied"); return; }
    setEditingId(event.id);
    setForm({ ...emptyForm(), ...event });
    setDetailModal(false);
    setFormModal(true);
  };

  const closeForm = () => { setFormModal(false); setEditingId(null); setForm(emptyForm()); };

  // ── Date picker helper ────────────────────────────────────────
  const openPicker = (field, current) => {
    setPickerDate(current ? new Date(current) : new Date());
    setPicker(field);
  };

  const handlePickerChange = (e, selected) => {
    if (Platform.OS === "android") setPicker(null);
    if (!selected) return;
    const field = picker;
    setForm(prev => {
      let updated = { ...prev };
      if (field === "start")      updated.startDate = mergeDateTime(prev.startDate, selected, "date");
      if (field === "startTime")  updated.startDate = mergeDateTime(prev.startDate, selected, "time");
      if (field === "end")        updated.endDate   = mergeDateTime(prev.endDate, selected, "date");
      if (field === "endTime")    updated.endDate   = mergeDateTime(prev.endDate, selected, "time");
      if (field === "expiry")     updated.expiry    = mergeDateTime(prev.expiry, selected, "date");
      if (field === "expiryTime") updated.expiry    = mergeDateTime(prev.expiry, selected, "time");
      return updated;
    });
    if (Platform.OS === "ios") setPicker(null);
  };

  const mergeDateTime = (existing, picked, mode) => {
    const base = existing ? new Date(existing) : new Date();
    if (mode === "date") { base.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate()); }
    else                 { base.setHours(picked.getHours(), picked.getMinutes()); }
    return base.toISOString();
  };

  const categoryOf = (key) => CAT_MAP[key] || CAT_MAP["service"];

  /* ══════════════════════════════════════════════
                      RENDER
  ══════════════════════════════════════════════ */
  return (
    <SafeAreaView style={styles.safe}>
  <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

  <AppHeader
    title="Events"
    subtitle={`${filtered.length} event${filtered.length !== 1 ? "s" : ""}`}
    onBack={() => navigation.goBack()}
    actions={[
      {
        icon: "search-outline",
        onPress: () => setShowSearch(p => !p),
      },
      ...VIEWS.map(v => ({
        icon: v.icon,
        onPress: () => setViewMode(v.key),
      })),
      ...(canDo("deacon")
        ? [{
            icon: "add",
            onPress: openCreate,
          }]
        : [])
    ]}
  />


      {/* ── SEARCH BAR ── */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color="#aaa" />
          <TextInput style={styles.searchInput} placeholder="Search events…" placeholderTextColor="#bbb"
            value={searchText} onChangeText={setSearchText} autoFocus />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}><Ionicons name="close-circle" size={15} color="#ccc" /></TouchableOpacity>
          )}
        </View>
      )}

      {/* ── CATEGORY FILTER ── */}
      <View style={styles.catScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.key}
              style={[styles.catChip, filterCat === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
              onPress={() => setFilterCat(cat.key)}>
              <Ionicons name={cat.icon} size={13} color={filterCat === cat.key ? "#fff" : cat.color} />
              <Text style={[styles.catChipText, filterCat === cat.key && { color: "#fff" }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── FEATURED EVENTS — large hero cards ── */}
        {viewMode === "featured" && featured.length > 0 && (
          <View style={{ marginBottom: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 12 }}>
              {featured.map(ev => {
                const cat = categoryOf(ev.category);
                return (
                  <TouchableOpacity key={ev.id} style={styles.heroCard} onPress={() => { setViewingEvent(ev); setDetailModal(true); }}>
                    {ev.coverImage
                      ? <Image source={{ uri: ev.coverImage }} style={styles.heroImage} />
                      : <View style={[styles.heroImage, { backgroundColor: cat.color + "33", alignItems:"center", justifyContent:"center" }]}>
                          <Ionicons name={cat.icon} size={40} color={cat.color} />
                        </View>
                    }
                    <View style={styles.heroOverlay}>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <StatusBadge event={ev} />
                    </View>
                    <View style={styles.heroContent}>
                      <Text style={styles.heroTitle} numberOfLines={1}>{ev.title}</Text>
                      <View style={styles.heroMeta}>
                        <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.7)" />
                        {/* <Text style={styles.heroMetaText}>{fmtDate(ev.startDate)}</Text> */}
                        {ev.location && <><Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.7)" /><Text style={styles.heroMetaText} numberOfLines={1}>{ev.location}</Text></>}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── TWO COLUMN GRID ── */}
        {viewMode === "featured" && regular.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>📅 All Events</Text>
            <View style={styles.grid}>
              {regular.map(ev => {
                const cat = categoryOf(ev.category);
                return (
                  <TouchableOpacity key={ev.id} style={styles.gridCard}
                    onPress={() => { setViewingEvent(ev); setDetailModal(true); }}>
                    {/* Colour accent top */}
                    <View style={[styles.gridAccent, { backgroundColor: cat.color }]} />
                    <View style={styles.gridBody}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <View style={[styles.gridCatIcon, { backgroundColor: cat.color + "22" }]}>
                          <Ionicons name={cat.icon} size={14} color={cat.color} />
                        </View>
                        <StatusBadge event={ev} />
                      </View>
                      <Text style={styles.gridTitle} numberOfLines={2}>{ev.title}</Text>
                      <Text style={styles.gridDate} numberOfLines={1}>{fmtDate(ev.startDate)}</Text>
                      {ev.location && <Text style={styles.gridLoc} numberOfLines={1}><Ionicons name="location-outline" size={10} color="#aaa" /> {ev.location}</Text>}
                    </View>
                    {/* Featured toggle */}
                    {canDo("deacon") && (
                      <TouchableOpacity style={styles.starBtn} onPress={() => toggleFeatured(ev)}>
                        <Ionicons name={ev.featured ? "star" : "star-outline"} size={14} color={ev.featured ? "#FDCB6E" : "#ddd"} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === "list" && filtered.map(ev => {
          const cat = categoryOf(ev.category);
          return (
            <TouchableOpacity key={ev.id} style={styles.listCard}
              onPress={() => { setViewingEvent(ev); setDetailModal(true); }}>
              <View style={[styles.listDateBox, { borderColor: cat.color }]}>
                <Text style={[styles.listDay, { color: cat.color }]}>{ev.startDate ? new Date(ev.startDate).getDate() : "?"}</Text>
                <Text style={[styles.listMonth, { color: cat.color }]}>{ev.startDate ? new Date(ev.startDate).toLocaleString("en-GB",{month:"short"}) : ""}</Text>
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.listTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={styles.listMeta} numberOfLines={1}>{fmtTime(ev.startDate)}{ev.location ? ` · ${ev.location}` : ""}</Text>
                {ev.description && <Text style={styles.listDesc} numberOfLines={1}>{ev.description}</Text>}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <StatusBadge event={ev} />
                <View style={[styles.catDotSm, { backgroundColor: cat.color }]} />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── COMPACT VIEW ── */}
        {viewMode === "compact" && filtered.map(ev => {
          const cat = categoryOf(ev.category);
          return (
            <TouchableOpacity key={ev.id} style={styles.compactRow}
              onPress={() => { setViewingEvent(ev); setDetailModal(true); }}>
              <View style={[styles.compactDot, { backgroundColor: cat.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.compactTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={styles.compactMeta}>{fmtDate(ev.startDate)}{ev.location ? ` · ${ev.location}` : ""}</Text>
              </View>
              <StatusBadge event={ev} />
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No events found</Text>
            <Text style={styles.emptyText}>
              {canDo("deacon") ? "Tap + to create the first event" : "Check back soon for upcoming events"}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ══ EVENT DETAIL MODAL ══ */}
      <Modal visible={detailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />

            {viewingEvent && (() => {
              const cat = categoryOf(viewingEvent.category);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Cover / banner */}
                  {viewingEvent.coverImage
                    ? <Image source={{ uri: viewingEvent.coverImage }} style={styles.detailCover} />
                    : <View style={[styles.detailCover, { backgroundColor: cat.color + "22", alignItems:"center", justifyContent:"center" }]}>
                        <Ionicons name={cat.icon} size={52} color={cat.color} />
                      </View>
                  }

                  <View style={styles.detailBody}>
                    {/* Category + Status */}
                    <View style={styles.detailTopRow}>
                      <View style={[styles.catPill, { backgroundColor: cat.color + "22" }]}>
                        <Ionicons name={cat.icon} size={12} color={cat.color} />
                        <Text style={[styles.catPillText, { color: cat.color }]}>{cat.label}</Text>
                      </View>
                      <StatusBadge event={viewingEvent} />
                      {viewingEvent.featured && <View style={styles.featuredPill}><Ionicons name="star" size={11} color="#FDCB6E" /><Text style={styles.featuredPillText}>Featured</Text></View>}
                    </View>

                    <Text style={styles.detailTitle}>{viewingEvent.title}</Text>

                    {/* Info rows */}
                    {[
                      ["calendar-outline",  "Start",      fmtFull(viewingEvent.startDate)],
                      ["time-outline",      "End",        fmtFull(viewingEvent.endDate)],
                      ["location-outline",  "Location",   viewingEvent.location],
                      ["person-outline",    "Organizer",  viewingEvent.organizer],
                      ["refresh-outline",   "Recurring",  viewingEvent.recurring !== "none" ? viewingEvent.recurring : null],
                      ["timer-outline",     "Expires",    viewingEvent.expiry ? fmtFull(viewingEvent.expiry) : null],
                      ["people-outline",    "Max Guests", viewingEvent.maxAttendees || null],
                    ].filter(([,,v]) => v).map(([icon, label, value]) => (
                      <View key={label} style={styles.detailRow}>
                        <Ionicons name={icon} size={15} color="#4B3F72" style={{ width: 22 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailRowLabel}>{label}</Text>
                          <Text style={styles.detailRowValue}>{value}</Text>
                        </View>
                      </View>
                    ))}

                    {viewingEvent.description && (
                      <View style={styles.detailDescBox}>
                        <Text style={styles.detailDescLabel}>Description</Text>
                        <Text style={styles.detailDescText}>{viewingEvent.description}</Text>
                      </View>
                    )}

                    {viewingEvent.notes && (
                      <View style={[styles.detailDescBox, { backgroundColor: "#FFFBEB" }]}>
                        <Text style={[styles.detailDescLabel, { color: "#D97706" }]}>Notes</Text>
                        <Text style={styles.detailDescText}>{viewingEvent.notes}</Text>
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={styles.detailActions}>
                      {canDo("deacon") && (
                        <TouchableOpacity style={styles.detailEditBtn} onPress={() => openEdit(viewingEvent)}>
                          <Ionicons name="create-outline" size={15} color="#fff" />
                          <Text style={styles.detailBtnText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                      {canDo("deacon") && (
                        <TouchableOpacity
                          style={[styles.detailEditBtn, { backgroundColor: viewingEvent.featured ? "#FDCB6E" : "#EEF0FA" }]}
                          onPress={() => toggleFeatured(viewingEvent)}>
                          <Ionicons name={viewingEvent.featured ? "star" : "star-outline"} size={15} color={viewingEvent.featured ? "#fff" : "#4B3F72"} />
                          <Text style={[styles.detailBtnText, { color: viewingEvent.featured ? "#fff" : "#4B3F72" }]}>
                            {viewingEvent.featured ? "Unfeature" : "Feature"}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {canDo("pastor") && (
                        <TouchableOpacity style={[styles.detailEditBtn, { backgroundColor: "#e74c3c" }]} onPress={() => handleDelete(viewingEvent)}>
                          <Ionicons name="trash-outline" size={15} color="#fff" />
                          <Text style={styles.detailBtnText}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity style={styles.closeDetailBtn} onPress={() => setDetailModal(false)}>
                      <Text style={styles.closeDetailText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ══ CREATE / EDIT FORM MODAL ══ */}
      <Modal visible={formModal} animationType="slide">
        <SafeAreaView style={styles.formSafe}>
          <View style={styles.formHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={closeForm}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editingId ? "Edit Event" : "New Event"}</Text>
            <TouchableOpacity style={styles.saveFormBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveFormBtnText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formBody} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

            {/* Cover image */}
            <TouchableOpacity style={styles.coverUpload} onPress={pickCover} disabled={uploading}>
              {form.coverImage
                ? <Image source={{ uri: form.coverImage }} style={styles.coverPreview} />
                : <View style={styles.coverPlaceholder}>
                    <Ionicons name="image-outline" size={32} color="#aaa" />
                    <Text style={styles.coverPlaceholderText}>{uploading ? "Uploading…" : "Tap to add cover photo (16:9)"}</Text>
                  </View>
              }
            </TouchableOpacity>

            {/* ── SECTION: Basic Info ── */}
            <FormSection title="Basic Information">
              <FormLabel>Event Title *</FormLabel>
              <TextInput style={styles.input} placeholder="e.g. Sunday Worship Service" value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} />

              <FormLabel>Category</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CATEGORIES.filter(c => c.key !== "all").map(cat => (
                  <TouchableOpacity key={cat.key}
                    style={[styles.catChipSm, form.category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => setForm(p => ({ ...p, category: cat.key }))}>
                    <Ionicons name={cat.icon} size={12} color={form.category === cat.key ? "#fff" : cat.color} />
                    <Text style={[styles.catChipSmText, form.category === cat.key && { color: "#fff" }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FormLabel>Description</FormLabel>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="What is this event about?" value={form.description}
                onChangeText={t => setForm(p => ({ ...p, description: t }))} multiline />

              <FormLabel>Location</FormLabel>
              <TextInput style={styles.input} placeholder="e.g. Main Auditorium" value={form.location}
                onChangeText={t => setForm(p => ({ ...p, location: t }))} />

              <FormLabel>Organizer</FormLabel>
              <TextInput style={styles.input} placeholder="e.g. Youth Department" value={form.organizer}
                onChangeText={t => setForm(p => ({ ...p, organizer: t }))} />
            </FormSection>

            {/* ── SECTION: Date & Time ── */}
            <FormSection title="Date & Time">
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <FormLabel>Start Date</FormLabel>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker("start", form.startDate)}>
                    <Ionicons name="calendar-outline" size={14} color="#4B3F72" />
                    <Text style={styles.dateBtnText}>{form.startDate ? fmtDate(form.startDate) : "Pick date"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FormLabel>Start Time</FormLabel>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker("startTime", form.startDate)}>
                    <Ionicons name="time-outline" size={14} color="#4B3F72" />
                    <Text style={styles.dateBtnText}>{form.startDate ? fmtTime(form.startDate) : "Pick time"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <FormLabel>End Date</FormLabel>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker("end", form.endDate)}>
                    <Ionicons name="calendar-outline" size={14} color="#636e72" />
                    <Text style={[styles.dateBtnText, { color: "#888" }]}>{form.endDate ? fmtDate(form.endDate) : "Optional"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FormLabel>End Time</FormLabel>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker("endTime", form.endDate)}>
                    <Ionicons name="time-outline" size={14} color="#636e72" />
                    <Text style={[styles.dateBtnText, { color: "#888" }]}>{form.endDate ? fmtTime(form.endDate) : "Optional"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <FormLabel>Recurring</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {["none","daily","weekly","biweekly","monthly"].map(r => (
                  <TouchableOpacity key={r}
                    style={[styles.catChipSm, form.recurring === r && { backgroundColor: "#4B3F72", borderColor: "#4B3F72" }]}
                    onPress={() => setForm(p => ({ ...p, recurring: r }))}>
                    <Text style={[styles.catChipSmText, form.recurring === r && { color: "#fff" }]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </FormSection>

            {/* ── SECTION: Expiry ── */}
            <FormSection title="Auto-Expiry" subtitle="Event hides automatically after this date & time">
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <FormLabel>Expiry Date</FormLabel>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker("expiry", form.expiry)}>
                    <Ionicons name="calendar-outline" size={14} color="#e74c3c" />
                    <Text style={[styles.dateBtnText, { color: form.expiry ? "#e74c3c" : "#888" }]}>{form.expiry ? fmtDate(form.expiry) : "None"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FormLabel>Expiry Time</FormLabel>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker("expiryTime", form.expiry)}>
                    <Ionicons name="time-outline" size={14} color="#e74c3c" />
                    <Text style={[styles.dateBtnText, { color: form.expiry ? "#e74c3c" : "#888" }]}>{form.expiry ? fmtTime(form.expiry) : "None"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {form.expiry && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => setForm(p => ({ ...p, expiry: null }))}>
                  <Ionicons name="close-circle-outline" size={14} color="#e74c3c" />
                  <Text style={styles.clearBtnText}>Clear expiry</Text>
                </TouchableOpacity>
              )}
            </FormSection>

            {/* ── SECTION: Options (admin/pastor) ── */}
            {canDo("pastor") && (
              <FormSection title="Advanced Options">
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchLabel}>Featured Event</Text>
                    {/* <Text style={styles.switchSub}>Show in the featured carousel</Text> */}
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, form.featured && styles.toggleOn]}
                    onPress={() => setForm(p => ({ ...p, featured: !p.featured }))}>
                    <View style={[styles.toggleThumb, form.featured && styles.toggleThumbOn]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchLabel}>Enable RSVP</Text>
                    <Text style={styles.switchSub}>Allow members to register</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, form.rsvpEnabled && styles.toggleOn]}
                    onPress={() => setForm(p => ({ ...p, rsvpEnabled: !p.rsvpEnabled }))}>
                    <View style={[styles.toggleThumb, form.rsvpEnabled && styles.toggleThumbOn]} />
                  </TouchableOpacity>
                </View>

                {form.rsvpEnabled && (
                  <>
                    <FormLabel>Max Attendees (optional)</FormLabel>
                    <TextInput style={styles.input} placeholder="Leave blank for unlimited"
                      keyboardType="number-pad" value={form.maxAttendees}
                      onChangeText={t => setForm(p => ({ ...p, maxAttendees: t }))} />
                  </>
                )}

                <FormLabel>Internal Notes (not visible to members)</FormLabel>
                <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                  placeholder="Notes for leaders only…" value={form.notes}
                  onChangeText={t => setForm(p => ({ ...p, notes: t }))} multiline />
              </FormSection>
            )}

          </ScrollView>

          {/* Date/time picker sheet */}
          {picker && (
            <View style={styles.pickerSheet}>
              <View style={styles.pickerSheetHeader}>
                <Text style={styles.pickerSheetTitle}>
                  {picker.includes("Time") ? "Select Time" : "Select Date"}
                </Text>
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <Text style={{ color: "#4B3F72", fontWeight: "700" }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode={picker.includes("Time") ? "time" : "date"}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, d) => {
                  if (d) setPickerDate(d);
                  handlePickerChange(e, d);
                }}
                style={{ alignSelf: "center" }}
              />
            </View>
          )}

        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

/* ── Helper components ── */
function FormSection({ title, subtitle, children }) {
  return (
    <View style={styles.formSection}>
      <Text style={styles.formSectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.formSectionSub}>{subtitle}</Text>}
      {children}
    </View>
  );
}
function FormLabel({ children }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  formSafe: { flex: 1, backgroundColor: "#fff" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, paddingTop: Platform.OS === "android" ? 30 : 16, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "800",
  marginTop: 2
},


  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 14, marginBottom: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#222", padding: 0 },

  catScroll: { paddingVertical: 8 },
  catChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1.5, borderColor: "#e8e8e8", gap: 5 },
  catChipText: { fontSize: 12, fontWeight: "600", color: "#555" },

  body: { flex: 1, backgroundColor: "#f4f6fb" },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#555", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  /* Hero / featured cards */
  heroCard: { width: W * 0.72, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff", elevation: 4, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8 },
  heroImage: { width: "100%", height: 140 },
  heroOverlay: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroContent: { padding: 12 },
  heroTitle: { fontSize: 15, fontWeight: "800", color: "#222", marginBottom: 4 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  heroMetaText: { fontSize: 11, color: "#888" },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catDotSm: { width: 6, height: 6, borderRadius: 3 },

  /* Two-column grid */
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, gap: 10, marginBottom: 8 },
  gridCard: { width: (W - 30) / 2, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2 },
  gridAccent: { height: 4, width: "100%" },
  gridBody: { padding: 12 },
  gridCatIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  gridTitle: { fontSize: 13, fontWeight: "700", color: "#222", marginTop: 6, marginBottom: 4, lineHeight: 17 },
  gridDate: { fontSize: 11, color: "#4B3F72", fontWeight: "600" },
  gridLoc: { fontSize: 10, color: "#aaa", marginTop: 2 },
  starBtn: { position: "absolute", top: 8, right: 8 },

  /* List view */
  listCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 14, marginBottom: 8, borderRadius: 14, padding: 14, elevation: 1 },
  listDateBox: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  listDay: { fontSize: 17, fontWeight: "900" },
  listMonth: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  listTitle: { fontSize: 14, fontWeight: "700", color: "#222" },
  listMeta: { fontSize: 11, color: "#4B3F72", marginTop: 2, fontWeight: "600" },
  listDesc: { fontSize: 11, color: "#aaa", marginTop: 2 },

  /* Compact view */
  compactRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 14, marginBottom: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, gap: 10, elevation: 1 },
  compactDot: { width: 10, height: 10, borderRadius: 5 },
  compactTitle: { fontSize: 13, fontWeight: "700", color: "#222" },
  compactMeta: { fontSize: 11, color: "#888" },

  /* Status badge */
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  /* Empty state */
  emptyState: { alignItems: "center", padding: 50 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 14 },
  emptyText: { fontSize: 13, color: "#aaa", textAlign: "center", marginTop: 6, lineHeight: 19 },

  /* Detail modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  detailSheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "90%", overflow: "hidden" },
  sheetHandle: { width: 36, height: 4, backgroundColor: "#ddd", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  detailCover: { width: "100%", height: 180 },
  detailBody: { padding: 20 },
  detailTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  catPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catPillText: { fontSize: 11, fontWeight: "700" },
  featuredPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFFBEB", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  featuredPillText: { fontSize: 11, fontWeight: "700", color: "#FDCB6E" },
  detailTitle: { fontSize: 20, fontWeight: "900", color: "#222", marginBottom: 14 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", gap: 10 },
  detailRowLabel: { fontSize: 10, fontWeight: "700", color: "#aaa", textTransform: "uppercase" },
  detailRowValue: { fontSize: 13, color: "#333", marginTop: 2 },
  detailDescBox: { backgroundColor: "#f9f9f9", borderRadius: 12, padding: 14, marginTop: 10 },
  detailDescLabel: { fontSize: 10, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 4 },
  detailDescText: { fontSize: 13, color: "#444", lineHeight: 20 },
  detailActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  detailEditBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, gap: 5 },
  detailBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  closeDetailBtn: { alignItems: "center", padding: 14, marginTop: 4 },
  closeDetailText: { color: "#888", fontSize: 13 },

  /* Form */
  formHeader: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#4B3F72",
  paddingHorizontal: 14,
  paddingTop: Platform.OS === "android" ? 28 : 16,   
  paddingBottom: 12,
  gap: 10,
},
  saveFormBtn: { backgroundColor: "#1BA97F", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  saveFormBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  formBody: { backgroundColor: "#f4f6fb", flex: 1 },
  formSection: { backgroundColor: "#fff", marginHorizontal: 14, marginTop: 14, borderRadius: 14, padding: 16, elevation: 1 },
  formSectionTitle: { fontSize: 13, fontWeight: "800", color: "#4B3F72", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  formSectionSub: { fontSize: 11, color: "#888", marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 11, fontSize: 13, color: "#222", borderWidth: 1.5, borderColor: "#eee", marginBottom: 4 },

  coverUpload: { marginHorizontal: 14, marginTop: 14, borderRadius: 14, overflow: "hidden", height: 160 },
  coverPreview: { width: "100%", height: "100%" },
  coverPlaceholder: { flex: 1, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#e0e0e0", borderStyle: "dashed", borderRadius: 14 },
  coverPlaceholderText: { color: "#aaa", fontSize: 12, marginTop: 8 },

  twoCol: { flexDirection: "row", marginBottom: 8 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#f5f5f5", borderRadius: 10, padding: 11, borderWidth: 1.5, borderColor: "#eee" },
  dateBtnText: { fontSize: 12, fontWeight: "600", color: "#4B3F72", flex: 1 },

  catChipSm: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#f5f5f5", borderRadius: 16, borderWidth: 1.5, borderColor: "#eee", marginRight: 6, gap: 4 },
  catChipSmText: { fontSize: 11, fontWeight: "600", color: "#555" },

  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  clearBtnText: { fontSize: 12, color: "#e74c3c", fontWeight: "600" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#222" },
  switchSub: { fontSize: 11, color: "#888", marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: "#ddd", justifyContent: "center", paddingHorizontal: 2 },
  toggleOn: { backgroundColor: "#4B3F72" },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", elevation: 2 },
  toggleThumbOn: { alignSelf: "flex-end" },

  pickerSheet: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee" },
  pickerSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  pickerSheetTitle: { fontSize: 14, fontWeight: "700", color: "#222" },
});

