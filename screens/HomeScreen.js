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
import ChurchSwitcher from "../components/ChurchSwitcher";
import { handleQRCode } from "../utils/qrRouter";
import { CameraView, useCameraPermissions } from "expo-camera";
import { addDoc } from "firebase/firestore";
import ChurchLogo from "../components/ChurchLogo";


/* ── firebase ── */
import { db, storage, auth } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import AppText from "../components/AppText";
import { getAttendanceSummary } from "../utils/attendanceSummaryService";



const { width: W } = Dimensions.get("window");


// ── helpers ───────────────────────────────────────────────────────
const fmtDT = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString() + "  " +
         d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function HomeScreen({ route }) {
  const navigation = useNavigation(); 
  

  /* ── data state ── */
  const [events,      setEvents]      = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [program,     setProgram]     = useState([]);
  const [preachers,   setPreachers]   = useState([]);
  const [activeEntity, setActiveEntity] = useState(null);
  const [churchName, setChurchName] = useState("");
  const [entities, setEntities] = useState([]);
  const [scanned, setScanned] = useState(false);
  const [carouselItems, setCarouselItems] = useState([]);
  const [userRoles, setUserRoles] = useState(["admin"]);



/* ── notifications ── */
const [notifCount, setNotifCount] = useState(0);
const [notifModal, setNotifModal] = useState(false);
const [notifications, setNotifications] = useState([]);
const carouselRef = useRef(null);
const [carouselIndex, setCarouselIndex] = useState(0);

  
  
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
  const [churchModalVisible, setChurchModalVisible] = useState(false);

  /* ── preacher ── */
  {/* ✅ PATCH 1: moved up from further down the file. The debug useEffect right
     below this used to reference preacherModal BEFORE this declaration existed
     in source order, which throws "Cannot access 'preacherModal' before
     initialization" on first render. Declaring the state first fixes that. */}
  const [preacherModal,   setPreacherModal]   = useState(false);
  const [editingPreacher, setEditingPreacher] = useState(null);

  /* ── programme ── */
  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [editingProgram,      setEditingProgram]      = useState(null);
  const [overview, setOverview] = useState(null);

  const hasRole = (role) => userRoles.includes(role);
  const [permission, requestPermission] =
  useCameraPermissions();

useEffect(() => {
  const entityFromQR = route?.params?.entity;

  if (!entityFromQR) return;

  console.log("CHURCH QR OPENED:", entityFromQR);

}, [route?.params]);


useEffect(() => {
  if (carouselItems.length <= 1) return;

  const interval = setInterval(() => {
    setCarouselIndex(prev => {
      const next =
        prev >= carouselItems.length - 1
          ? 0
          : prev + 1;

      carouselRef.current?.scrollTo({
        x: next * 270,
        animated: true,
      });

      return next;
    });
  }, 4000);

  return () => clearInterval(interval);
}, [carouselItems]);



  /* useEffect */
  useEffect(() => {
    console.log("🎯 preacherModal:", preacherModal);
  }, [preacherModal]);

  useEffect(() => {
  if (!permission?.granted) {
    requestPermission();
  }
}, [permission]);

  useEffect(() => {
    const loadEntities = async () => {
      try {
        const storedEntities = await AsyncStorage.getItem("userEntities");
        const storedActive = await AsyncStorage.getItem("activeEntity");

        if (storedEntities) {
          setEntities(JSON.parse(storedEntities));
        }

        if (storedActive) {
          const parsed = JSON.parse(storedActive);
          console.log("✅ Loaded activeEntity:", parsed);
          setActiveEntity(parsed);
        } else {
          console.log("❌ No activeEntity found");
        }

      } catch (e) {
        console.log("❌ Load entity error:", e);
      }
    };

    loadEntities();
  }, []);

useEffect(() => {
  const unsubscribe = navigation.addListener(
    "focus",
    async () => {
      try {
        const storedActive =
          await AsyncStorage.getItem(
            "activeEntity"
          );

        if (storedActive) {
          const parsed =
            JSON.parse(storedActive);

          console.log(
            "✅ REFRESHED ACTIVE ENTITY:",
            parsed
          );

          setActiveEntity(parsed);
        }

      } catch (e) {
        console.log(
          "❌ Refresh entity error:",
          e
        );
      }
    }
  );

  return unsubscribe;
}, [navigation]);


useEffect(() => {
  const loadRoles = async () => {
    try {
      const stored = await AsyncStorage.getItem("userRoles");

      if (stored) {
        const parsed = JSON.parse(stored);

        // ✅ Safety: ensure it's an array and not empty
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserRoles(parsed);
        } else {
          setUserRoles(["admin"]); // ✅ fallback
        }

      } else {
        setUserRoles(["admin"]); // ✅ fallback if nothing stored
      }

    } catch (e) {
      console.log("❌ Load roles error:", e);
      setUserRoles(["admin"]); // ✅ fallback on error
    }
  };

  loadRoles();
}, []);


 useEffect(() => {
  const loadOverview = async () => {
    if (!activeEntity) return;

    try {
      const data = await getAttendanceSummary(
        activeEntity.organizationId,
        activeEntity.entityId,
        "4w"
      );

      setOverview(data);

      console.log("✅ Overview:", data);
    } catch (e) {
      console.log("❌ Overview error:", e);
    }
  };

  loadOverview();
}, [activeEntity]);


useEffect(() => {
  const uid = auth.currentUser?.uid;

  if (!uid) return;

  const q = query(
    collection(
      db,
      "users",
      uid,
      "notifications"
    ),
    orderBy("createdAt", "desc")
  );

 
  const unsubscribe = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    setNotifications(items);

    setNotifCount(
      items.filter(n => !n.read).length
    );
  });

  return unsubscribe;
}, []);


  useEffect(() => {
    if (!activeEntity) return;

    const { organizationId, entityId } = activeEntity;
    if (!organizationId || !entityId) return;

    // EVENTS
    const u1 = onSnapshot(
      collection(db, "organizations", organizationId, "entities", entityId, "events"),
      snap => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    // PASTOR MESSAGE
    const u2 = onSnapshot(
      doc(db, "organizations", organizationId, "entities", entityId, "settings", "pastorMessage"),
      snap => {
        if (snap.exists()) {
          setPastorData(snap.data());
        }
      }
    );

    // PROGRAM
    const u3 = onSnapshot(
      doc(db, "organizations", organizationId, "entities", entityId, "settings", "programList"),
      snap => {
        if (snap.exists()) setProgram(snap.data().items || []);
      }
    );

    // ✅ CAROUSEL LISTENER (THIS FIXES YOUR ISSUE)
    const u4 = onSnapshot(
      collection(db, "organizations", organizationId, "entities", entityId, "carousel"),
      snap => {
        const items = snap.docs
  .map(d => ({
    id: d.id,
    ...d.data()
  }))
  .filter(item => item.active !== false);

        console.log("✅ CAROUSEL ITEMS:", items);
        setCarouselItems(items);
      }
    );




    // ✅ PATCH 3 — PREACHERS LISTENER (same pattern as PROGRAM: one doc, items array)
    // Preachers used to live only in local state and reset on every reload.
    // This is what actually makes the Program ↔ Preacher link durable.
    const u5 = onSnapshot(
      doc(db, "organizations", organizationId, "entities", entityId, "settings", "preacherList"),
      snap => {
        if (snap.exists()) setPreachers(snap.data().items || []);
      }
    );

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5(); 
    };

  }, [activeEntity]);


  /* ── QR modal ── */
  const [qrModal, setQrModal] = useState(false);

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

const savePastorMessage = async (title, message, expiry) => {
  if (!title?.trim()) {
    Alert.alert("Required", "Heading is required");
    return;
  }

  try {
    const data = await AsyncStorage.getItem("activeEntity");

    if (!data) {
      Alert.alert("Error", "No active church selected");
      return;
    }

    const { organizationId, entityId } = JSON.parse(data);

    const updated = {
      title: title.trim(),
      message: message?.trim() || "Tap to add a message 🙏",
      expiry: expiry || null
    };

    await setDoc(
      doc(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "settings",
        "pastorMessage"
      ),
      updated,
      { merge: true }
    );

    // ✅ Update UI instantly
    setPastorData(updated);

    console.log("✅ Pastor message saved:", updated);

    setPastorModal(false);

  } catch (e) {
    Alert.alert("Save failed", e.message);
  }
};

const handleUpload = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;

    const imageUri = result.assets[0].uri;

    const blob = await (
      await fetch(imageUri)
    ).blob();

    const data = await AsyncStorage.getItem("activeEntity");

    if (!data) {
      Alert.alert("Error", "No active church selected");
      return;
    }

    const { organizationId, entityId } = JSON.parse(data);

    const storageRef = ref(
      storage,
      `carousel/${Date.now()}.jpg`
    );

    await uploadBytes(
      storageRef,
      blob
    );

    const downloadURL =
      await getDownloadURL(storageRef);

    await addDoc(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "carousel"
      ),
      {
        imageUrl: downloadURL,
        createdAt: new Date(),
      }
    );

    Alert.alert("✅ Uploaded to carousel");

  } catch (err) {
    console.log(
      "❌ Flyer upload error:",
      err
    );

    Alert.alert(
      "Upload failed",
      err?.message || JSON.stringify(err)
    );
  }
};

const uploadChurchLogo = async () => {
  try {
    console.log("🚀 START LOGO UPLOAD");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    console.log("✅ IMAGE PICKED");

    const blob = await (
      await fetch(result.assets[0].uri)
    ).blob();

    console.log("✅ BLOB CREATED", blob.size);

    const { organizationId, entityId } = activeEntity;

    const storageRef = ref(
      storage,
      `church-logos/${entityId}.jpg`
    );

    console.log("✅ STORAGE REF CREATED");

    await uploadBytes(
      storageRef,
      blob
    );

    console.log("✅ UPLOAD COMPLETE");

    const downloadURL =
      await getDownloadURL(storageRef);

    console.log("✅ GOT DOWNLOAD URL");

    await updateDoc(
      doc(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId
      ),
      {
        logo: downloadURL,
      }
    );

    console.log("✅ FIRESTORE UPDATED");

    const updated = {
      ...activeEntity,
      logo: downloadURL,
    };

    setActiveEntity(updated);

    await AsyncStorage.setItem(
      "activeEntity",
      JSON.stringify(updated)
    );
    const entitiesRaw =
  await AsyncStorage.getItem("userEntities");

if (entitiesRaw) {
  const entities = JSON.parse(entitiesRaw);

  const updatedEntities = entities.map(e =>
    e.entityId === entityId
      ? {
          ...e,
          logo: downloadURL,
        }
      : e
  );

  await AsyncStorage.setItem(
    "userEntities",
    JSON.stringify(updatedEntities)
  );
}


    Alert.alert(
      "Success",
      "Church logo uploaded successfully"
    );

  } catch (e) {
    console.log("❌ LOGO STEP FAILED:", e);

    Alert.alert(
      "Upload failed",
      e?.message || JSON.stringify(e)
    );
  }
};


const deactivateCarouselItem = async (
  carouselId
) => {
  try {
    const { organizationId, entityId } =
      activeEntity;

    await updateDoc(
      doc(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "carousel",
        carouselId
      ),
      {
        active: false,
      }
    );

  } catch (e) {
    Alert.alert(
      "Deactivate failed",
      e.message
    );
  }
};

const activateCarouselItem = async (
  carouselId
) => {
  try {
    const { organizationId, entityId } =
      activeEntity;

    await updateDoc(
      doc(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "carousel",
        carouselId
      ),
      {
        active: true,
      }
    );

  } catch (e) {
    Alert.alert(
      "Activate failed",
      e.message
    );
  }
};


const saveProgramToFirestore = async (updatedProgram) => {
  try {
    if (!activeEntity) return;

    const { organizationId, entityId } = activeEntity;

    const resolvedProgram =
      typeof updatedProgram === "function"
        ? updatedProgram(program)
        : updatedProgram;

    const cleanProgram = resolvedProgram.map(item => ({
      id: item.id || Date.now().toString(),
      title: item.title || "",
      time: item.time || "",
      date: item.date || null,
      notes: item.notes || "",
      preacherId: item.preacherId || null,
      session: item.session || null,
    }));

    await setDoc(
      doc(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "settings",
        "programList"
      ),
      { items: cleanProgram },
      { merge: true }
    );

    setProgram(cleanProgram);

    console.log(
      "✅ Program saved clean:",
      cleanProgram
    );

  } catch (e) {
    Alert.alert(
      "Save failed",
      e.message
    );
  }
};


// ✅ PATCH 4 (NEW) — preachers now actually persist to Firestore instead of
// living only in memory and disappearing on reload.
const savePreachersToFirestore = async (updatedPreachers) => {
  try {
    if (!activeEntity) return;

    const { organizationId, entityId } = activeEntity;

    const resolved =
      typeof updatedPreachers === "function"
        ? updatedPreachers(preachers)
        : updatedPreachers;

    const cleanPreachers = resolved.map(p => ({
      id: p.id,
      name: p.name || "",
      topic: p.topic || "",
      bio: p.bio || "",
      photo: p.photo || null,
      date: p.date || null,
      expiry: p.expiry || null,
      session: p.session || null, // ✅ {id, name} — same shape Program items link against
    }));

    await setDoc(
      doc(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "settings",
        "preacherList"
      ),
      { items: cleanPreachers },
      { merge: true }
    );

    setPreachers(cleanPreachers);

    console.log("✅ Preachers saved clean:", cleanPreachers);

  } catch (e) {
    Alert.alert("Save failed", e.message);
  }
};

const handleSelectChurch = async (entity) => {
  try {
    setActiveEntity(entity);

    await AsyncStorage.setItem(
      "activeEntity",
      JSON.stringify(entity)
    );

    console.log(
      "✅ Active church changed:",
      entity.name
    );
  } catch (e) {
    console.log(
      "❌ Church switch error:",
      e
    );
  }
};


/* ══════════════════════════════════ RENDER ══════════════════════ */
return (
  <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

    {/* ✅ CLEAN HEADER (NO CUSTOM UI INSIDE) */}
    <AppHeader
      title="ChurchCare"
      subtitle="Welcome back 👋"
      entity={activeEntity}
      actions={[
        {
          icon: "notifications-outline",
          onPress: () => {
            setNotifModal(true);
            setNotifCount(0);
          },
        },
        {
          icon: "cloud-upload-outline",
          onPress: () => setShowUpload(true),
        },
      ]}
    />


    {/* ✅ ✅ ✅ CHURCH SELECTOR (MOVED OUTSIDE HEADER) */}
    <View style={styles.entityBar}>
  <TouchableOpacity
    onPress={() => setChurchModalVisible(true)}
    style={styles.entityBtn}
  >{activeEntity?.logo?.trim() ? (
  <Image
    source={{ uri: activeEntity.logo }}
    style={{
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 10,
    }}
    resizeMode="cover"
  />
) : (
  <View
    style={{
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#4B3F72",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    }}
  >
    <Ionicons
      name="business-outline"
      size={20}
      color="#fff"
    />
  </View>
)}


    <View style={styles.entityTextRow}>

  <Text style={styles.entityText}>
    {activeEntity?.name || "Select Church"}
  </Text>

  {activeEntity && (
  <View style={styles.statusBadge}>
  <View style={styles.statusDot} />
  <Text style={styles.statusText}>
    Active
  </Text>
</View>
  )}
</View>

    {/* <Ionicons name="chevron-down" size={14} color="#4B3F72" /> */}
  </TouchableOpacity>
</View>

{/* ✅ MAIN SCROLL AREA */}
<ScrollView
  contentContainerStyle={styles.body}
  nestedScrollEnabled={true}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
  showsVerticalScrollIndicator={false}
>

  {/* ✅ PASTOR CARD */}
  <TouchableOpacity
    onPress={openPastorModal}
    activeOpacity={0.7}
    style={[styles.pastorCard, styles.pastorCardActive]}
  >
    <View style={styles.pastorCardLeft}>
      <Ionicons name="book-outline" size={20} color="#4B3F72" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.pastorCardTitle} numberOfLines={1}>
        {pastorData?.title || "Message from Pastor"}
      </Text>

      <Text style={styles.pastorCardMsg} numberOfLines={2}>
        {pastorData?.message || "Tap to add a message 🙏"}
      </Text>

      {!pastorData?.message && (
        <Text style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
          Tap to add message
        </Text>
      )}

      {pastorData?.expiry && (
        <Text style={styles.pastorExpiry}>
          ⏱ Expires {fmtDT(pastorData.expiry)}
        </Text>
      )}
    </View>

    <Ionicons name="pencil-outline" size={16} color="#4B3F72" />
  </TouchableOpacity>

  {/* ✅ CAROUSEL */}
{carouselItems.length > 0 && (
  <View style={styles.featuredSection}>
    
    <View style={styles.featuredHeader}>
      <Text style={styles.featuredHeading}>Featured Events</Text>
    </View>

<ScrollView
  ref={carouselRef}
  horizontal
  pagingEnabled
  nestedScrollEnabled={true}
  directionalLockEnabled={true}
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{
    paddingLeft: 14,
    paddingRight: 6,
  }}
>
  {carouselItems.map(item => (
    <View
      key={item.id}
      style={{
        width: 260,
        height: 140,
        borderRadius: 16,
        overflow: "hidden",
        marginRight: 10,
        backgroundColor: "#eee",
      }}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={{
          width: "100%",
          height: "100%",
        }}
        resizeMode="cover"
      />
    </View>
  ))}
</ScrollView>

  </View>
)}


 <Section title="Overview">
  <View style={styles.statsRow}>
    <StatCard
      label="Members"
      value={String(overview?.membersCount ?? 0)}
    />

    <StatCard
  label="Attendance"
  value={`${overview?.avgRate ?? 0}%`}
  subtitle={`${overview?.avgPresent ?? 0} avg present`}
/>

  </View>

  <View style={styles.statsRow}>
    <StatCard
      label="Invited"
      value={String(overview?.invitedCount ?? 0)}
    />

    <StatCard
      label="Active Users"
      value={String(overview?.activeUserCount ?? 0)}
    />
  </View>
</Section>

{/* ✅ QUICK ACTIONS */}
{/* ✅ QUICK ACTIONS */}
<Section title="Quick Actions">
  <View style={styles.qaSection}>

  {/* ✅ REQUIRED ROW WRAPPER */}
  <View style={styles.qaRow}>

    {[
      (hasRole("admin") || hasRole("usher")) && {
        icon: "checkmark-circle-outline",
        label: "Attendance",
        onPress: () => navigation.navigate("Attendance")
      },

      hasRole("admin") && {
        icon: "people-outline",
        label: "Members",
        onPress: () => navigation.navigate("Members")
      },

      hasRole("admin") && {
        icon: "bar-chart-outline",
        label: "Reports",
        onPress: () => navigation.navigate("AdminDashboard")
      },

      (hasRole("admin") || hasRole("media")) && {
        icon: "cloud-upload-outline",
        label: "Upload",
        onPress: () => setShowUpload(true)
      },

      {
        icon: "heart-outline",
        label: "Donate",
        onPress: () => navigation.navigate("Donate")
      },

      {
        icon: "help-circle-outline",
        label: "Help",
        onPress: () => navigation.navigate("Help")
      },

      {
        icon: "qr-code-outline",
        label: "QR Code",
        onPress: () => setQrModal(true)
      }

    ]
    .filter(Boolean)
    .map((a, index) => (
      <TouchableOpacity
        key={`${a.label}-${index}`}
        style={styles.qaItem}
        onPress={a.onPress}
      >
        <View style={styles.qaCircle}>
          <Ionicons name={a.icon} size={22} color="#fff" />
        </View>
<AppText
  style={styles.qaLabel}
  numberOfLines={2}
>
  {a.label}
</AppText>
      </TouchableOpacity>
    ))}

  </View>
</View>

</Section>
  {/* ✅ SERVICE FLOW */}
  <Section title="Order of Service">
    <EventsTabs
      events={upcomingEvents}
      program={program}
      preachers={preachers}
      setProgram={saveProgramToFirestore}
      onAddPreacher={(session) => {
        
        setEditingPreacher(session ? { session } : null);
        setPreacherModal(true);
      }}
      onEditPreacher={(p) => {
        setEditingPreacher(p);
        setPreacherModal(true);
      }}
    />
  </Section>

</ScrollView>

    

<FlyerUploadModal
  visible={showUpload}
  onClose={() => setShowUpload(false)}
  onUpload={handleUpload}   // ✅ CRITICAL FIX
/>
    
   <Modal
  visible={churchModalVisible}
  transparent
  animationType="fade"
>
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center"
    }}
  >
    <View
      style={{
        width: "85%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 16,
          marginBottom: 12,
          textAlign: "center"
        }}
      >
        Select Church
      </Text>

      {entities.map((item) => (
        <TouchableOpacity
          key={item.entityId}
          onPress={async () => {
            await handleSelectChurch(item);
            setChurchModalVisible(false);
          }}
          style={{
            padding: 12,
            borderRadius: 10,
            marginBottom: 8,
            backgroundColor:
              activeEntity?.entityId === item.entityId
                ? "#4B3F72"
                : "#f0f0f0"
          }}
        >
          <Text
            style={{
              color:
                activeEntity?.entityId === item.entityId
                  ? "#fff"
                  : "#333",
              fontWeight: "600"
            }}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={() => setChurchModalVisible(false)}
        style={{ marginTop: 10, alignItems: "center" }}
      >
        <Text style={{ color: "#E11D48", fontWeight: "600" }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
<Modal visible={qrModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalSheet}>

      <Text style={styles.modalTitle}>Scan QR Code</Text>

      <View
  style={{
    height: 250,
    overflow: "hidden",
    borderRadius: 12,
  }}
>
  {!permission ? (
    <Text>Loading camera...</Text>
  ) : !permission.granted ? (
    <TouchableOpacity
      style={styles.saveBtn}
      onPress={requestPermission}
    >
      <Text style={styles.saveBtnText}>
        Grant Camera Permission
      </Text>
    </TouchableOpacity>
  ) : (
    <CameraView
      barcodeScannerSettings={{
        barcodeTypes: ["qr"],
      }}
      onBarcodeScanned={
        scanned
          ? undefined
          : ({ data }) => {
              setScanned(true);

              console.log(
                "📸 SCANNED:",
                data
              );

              handleQRCode(
                navigation,
                data
              );

              setQrModal(false);
            }
      }
      style={{ flex: 1 }}
    />
  )}
</View>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => setScanned(false)}
      >
        <Text style={styles.saveBtnText}>Scan Again</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => setQrModal(false)}
      >
        <Text style={styles.cancelBtnText}>Close</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>

<EditableContentModal
  visible={pastorModal}
  onClose={() => setPastorModal(false)}

  titleValue={pastorData?.title}
  messageValue={pastorData?.message}

  onSave={({ title, message, expiry }) => {
    savePastorMessage(title, message, expiry);
  }}

  onDelete={() => {
    savePastorMessage("", "", null);
  }}
/>

<Modal
  visible={notifModal}
  transparent
  animationType="fade"
>
  <View style={styles.overlay}>
    <View style={styles.notifSheet}>

      <View style={styles.notifHeader}>
        <Text style={styles.notifTitle}>
          Notifications
        </Text>

        <TouchableOpacity
          onPress={() => setNotifModal(false)}
        >
          <Ionicons
            name="close"
            size={22}
            color="#222"
          />
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <Text
          style={{
            textAlign: "center",
            color: "#888",
            paddingVertical: 20,
          }}
        >
          No notifications
        </Text>
      ) : (
        <ScrollView>
          {notifications.map(item => (
            <View
              key={item.id}
              style={styles.notifRow}
            >
              <View
                style={[
                  styles.notifIcon,
                  {
                    backgroundColor:
                      "#EEF0FA",
                  },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color="#4B3F72"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.notifText}>
                  {item.title}
                </Text>

                <Text style={styles.notifTime}>
                  {item.message}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

    </View>
  </View>
</Modal>



<PreacherModal
  visible={preacherModal}
  onClose={() => {
    setPreacherModal(false);
    setEditingPreacher(null);
  }}
  initialData={editingPreacher}
  onSave={(data) => {
    // ✅ PATCH 5: now writes through to Firestore via savePreachersToFirestore
    // instead of only updating local state — this is what makes the
    // Program ↔ Preacher link (and the preacher list itself) survive a reload.
    console.log("✅ Saved preacher:", data);

    if (data.delete) {
      savePreachersToFirestore(preachers.filter(p => p.id !== data.id));
    } else {
      const exists = preachers.some(p => p.id === data.id);
      const updated = exists
        ? preachers.map(p => (p.id === data.id ? data : p))
        : [...preachers, data];
      savePreachersToFirestore(updated);
    }

    setPreacherModal(false);
  }}
/>

 </SafeAreaView>
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

/*Entity styles*/
entityBar: {
  backgroundColor: "#fff",
  paddingHorizontal: 14,
  paddingVertical: 10,
},

entityBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#edeef2",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 15,
  width: "100%",
  borderWidth: 1,
  borderColor: "#E0E3F5",
},

entityText: {
  color: "#4B3F72",
  fontWeight: "700",
  fontSize: 14,
  marginHorizontal: 6,
},
entityTextRow: {
  flexDirection: "column",
  marginHorizontal: 6,
  flex: 1,
},



statusBadge: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 2,
  flexShrink: 0,
},


statusDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: "#27ae60", 
  marginRight: 4,
},


statusText: {
  fontSize: 12,
  color: "#27ae60",
  fontWeight: "600",
},



  /* Quick actions */
  qaSection: { paddingHorizontal: 14, marginTop: 18, marginBottom: 6 },
  qaHeaderRow: {  marginBottom: 14 },
  qaHeading: { fontSize: 15, fontWeight: "800", color: "#222" },
  qaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
 
 qaItem: {
  width: "30%",
  alignItems: "center",
  paddingHorizontal: 4,
},
  qaCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#3C3A4E", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6 },
  
qaLabel: {
  fontSize: 10,
  fontWeight: "700",
  color: "#444",
  marginTop: 6,
  textAlign: "center",
  lineHeight: 14,
  includeFontPadding: false,

  width: "100%",
  flexShrink: 1,
},


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
pastorCardActive: {
  borderWidth: 1,
  borderColor: "#E5E7EB",
},

});