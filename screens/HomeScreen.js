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
import FeaturedEventCard from "../components/FeaturedEventCard";
import FlyerUploadModal from "../components/FlyerUploadModal";
import PastorMessageCard from "../components/PastorMessageCard";
import EditableContentModal from "../components/EditableContentModal";
import EventsTabs from "../components/EventsTabs";
import PreacherModal from "../components/PreacherModal";
import QuickActions from "../components/QuickActions";

/* ✅ FIRESTORE */
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";

export default function HomeScreen() {
  const navigation = useNavigation();

  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const [pastorData, setPastorData] = useState({
    title: "Message from Pastor",
    message: "Welcome! Stay blessed 🙏",
    expiry: null,
  });

  const [program, setProgram] = useState([]);
  const [preachers, setPreachers] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);

  const [preacherModal, setPreacherModal] = useState(false);
  const [editingPreacher, setEditingPreacher] = useState(null);

  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), snapshot => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(list);
    });

    return unsubscribe;
  }, []);

  const featuredEvents = events.filter(ev => ev.featured);
  const upcomingEvents = events.slice(0, 5);

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
          { icon: "cloud-upload-outline", onPress: () => setShowUpload(true) }
        ]}
      />

      {/* ✅ FEATURED EVENTS */}
      {featuredEvents.length > 0 && (
        <Section title="Featured Events">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      {/* ✅ PASTOR MESSAGE */}
      <Pressable onPress={() => setEditModalVisible(true)}>
        <PastorMessageCard {...pastorData} />
      </Pressable>

      {/* ✅ MAIN CONTENT */}
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* ✅ OVERVIEW */}
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
        <QuickActions
  navigation={navigation}
  churchName="Main Branch"  // you can make this dynamic later
  onSwitchChurch={() => console.log("switch church")}
/>

        {/* ✅ ✅ ONLY ONE EVENTS TABS (NO DUPLICATES) */}
        <Section title="Service Flow">
          <EventsTabs
            events={upcomingEvents}
            program={program}
            preachers={preachers}

            onEditProgram={(item) => {
              setEditingProgram(item);
              setProgramModalVisible(true);
            }}

            onEditPreacher={(p) => {
              setEditingPreacher(p);
              setPreacherModal(true);
            }}
          />
        </Section>

      </ScrollView>

      {/* ✅ FEATURED EVENT MODAL */}
      {selectedEvent && (
        <EditableContentModal
          visible={eventModalVisible}
          onClose={() => setEventModalVisible(false)}
          titleValue={selectedEvent.title}
          messageValue={selectedEvent.description}

          onSave={async (data) => {
            await updateDoc(doc(db, "events", selectedEvent.id), {
              title: data.title,
              description: data.message
            });
          }}

          onDelete={async () => {
            await deleteDoc(doc(db, "events", selectedEvent.id));
          }}
        />
      )}

      {/* ✅ PROGRAM MODAL */}
      <EditableContentModal
        visible={programModalVisible}
        onClose={() => setProgramModalVisible(false)}
        titleValue={editingProgram?.item || ""}
        onSave={(data) => {

          if (data.delete && editingProgram) {
            setProgram(prev => prev.filter(p => p.id !== editingProgram.id));
            return;
          }

          if (editingProgram) {
            setProgram(prev =>
              prev.map(p =>
                p.id === editingProgram.id
                  ? { ...p, item: data.title }
                  : p
              )
            );
          } else {
            setProgram(prev => [
              ...prev,
              { id: Date.now().toString(), item: data.title }
            ]);
          }
        }}
      />

      {/* ✅ PREACHER MODAL */}
      <PreacherModal
        visible={preacherModal}
        onClose={() => setPreacherModal(false)}
        initialData={editingPreacher}

        onSave={(data) => {

          if (data.delete && editingPreacher) {
            setPreachers(prev =>
              prev.filter(p => p.id !== editingPreacher.id)
            );
            return;
          }

          if (editingPreacher) {
            setPreachers(prev =>
              prev.map(p =>
                p.id === editingPreacher.id
                  ? { ...p, ...data }
                  : p
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

      {/* ✅ PASTOR MODAL */}
      <EditableContentModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        titleValue={pastorData.title}
        messageValue={pastorData.message}
        onSave={(data) => setPastorData(data)}
      />

      {/* ✅ UPLOAD */}
      <FlyerUploadModal
        visible={showUpload}
        onClose={() => setShowUpload(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f6fb" },

  body: { paddingBottom: 100 },

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
  }
});
