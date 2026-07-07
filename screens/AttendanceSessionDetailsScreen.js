import React, {
  useState,
  useEffect,
} from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import AppText from "../components/AppText";

export default function AttendanceSessionDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { sessionId } = route.params || {};
  const [activeEntity, setActiveEntity] = useState(null);
const [records, setRecords] = useState([]);
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
  if (!organizationId || !entityId || !sessionId) return;

  loadAttendanceRecords();
}, [organizationId, entityId, sessionId]);

const loadAttendanceRecords = async () => {
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
          "attendance"
        ),
        where("sessionId", "==", sessionId)
      )
    );

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setRecords(data);

  } catch (error) {
    console.log(
      "❌ SessionDetails loadAttendanceRecords:",
      error
    );
  } finally {
    setLoading(false);
  }
};

const presentMembers = records.filter(
  (r) => r.status === "present"
);

const absentMembers = records.filter(
  (r) => r.status === "absent"
);

const attendanceRate =
  records.length > 0
    ? Math.round(
        (presentMembers.length / records.length) * 100
      )
    : 0;



  return (
    <View style={styles.container}>
      <AppHeader
        title="Session Details"
        subtitle={sessionId || ""}
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
    data={records}
    keyExtractor={(item) => item.id}
    contentContainerStyle={{ padding: 16 }}
    ListHeaderComponent={
      <View style={styles.summaryCard}>
        
       <AppText style={styles.title}>
  Session Summary
</AppText>

        <AppText style={styles.summaryStat}>
  Present: {presentMembers.length}
</AppText>

<AppText style={styles.summaryStat}>
  Absent: {absentMembers.length}
</AppText>

<AppText style={styles.summaryStat}>
  Attendance Rate: {attendanceRate}%
</AppText>
      </View>
    }
    renderItem={({ item }) => (
      <View style={styles.memberCard}>
        <View>
          <AppText style={styles.memberName}>
  {item.name || "Unknown Member"}
</AppText>

          <AppText style={styles.memberMeta}>
  {item.memberCode || ""}
</AppText>
        </View>

        <AppText
  style={{
    color:
      item.status === "present"
        ? "#27AE60"
        : "#E74C3C",
    fontWeight: "700",
    textTransform: "capitalize",
  }}
>
  {item.status}
</AppText>
      </View>
    )}
    ListEmptyComponent={
      <View style={styles.content}>
        <AppText style={styles.subtitle}>
  No attendance records found for this session.
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
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4B3F72",
  },

  subtitle: {
    marginTop: 8,
    color: "#888",
  },
  summaryCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  elevation: 1,
},

summaryTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#4B3F72",
  marginBottom: 10,
},

memberCard: {
  backgroundColor: "#fff",
  borderRadius: 10,
  padding: 14,
  marginBottom: 8,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

memberName: {
  fontSize: 14,
  fontWeight: "700",
  color: "#222",
},

memberMeta: {
  fontSize: 11,
  color: "#999",
  marginTop: 2,
},
summaryStat: {
  fontSize: 14,
  color: "#444",
  marginBottom: 6,
},
});