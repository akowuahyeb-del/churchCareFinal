
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Image, Alert, SafeAreaView,
  StatusBar, Platform, ActivityIndicator, Dimensions
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { db, storage } from "../firebase";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, where, orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const { width: W } = Dimensions.get("window");

// ── Role permissions ───────────────────────────────────────────────
// admin  → can do everything
// pastor → can edit content, add agents, cannot delete
// elder  → can view only + add comments
// member → view only
const ROLE = "admin"; // replace with auth context

const CAN_EDIT   = ["admin", "pastor"].includes(ROLE);
const CAN_DELETE = ["admin"].includes(ROLE);
const CAN_ADD    = ["admin", "pastor"].includes(ROLE);

// ── Tabs ───────────────────────────────────────────────────────────
const TABS = [
  { name: "Overview",    icon: "home-outline",        color: "#6C5CE7" },
  { name: "Founders",    icon: "people-outline",       color: "#0984E3" },
  { name: "Milestones",  icon: "flag-outline",         color: "#00B894" },
  { name: "Vision",      icon: "eye-outline",          color: "#E17055" },
  { name: "Pastors",     icon: "person-outline",       color: "#4B3F72" },
  { name: "Gallery",     icon: "images-outline",       color: "#FDCB6E" },
];

// ── Section field definitions ──────────────────────────────────────
const SECTION_FIELDS = {
  Overview: [
    { key: "founding_year",  label: "Year Founded",         multiline: false },
    { key: "denomination",   label: "Denomination",         multiline: false },
    { key: "location",       label: "Location / Address",   multiline: false },
    { key: "description",    label: "Church Description",   multiline: true, height: 100 },
    { key: "mission",        label: "Mission Statement",    multiline: true, height: 80 },
    { key: "core_values",    label: "Core Values",          multiline: true, height: 80 },
  ],
  Founders: [
    { key: "founder_names",  label: "Founder Names",        multiline: true,  height: 60 },
    { key: "founding_story", label: "Founding Story",       multiline: true,  height: 120 },
    { key: "background",     label: "Background & Context", multiline: true,  height: 100 },
    { key: "legacy",         label: "Their Legacy",         multiline: true,  height: 80 },
  ],
  Milestones: [
    // milestones handled as a list (see renderMilestones)
  ],
  Vision: [
    { key: "vision_statement", label: "Vision Statement",    multiline: true,  height: 100 },
    { key: "strategic_goals",  label: "Strategic Goals",     multiline: true,  height: 100 },
    { key: "future_plans",     label: "Future Plans",        multiline: true,  height: 80 },
    { key: "scripture_ref",    label: "Scripture Reference", multiline: false },
  ],
};

const PASTOR_FIELDS = [
  { key: "name",         label: "Full Name *",         multiline: false },
  { key: "title",        label: "Title / Rank",        multiline: false },
  { key: "years_served", label: "Years Served",        multiline: false },
  { key: "start_year",   label: "Start Year",          multiline: false },
  { key: "end_year",     label: "End Year (or 'Present')", multiline: false },
  { key: "transferred_to", label: "Transferred To",   multiline: false },
  { key: "contribution", label: "Key Contributions",   multiline: true, height: 80 },
  { key: "bio",          label: "Biography",           multiline: true, height: 100 },
  { key: "achievements", label: "Achievements",        multiline: true, height: 80 },
];

const MILESTONE_FIELDS = [
  { key: "year",        label: "Year *",        multiline: false },
  { key: "title",       label: "Title *",       multiline: false },
  { key: "description", label: "Description",   multiline: true, height: 80 },
  { key: "significance",label: "Significance",  multiline: true, height: 60 },
];

const GALLERY_FIELDS = [
  { key: "caption",     label: "Caption",       multiline: false },
  { key: "year",        label: "Year",          multiline: false },
  { key: "event",       label: "Event / Occasion", multiline: false },
];

// ── Empty defaults ─────────────────────────────────────────────────
const emptySection = (fields) => fields.reduce((o, f) => ({ ...o, [f.key]: "" }), { photo: null });
const emptyPastor  = () => PASTOR_FIELDS.reduce((o, f) => ({ ...o, [f.key]: "" }), { photo: null });
const emptyMilestone = () => MILESTONE_FIELDS.reduce((o, f) => ({ ...o, [f.key]: "" }), { photo: null });
const emptyGallery = () => GALLERY_FIELDS.reduce((o, f) => ({ ...o, [f.key]: "" }), { photo: null });

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("Overview");

  // Section data (for Overview, Founders, Vision)
  const [sectionData, setSectionData] = useState({
    Overview:  { ...emptySection(SECTION_FIELDS.Overview),  photo: null, id: null },
    Founders:  { ...emptySection(SECTION_FIELDS.Founders),  photo: null, id: null },
    Vision:    { ...emptySection(SECTION_FIELDS.Vision),    photo: null, id: null },
  });

  // Lists
  const [pastors,     setPastors]     = useState([]);
  const [milestones,  setMilestones]  = useState([]);
  const [gallery,     setGallery]     = useState([]);

  // Modal state
  const [modalVisible,   setModalVisible]   = useState(false);
  const [modalMode,      setModalMode]      = useState("edit"); // edit | add
  const [editingItem,    setEditingItem]    = useState(null);
  const [editingIndex,   setEditingIndex]   = useState(null);
  const [formData,       setFormData]       = useState({});
  const [uploading,      setUploading]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [loading,        setLoading]        = useState(false);

  // Image fullscreen
  const [fullscreenImg,  setFullscreenImg]  = useState(null);

  /* ══════════ LOAD ══════════ */
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Load section docs
      const sectSnap = await getDocs(collection(db, "church_history"));
      sectSnap.docs.forEach(d => {
        const data = d.data();
        if (["Overview","Founders","Vision"].includes(data.section)) {
          setSectionData(prev => ({ ...prev, [data.section]: { ...data, id: d.id } }));
        }
      });
      // Load pastors
      const pastSnap = await getDocs(query(collection(db, "church_pastors"), orderBy("start_year", "asc")));
      setPastors(pastSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      // Load milestones
      const milSnap = await getDocs(query(collection(db, "church_milestones"), orderBy("year", "asc")));
      setMilestones(milSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      // Load gallery
      const galSnap = await getDocs(collection(db, "church_gallery"));
      setGallery(galSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  /* ══════════ PHOTO UPLOAD ══════════ */
  const pickPhoto = async (folder) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return null; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8
    });
    if (result.canceled) return null;
    setUploading(true);
    try {
      const uri  = result.assets[0].uri;
      const blob = await new Promise((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.onload  = () => res(xhr.response);
        xhr.onerror = () => rej(new TypeError("Network error"));
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });
      const storageRef = ref(storage, `${folder}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      blob.close && blob.close();
      return await getDownloadURL(storageRef);
    } catch (e) { Alert.alert("Upload failed", e.message); return null; }
    finally { setUploading(false); }
  };

  /* ══════════ OPEN MODALS ══════════ */
  const openSectionEdit = (section) => {
    setModalMode("edit");
    setFormData({ ...sectionData[section] });
    setEditingItem(section);
    setModalVisible(true);
  };

  const openAddItem = () => {
    setModalMode("add");
    setEditingIndex(null);
    if (activeTab === "Pastors")    setFormData(emptyPastor());
    if (activeTab === "Milestones") setFormData(emptyMilestone());
    if (activeTab === "Gallery")    setFormData(emptyGallery());
    setModalVisible(true);
  };

  const openEditItem = (item, idx) => {
    setModalMode("edit");
    setEditingIndex(idx);
    setFormData({ ...item });
    setModalVisible(true);
  };

  /* ══════════ SAVE ══════════ */
  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === "Milestones" || activeTab === "Pastors" || activeTab === "Gallery") {
        // List item
        const collName = activeTab === "Pastors" ? "church_pastors"
                       : activeTab === "Milestones" ? "church_milestones"
                       : "church_gallery";
        if (modalMode === "add" || !formData.id) {
          const docRef = await addDoc(collection(db, collName), { ...formData, createdAt: new Date().toISOString() });
          const newItem = { ...formData, id: docRef.id };
          if (activeTab === "Pastors")    setPastors(p => [...p, newItem].sort((a,b)=>(a.start_year||"").localeCompare(b.start_year||"")));
          if (activeTab === "Milestones") setMilestones(p => [...p, newItem].sort((a,b)=>(a.year||"").localeCompare(b.year||"")));
          if (activeTab === "Gallery")    setGallery(p => [...p, newItem]);
        } else {
          await updateDoc(doc(db, collName, formData.id), { ...formData, updatedAt: new Date().toISOString() });
          const updater = (list) => list.map(i => i.id === formData.id ? { ...formData } : i);
          if (activeTab === "Pastors")    setPastors(updater);
          if (activeTab === "Milestones") setMilestones(updater);
          if (activeTab === "Gallery")    setGallery(updater);
        }
      } else {
        // Section (Overview / Founders / Vision)
        const section = editingItem || activeTab;
        if (sectionData[section]?.id) {
          await updateDoc(doc(db, "church_history", sectionData[section].id), { ...formData, section, updatedAt: new Date().toISOString() });
        } else {
          const docRef = await addDoc(collection(db, "church_history"), { ...formData, section, createdAt: new Date().toISOString() });
          formData.id = docRef.id;
        }
        setSectionData(prev => ({ ...prev, [section]: { ...formData, section } }));
      }
      setModalVisible(false);
    } catch (e) { Alert.alert("Save failed", e.message); }
    finally { setSaving(false); }
  };

  /* ══════════ DELETE ══════════ */
  const handleDelete = (item, collName, setter) => {
    if (!CAN_DELETE) { Alert.alert("Access denied", "Only admins can delete records."); return; }
    Alert.alert("Delete?", "This cannot be undone.", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          if (item.id) await deleteDoc(doc(db, collName, item.id));
          setter(prev => prev.filter(i => i.id !== item.id));
        } catch (e) { Alert.alert("Error", e.message); }
      }}
    ]);
  };

  const handleDeleteSection = (section) => {
    if (!CAN_DELETE) { Alert.alert("Access denied"); return; }
    Alert.alert("Clear section?", "All content in this section will be cleared.", [
      { text: "Cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        try {
          if (sectionData[section]?.id) {
            await deleteDoc(doc(db, "church_history", sectionData[section].id));
          }
          const empty = emptySection(SECTION_FIELDS[section] || []);
          setSectionData(prev => ({ ...prev, [section]: { ...empty, id: null } }));
        } catch (e) { Alert.alert("Error", e.message); }
      }}
    ]);
  };

  /* ══════════ FIELD RENDER ══════════ */
  const renderFields = (fields) => fields.map(f => (
    <View key={f.key}>
      <Text style={styles.fieldLabel}>{f.label}</Text>
      <TextInput
        style={[styles.input, f.multiline && { height: f.height || 80, textAlignVertical: "top" }]}
        value={formData[f.key] || ""}
        onChangeText={t => setFormData(p => ({ ...p, [f.key]: t }))}
        multiline={f.multiline}
        placeholder={`Enter ${f.label.toLowerCase()}…`}
        placeholderTextColor="#bbb"
      />
    </View>
  ));

  /* ══════════ SECTION TAB CONTENT ══════════ */
  const renderSection = (section) => {
    const fields = SECTION_FIELDS[section];
    const data   = sectionData[section];
    const hasContent = fields.some(f => data[f.key]);
    return (
      <View>
        {data.photo && (
          <TouchableOpacity onPress={() => setFullscreenImg(data.photo)}>
            <Image source={{ uri: data.photo }} style={styles.sectionPhoto} />
          </TouchableOpacity>
        )}

        {hasContent ? (
          <View style={styles.sectionCard}>
            {fields.map(f => data[f.key] ? (
              <View key={f.key} style={styles.sectionField}>
                <Text style={styles.sectionFieldLabel}>{f.label}</Text>
                <Text style={styles.sectionFieldText}>{data[f.key]}</Text>
              </View>
            ) : null)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>No content yet for {section}</Text>
          </View>
        )}

        {CAN_EDIT && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openSectionEdit(section)}>
              <Ionicons name="create-outline" size={14} color="#fff" />
              <Text style={styles.btnText}>{hasContent ? "Edit" : "Add Content"}</Text>
            </TouchableOpacity>
            {hasContent && CAN_DELETE && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteSection(section)}>
                <Ionicons name="trash-outline" size={14} color="#fff" />
                <Text style={styles.btnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  /* ══════════ PASTORS (TIMELINE) ══════════ */
  const renderPastors = () => (
    <View>
      {CAN_ADD && (
        <TouchableOpacity style={styles.addBtn} onPress={openAddItem}>
          <Ionicons name="add-circle-outline" size={15} color="#fff" />
          <Text style={styles.addBtnText}>Add Pastor</Text>
        </TouchableOpacity>
      )}
      {pastors.length === 0 && <View style={styles.emptyState}><Ionicons name="person-outline" size={40} color="#ddd"/><Text style={styles.emptyText}>No past pastors recorded yet</Text></View>}
      {pastors.map((p, i) => (
        <View key={p.id || i} style={styles.timelineRow}>
          <View style={styles.timelineLeft}>
            <View style={[styles.timelineDot, { backgroundColor: "#4B3F72" }]} />
            {i < pastors.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineCard}>
            <View style={styles.timelineCardHeader}>
              {p.photo
                ? <TouchableOpacity onPress={() => setFullscreenImg(p.photo)}>
                    <Image source={{ uri: p.photo }} style={styles.pastorPhoto} />
                  </TouchableOpacity>
                : <View style={styles.pastorPhotoPlaceholder}><Ionicons name="person" size={24} color="#ccc" /></View>
              }
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.pastorName} numberOfLines={1}>{p.name}</Text>
                {p.title     && <Text style={styles.pastorTitle}>{p.title}</Text>}
                {(p.start_year || p.end_year) && (
                  <Text style={styles.pastorYears}>{p.start_year} – {p.end_year || "Present"}</Text>
                )}
              </View>
            </View>
            {p.transferred_to && <InfoRow icon="swap-horizontal-outline" label="Transferred to" value={p.transferred_to} />}
            {p.contribution   && <InfoRow icon="star-outline"            label="Contributions"  value={p.contribution} />}
            {p.bio            && <InfoRow icon="book-outline"            label="Biography"      value={p.bio} />}
            {p.achievements   && <InfoRow icon="trophy-outline"          label="Achievements"   value={p.achievements} />}
            {(CAN_EDIT || CAN_DELETE) && (
              <View style={styles.actionRow}>
                {CAN_EDIT && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEditItem(p, i)}>
                    <Ionicons name="create-outline" size={13} color="#fff" />
                    <Text style={styles.btnText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {CAN_DELETE && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p, "church_pastors", setPastors)}>
                    <Ionicons name="trash-outline" size={13} color="#fff" />
                    <Text style={styles.btnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  /* ══════════ MILESTONES ══════════ */
  const renderMilestones = () => (
    <View>
      {CAN_ADD && (
        <TouchableOpacity style={styles.addBtn} onPress={openAddItem}>
          <Ionicons name="add-circle-outline" size={15} color="#fff" />
          <Text style={styles.addBtnText}>Add Milestone</Text>
        </TouchableOpacity>
      )}
      {milestones.length === 0 && <View style={styles.emptyState}><Ionicons name="flag-outline" size={40} color="#ddd"/><Text style={styles.emptyText}>No milestones recorded yet</Text></View>}
      {milestones.map((m, i) => (
        <View key={m.id || i} style={styles.timelineRow}>
          <View style={styles.timelineLeft}>
            <View style={[styles.timelineDot, { backgroundColor: "#00B894" }]} />
            {i < milestones.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineCard}>
            <View style={styles.milestoneHeader}>
              <View style={styles.yearBadge}><Text style={styles.yearBadgeText}>{m.year}</Text></View>
              <Text style={styles.milestoneTitle} numberOfLines={2}>{m.title}</Text>
            </View>
            {m.photo && <TouchableOpacity onPress={() => setFullscreenImg(m.photo)}><Image source={{ uri: m.photo }} style={styles.milestonePhoto} /></TouchableOpacity>}
            {m.description  && <Text style={styles.milestoneDesc}>{m.description}</Text>}
            {m.significance && <InfoRow icon="bulb-outline" label="Significance" value={m.significance} />}
            {(CAN_EDIT || CAN_DELETE) && (
              <View style={styles.actionRow}>
                {CAN_EDIT && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEditItem(m, i)}>
                    <Ionicons name="create-outline" size={13} color="#fff" /><Text style={styles.btnText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {CAN_DELETE && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(m, "church_milestones", setMilestones)}>
                    <Ionicons name="trash-outline" size={13} color="#fff" /><Text style={styles.btnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  /* ══════════ GALLERY ══════════ */
  const renderGallery = () => (
    <View>
      {CAN_ADD && (
        <TouchableOpacity style={styles.addBtn} onPress={openAddItem}>
          <Ionicons name="add-circle-outline" size={15} color="#fff" />
          <Text style={styles.addBtnText}>Add Photo</Text>
        </TouchableOpacity>
      )}
      {gallery.length === 0 && <View style={styles.emptyState}><Ionicons name="images-outline" size={40} color="#ddd"/><Text style={styles.emptyText}>No photos yet</Text></View>}
      <View style={styles.galleryGrid}>
        {gallery.map((g, i) => (
          <View key={g.id || i} style={styles.galleryItem}>
            <TouchableOpacity onPress={() => g.photo && setFullscreenImg(g.photo)}>
              {g.photo
                ? <Image source={{ uri: g.photo }} style={styles.galleryPhoto} />
                : <View style={[styles.galleryPhoto, styles.galleryPhotoEmpty]}><Ionicons name="image-outline" size={28} color="#ccc"/></View>
              }
            </TouchableOpacity>
            {g.caption && <Text style={styles.galleryCaption} numberOfLines={1}>{g.caption}</Text>}
            {g.year    && <Text style={styles.galleryYear}>{g.year}{g.event ? ` · ${g.event}` : ""}</Text>}
            {(CAN_EDIT || CAN_DELETE) && (
              <View style={[styles.actionRow, { marginTop: 4 }]}>
                {CAN_EDIT && (
                  <TouchableOpacity style={[styles.editBtn, { flex: 1 }]} onPress={() => openEditItem(g, i)}>
                    <Ionicons name="create-outline" size={12} color="#fff" /><Text style={[styles.btnText, { fontSize: 10 }]}>Edit</Text>
                  </TouchableOpacity>
                )}
                {CAN_DELETE && (
                  <TouchableOpacity style={[styles.deleteBtn, { flex: 1, marginLeft: 4 }]} onPress={() => handleDelete(g, "church_gallery", setGallery)}>
                    <Ionicons name="trash-outline" size={12} color="#fff" /><Text style={[styles.btnText, { fontSize: 10 }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  /* ══════════ MODAL FIELDS ══════════ */
  const getModalFields = () => {
    if (activeTab === "Pastors")    return PASTOR_FIELDS;
    if (activeTab === "Milestones") return MILESTONE_FIELDS;
    if (activeTab === "Gallery")    return GALLERY_FIELDS;
    if (["Overview","Founders","Vision"].includes(activeTab)) return SECTION_FIELDS[activeTab];
    return [];
  };

  const showPhotoUpload = ["Pastors","Milestones","Gallery","Overview","Founders"].includes(activeTab);

  const activeTabData = TABS.find(t => t.name === activeTab);

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Church History</Text>
          <Text style={styles.headerSub}>Records & Heritage</Text>
        </View>
        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: CAN_EDIT ? "#27ae6022" : "#88888822" }]}>
          <Text style={[styles.roleText, { color: CAN_EDIT ? "#27ae60" : "#888" }]}>
            {ROLE}
          </Text>
        </View>
      </View>

      {/* ── TABS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.name}
            style={[styles.tabBtn, activeTab === tab.name && { backgroundColor: tab.color, borderColor: tab.color }]}
            onPress={() => setActiveTab(tab.name)}>
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.name ? "#fff" : tab.color} />
            <Text style={[styles.tabText, activeTab === tab.name && { color: "#fff" }]}>{tab.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── CONTENT ── */}
      {loading ? (
        <View style={styles.loader}><ActivityIndicator color="#4B3F72" size="large" /></View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

          {/* Tab subtitle */}
          <View style={[styles.tabTitleRow, { borderLeftColor: activeTabData?.color }]}>
            <Ionicons name={activeTabData?.icon} size={16} color={activeTabData?.color} />
            <Text style={[styles.tabTitle, { color: activeTabData?.color }]}>{activeTab}</Text>
            {!CAN_EDIT && <Text style={styles.readOnlyBadge}>View only</Text>}
          </View>

          {activeTab === "Overview"   && renderSection("Overview")}
          {activeTab === "Founders"   && renderSection("Founders")}
          {activeTab === "Vision"     && renderSection("Vision")}
          {activeTab === "Pastors"    && renderPastors()}
          {activeTab === "Milestones" && renderMilestones()}
          {activeTab === "Gallery"    && renderGallery()}

        </ScrollView>
      )}

      {/* ── MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalMode === "add" ? `Add ${activeTab === "Pastors" ? "Pastor" : activeTab === "Milestones" ? "Milestone" : "Photo"}` : `Edit ${activeTab}`}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#aaa" />
                </TouchableOpacity>
              </View>

              {!CAN_EDIT && (
                <View style={styles.accessDenied}>
                  <Ionicons name="lock-closed-outline" size={16} color="#e74c3c" />
                  <Text style={styles.accessDeniedText}>You have view-only access. Contact an admin to make changes.</Text>
                </View>
              )}

              {/* Photo upload */}
              {showPhotoUpload && (
                <View style={styles.photoUploadArea}>
                  <Text style={styles.fieldLabel}>Photo</Text>
                  <TouchableOpacity
                    style={styles.photoUploadBtn}
                    disabled={!CAN_EDIT || uploading}
                    onPress={async () => {
                      const url = await pickPhoto(activeTab.toLowerCase());
                      if (url) setFormData(p => ({ ...p, photo: url }));
                    }}>
                    {formData.photo
                      ? <Image source={{ uri: formData.photo }} style={styles.photoPreview} />
                      : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera-outline" size={28} color="#aaa" />
                          <Text style={styles.photoPlaceholderText}>{uploading ? "Uploading…" : "Tap to upload photo"}</Text>
                        </View>
                      )
                    }
                  </TouchableOpacity>
                  {formData.photo && (
                    <TouchableOpacity onPress={() => setFormData(p => ({ ...p, photo: null }))} style={styles.removePhotoBtn}>
                      <Ionicons name="close-circle" size={14} color="#e74c3c" />
                      <Text style={styles.removePhotoText}>Remove photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Fields */}
              {renderFields(getModalFields())}

              {/* Save / Cancel */}
              {CAN_EDIT && (
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={styles.saveBtnText}>Save</Text></>
                  }
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── FULLSCREEN IMAGE ── */}
      <Modal visible={!!fullscreenImg} transparent animationType="fade">
        <View style={styles.fullscreenWrap}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenImg(null)}>
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
          {fullscreenImg && <Image source={{ uri: fullscreenImg }} style={styles.fullscreenImg} resizeMode="contain" />}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ── Info row helper ── */
function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={13} color="#4B3F72" style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 1 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

  tabScroll: { backgroundColor: "#f4f6fb", maxHeight: 52 },
  tabBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: "#fff", borderRadius: 20, borderWidth: 1.5, borderColor: "#e8e8e8", gap: 5 },
  tabText: { fontSize: 12, fontWeight: "700", color: "#555" },

  body: { flex: 1, backgroundColor: "#f4f6fb", paddingHorizontal: 14, paddingTop: 12 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f6fb" },

  tabTitleRow: { flexDirection: "row", alignItems: "center", borderLeftWidth: 4, paddingLeft: 10, marginBottom: 14, gap: 6 },
  tabTitle: { fontSize: 15, fontWeight: "800" },
  readOnlyBadge: { backgroundColor: "#eee", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, color: "#888", fontWeight: "600", marginLeft: 8 },

  /* Section */
  sectionCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  sectionPhoto: { width: "100%", height: 200, borderRadius: 12, marginBottom: 12 },
  sectionField: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", paddingBottom: 12 },
  sectionFieldLabel: { fontSize: 10, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginBottom: 4 },
  sectionFieldText: { fontSize: 14, color: "#333", lineHeight: 22, fontWeight: "500" },

  /* Action buttons */
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  editBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4B3F72", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, gap: 5 },
  deleteBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#e74c3c", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, gap: 5 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", padding: 11, borderRadius: 10, marginBottom: 14, gap: 6 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  /* Timeline */
  timelineRow: { flexDirection: "row", marginBottom: 16 },
  timelineLeft: { width: 28, alignItems: "center" },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 8 },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#ddd", marginTop: 4 },
  timelineCard: { flex: 1, backgroundColor: "#fff", padding: 14, borderRadius: 14, marginLeft: 10, elevation: 2 },
  timelineCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  pastorPhoto: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: "#4B3F72" },
  pastorPhotoPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  pastorName: { fontSize: 15, fontWeight: "800", color: "#222" },
  pastorTitle: { fontSize: 12, color: "#4B3F72", fontWeight: "600", marginTop: 2 },
  pastorYears: { fontSize: 11, color: "#888", marginTop: 2 },

  /* Milestone */
  milestoneHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  yearBadge: { backgroundColor: "#00B894", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  yearBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  milestoneTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#222" },
  milestonePhoto: { width: "100%", height: 140, borderRadius: 10, marginBottom: 8 },
  milestoneDesc: { fontSize: 13, color: "#444", lineHeight: 20, marginBottom: 6 },

  /* Gallery */
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  galleryItem: { width: (W - 48) / 2, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", elevation: 2, padding: 6 },
  galleryPhoto: { width: "100%", height: 120, borderRadius: 8 },
  galleryPhotoEmpty: { backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  galleryCaption: { fontSize: 11, fontWeight: "600", color: "#333", marginTop: 5 },
  galleryYear: { fontSize: 10, color: "#888", marginTop: 2 },

  /* InfoRow */
  infoRow: { flexDirection: "row", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  infoLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 13, color: "#333", lineHeight: 19 },

  /* Empty state */
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "#bbb", fontSize: 13, marginTop: 10, textAlign: "center" },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: "92%", paddingBottom: Platform.OS === "ios" ? 34 : 24 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#222" },

  accessDenied: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fdecea",
    borderRadius: 10, padding: 12, marginBottom: 14 },
  accessDeniedText: { flex: 1, fontSize: 12, color: "#e74c3c", lineHeight: 18 },

  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 11, fontSize: 13, color: "#222",
    borderWidth: 1.5, borderColor: "#eee" },

  photoUploadArea: { marginBottom: 8 },
  photoUploadBtn: { borderRadius: 12, overflow: "hidden" },
  photoPreview: { width: "100%", height: 160, borderRadius: 12 },
  photoPlaceholder: { backgroundColor: "#f5f5f5", borderRadius: 12, height: 120, alignItems: "center",
    justifyContent: "center", borderWidth: 2, borderColor: "#eee", borderStyle: "dashed" },
  photoPlaceholderText: { color: "#aaa", fontSize: 12, marginTop: 6 },
  removePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  removePhotoText: { fontSize: 11, color: "#e74c3c" },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#4B3F72", borderRadius: 12, padding: 14, marginTop: 16, gap: 6 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cancelBtn: { alignItems: "center", padding: 12, marginTop: 4 },
  cancelBtnText: { color: "#888", fontSize: 13 },

  fullscreenWrap: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  fullscreenClose: { position: "absolute", top: 48, right: 20, zIndex: 10 },
  fullscreenImg: { width: W, height: W * 1.3 },
});

