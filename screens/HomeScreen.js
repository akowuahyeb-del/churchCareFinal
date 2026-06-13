import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
   Pressable,
  StyleSheet,
  RefreshControl
} from "react-native";
import { useNavigation } from "@react-navigation/native";

/* ✅ COMPONENTS */
import AppHeader from "../components/AppHeader";
import Section from "../components/Section";
import StatCard from "../components/StatCard";
import QuickActionCard from "../components/QuickActionCard";
import EventCard from "../components/EventCard";
import FeaturedEventCard from "../components/FeaturedEventCard";
import FlyerUploadModal from "../components/FlyerUploadModal";
import PastorMessageCard from "../components/PastorMessageCard";
import EditableContentModal from "../components/EditableContentModal";
import EventsTabs from "../components/EventsTabs";
import PreacherModal from "../components/PreacherModal";

/* ✅ FIRESTORE */
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";

export default function HomeScreen() {
  const navigation = useNavigation();

  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [program, setProgram] = useState([]);
const [preachers, setPreachers] = useState([]);
  
 const [selectedEvent, setSelectedEvent] = useState(null);
const [eventModalVisible, setEventModalVisible] = useState(false);

const [pastorData, setPastorData] = useState({
  title: "Message from Pastor",
  message: "Welcome! Stay blessed 🙏",
  expiry: null,
});


  /* ✅ LOAD EVENTS */
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(list);
    });

    return unsubscribe;
  }, []);

  /* ✅ FILTER EVENTS */
  const featuredEvents = events.filter(ev => ev.featured);
  const upcomingEvents = events.slice(0, 5);

  
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  body: {
    paddingBottom: 100,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
});

  /* ✅ REFRESH */
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.safe}>

      {/* ✅ HEADER */}
      <AppHeader
        title="Dashboard"
        subtitle="Welcome back 👋"
        actions={[
          {
            icon: "cloud-upload-outline",
            onPress: () => setShowUpload(true),
          }
        ]}
      />


{/* ✅ FEATURED EVENTS CAROUSEL HERE */}
{featuredEvents.length > 0 && (
  <Section title="Featured Events">
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 14 }}
    >
      {featuredEvents.map(ev => (
  <FeaturedEventCard
    key={ev.id}
    event={ev}
    onPress={() => {
      setSelectedEvent(ev);
      setEventModalVisible(true);
    }}
  />
))}
    </ScrollView>
  </Section>
)}


         <Pressable onPress={() => setEditModalVisible(true)}>
  <PastorMessageCard
    title={pastorData.title}
    message={pastorData.message}
    expiry={pastorData.expiry}
  />
</Pressable>
<EventsTabs
  events={upcomingEvents}
  program={program}
  preachers={preachers}
  onEditProgram={(item) => {
    // reuse your modal
  }}
  onEditPreacher={(p) => {
    // reuse modal
  }}
/>



      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* ✅ OVERVIEW (LINK TO ADMIN) */}
        <Section title="Overview">
          <View style={styles.row}>
            <StatCard label="Members" value="245" />
            <StatCard label="Attendance" value="180" />
          </View>

          <QuickActionCard
            title="Admin Dashboard"
            icon="grid-outline"
            onPress={() => navigation.navigate("AdminDashboard")}
          />
        </Section>

        {/* ✅ QUICK ACTIONS */}
        <Section title="Quick Access">
          <View style={styles.quickGrid}>
            <QuickActionCard
              title="Events"
              icon="calendar-outline"
              onPress={() => navigation.navigate("Events")}
            />

            <QuickActionCard
              title="Members"
              icon="people-outline"
              onPress={() => navigation.navigate("Members")}
            />

            <QuickActionCard
              title="Attendance"
              icon="checkmark-circle-outline"
              onPress={() => navigation.navigate("Attendance")}
            />
          </View>
        </Section>

       {/* ✅ ✅ EVENTS TABS (FINTECH STYLE) */}
<Section title="Service Flow">

  <EventsTabs
  events={upcomingEvents}
  program={program}
  preachers={preachers}
  onEditProgram={(item) => {
    console.log("Edit program", item);
  }}
  onEditPreacher={(p) => {
    setEditingPreacher(p);
    setPreacherModal(true);
  }}
/>
  <PreacherModal
  visible={preacherModal}
  onClose={() => setPreacherModal(false)}
  initialData={editingPreacher}
  onSave={(data) => {
    if (editingPreacher) {
      setPreachers(prev =>
        prev.map(p =>
          p.id === editingPreacher.id ? { ...p, ...data } : p
        )
      );
    } else {
      setPreachers(prev => [
        ...prev,
        { ...data, id: Date.now().toString() }
      ]);
    }
  }}
/>

</Section>

      </ScrollView>
{/* ✅ FEATURED EVENT EDIT MODAL */}
{selectedEvent && (
  <EditableContentModal
    visible={eventModalVisible}
    onClose={() => setEventModalVisible(false)}
    titleValue={selectedEvent.title}
    messageValue={selectedEvent.description || selectedEvent.desc}
    
    onSave={async (data) => {
  try {
    const ref = doc(db, "events", selectedEvent.id);

    await updateDoc(ref, {
      title: data.title,
      desc: data.message,
      expiry: data.expiry || null,
    });

    setEventModalVisible(false);

  } catch (err) {
    console.log("Update error:", err);
  }
}}
onDelete={async () => {
  try {
    await deleteDoc(doc(db, "events", selectedEvent.id));
    setEventModalVisible(false);
  } catch (err) {
    console.log("Delete error:", err);
  }
}}
 
  />
)}


      {/* ✅ FLYER UPLOAD MODAL */}
      <FlyerUploadModal
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={() => console.log("Upload flyer")}
      />


/
  
    </View>
  );
}