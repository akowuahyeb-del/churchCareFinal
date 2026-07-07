import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import AppHeader from "../components/AppHeader";
import AppText from "../components/AppText";


export default function AttendanceHistoryScreen() {
  const navigation = useNavigation();


const [activeEntity, setActiveEntity] = useState(null);
const [sessions, setSessions] = useState([]);
const [loading, setLoading] = useState(true);

const organizationId = activeEntity?.organizationId;
const entityId = activeEntity?.entityId;




useEffect(() => {
  AsyncStorage.getItem("activeEntity").then((data) => {
    if (data) {
      try {
        setActiveEntity(JSON.parse(data));
      } catch {}
    }
  });
}, []);

useEffect(() => {
  if (!organizationId || !entityId) return;

  loadSessions();
}, [organizationId, entityId]);


const loadSessions = async () => {
  try {
    setLoading(true);

    const snap = await getDocs(
      query(
        collection(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "sessions"
        ),
        where("status", "==", "ended")
      )
    );

    const data = snap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      );

    setSessions(data);

  } catch (error) {
    console.log(
      "AttendanceHistory load error:",
      error
    );
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  AsyncStorage.getItem("activeEntity").then((data) => {
    if (data) {
      try {
        setActiveEntity(JSON.parse(data));
      } catch (_) {}
    }
  });
}, []);


  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance History"
        subtitle="Session attendance records"
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading ? (
  <ActivityIndicator
    size="large"
    color="#4B3F72"
    style={{ marginTop: 40 }}
  />
) : (
  <FlatList
    data={sessions}
    keyExtractor={(item) => item.id}
    contentContainerStyle={{ padding: 16 }}
    renderItem={({ item }) => (
      <TouchableOpacity
  style={styles.sessionCard}
  onPress={() =>
    navigation.navigate(
      "AttendanceSessionDetails",
      {
        sessionId: item.id,
      }
    )
  }
>
       <AppText
  variant="h4"
  numberOfLines={2}
>
  {item.service || "Service"}
</AppText>

        <AppText
  variant="caption"
  style={{ marginTop: 4 }}
>
  {item.date}
</AppText>

        <View style={styles.sessionRow}>
          <AppText variant="body">
  Present: {item.finalPresent || 0}
</AppText>

         <AppText variant="bodyBold">
  {item.finalRate || 0}%
</AppText>
        </View>
      </TouchableOpacity>
    )}
    ListEmptyComponent={
      <View style={styles.content}>
        <AppText
  variant="body"
  muted
  center
>
  No completed attendance sessions found.
</AppText>
      </View>
    }
  />
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4B3F72",
  },

  sessionCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  marginBottom: 10,
  elevation: 1,
},





sessionRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 12,
},

});