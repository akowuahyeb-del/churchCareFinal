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
import { Ionicons } from "@expo/vector-icons";

export default function AttendanceHistoryScreen() {
  const navigation = useNavigation();


const [activeEntity, setActiveEntity] = useState(null);
const [sessions, setSessions] = useState([]);
const [loading, setLoading] = useState(true);
const [historyGroups, setHistoryGroups] =
  useState([]);
  const [selectedHistoryGroup, setSelectedHistoryGroup] =
  useState(null);

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

    // Regular attendance sessions
    const regularSnap = await getDocs(
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

    // Ministry / committee / group attendance sessions
    const groupSnap = await getDocs(
      query(
        collection(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "group_sessions"
        ),
        where("status", "==", "ended")
      )
    );

    const regularSessions =
      regularSnap.docs.map((doc) => ({
        id: doc.id,
        sessionKind: "regular",
        ...doc.data(),
      }));

    const groupSessions =
      groupSnap.docs.map((doc) => ({
        id: doc.id,
        sessionKind: "group",
        ...doc.data(),
      }));

    const merged =
      [...regularSessions, ...groupSessions]
        .sort((a, b) =>
          (b.date || "").localeCompare(
            a.date || ""
          )
        );

    setSessions(merged);

const generalSessions =
  merged.filter(
    (s) => !s.attendanceEntityName
  );

const ministrySessions =
  merged.filter(
    (s) => s.attendanceEntityName
  );

setHistoryGroups([
  {
    id: "general",
    title: "General Services",
    count: generalSessions.length,
    sessions: generalSessions,
  },
  {
    id: "ministries",
    title: "Ministry Attendance",
    count: ministrySessions.length,
    sessions: ministrySessions,
  },
]);

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
  title={
    selectedHistoryGroup
      ? selectedHistoryGroup.title
      : "Attendance History"
  }
  subtitle={
    selectedHistoryGroup
      ? "Attendance sessions"
      : "Session attendance records"
  }
  showBack
  onBack={() => {
    if (selectedHistoryGroup) {
      setSelectedHistoryGroup(null);
      return;
    }

    navigation.goBack();
  }}
/>

      {loading ? (
  <ActivityIndicator
    size="large"
    color="#4B3F72"
    style={{ marginTop: 40 }}
  />
) : (
  <FlatList
    data={
  selectedHistoryGroup
    ? selectedHistoryGroup.sessions
    : historyGroups
}
    keyExtractor={(item) => item.id}
    contentContainerStyle={{ padding: 16 }}
   renderItem={({ item }) =>

  selectedHistoryGroup ? (

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
      <Text style={styles.historyTitle}>
        {item.attendanceEntityName ||
         item.groupName ||
         item.service ||
         "Attendance"}
      </Text>

      <Text style={styles.historyDate}>
        {item.date}
      </Text>

      <View style={styles.sessionRow}>
        <Text>
          Present: {item.finalPresent || 0}
        </Text>

        <Text>
          {item.finalRate || 0}%
        </Text>
      </View>
    </TouchableOpacity>

  ) : (

    <TouchableOpacity
      style={styles.historyGroupCard}
      onPress={() =>
        setSelectedHistoryGroup(item)
      }
    >
      <View style={styles.historyGroupHeader}>

        <View>
          <Text style={styles.historyGroupTitle}>
            {item.title}
          </Text>

          <Text style={styles.historyGroupCount}>
            {item.count} Sessions
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#999"
        />

      </View>
    </TouchableOpacity>

  )
}

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
  borderRadius: 18,
  padding: 16,
  marginBottom: 12,

  elevation: 3,

  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: {
    width: 0,
    height: 3,
  },
},





historyGroupHeader: {
  flexDirection: "row",

  justifyContent: "space-between",

  alignItems: "center",
},

historyGroupTitle: {
  fontSize: 18,

  fontWeight: "800",

  color: "#222",
},

historyGroupCount: {
  marginTop: 6,

  fontSize: 13,

  color: "#888",
},
});