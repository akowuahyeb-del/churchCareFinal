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

/* ✅ FIRESTORE */
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function HomeScreen() {
  const navigation = useNavigation();

  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
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

        {/* ✅ FEATURED EVENTS */}
       {featuredEvents.length > 0 && (
  <Section title="Featured Events">
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingLeft: 14,
        paddingRight: 6
      }}
    >
      {featuredEvents.map(ev => (
        <FeaturedEventCard
          key={ev.id}
          event={ev}
          onPress={() => navigation.navigate("Events")}
        />
      ))}
    </ScrollView>
  </Section>
)}

        {/* ✅ UPCOMING EVENTS */}
        <Section title="Upcoming Events">
          {upcomingEvents.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              onPress={() => navigation.navigate("Events")}
            />
          ))}
        </Section>

      </ScrollView>
{/* ✅ FEATURED EVENT EDIT MODAL */}
{selectedEvent && (
  <EditableContentModal
    visible={eventModalVisible}
    onClose={() => setEventModalVisible(false)}
    titleValue={selectedEvent.title}
    messageValue={selectedEvent.description || selectedEvent.desc}
    onSave={(data) => {
      setEvents(prev =>
        prev.map(ev =>
          ev.id === selectedEvent.id
            ? { ...ev, title: data.title, desc: data.message }
            : ev
        )
      );
    }}
    onDelete={() => {
      setEvents(prev =>
        prev.filter(ev => ev.id !== selectedEvent.id)
      );
    }}
  />
)}


      {/* ✅ FLYER UPLOAD MODAL */}
      <FlyerUploadModal
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={() => console.log("Upload flyer")}
      />

{/* ✅ ✅ ✅ PASTE HERE */}
<EditableContentModal
  visible={editModalVisible}
  onClose={() => setEditModalVisible(false)}
  titleValue={pastorData.title}
  messageValue={pastorData.message}
  onSave={(data) => setPastorData(data)}
  onDelete={() =>
    setPastorData({
      title: "",
      message: "",
      expiry: null,
    })
  }
/>
  
    </View>
  );
}