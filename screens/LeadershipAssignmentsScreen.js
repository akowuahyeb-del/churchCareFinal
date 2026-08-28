import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function LeadershipAssignmentsScreen({ navigation }) {

  const [appointments, setAppointments] = useState([]);
  const [snapshot, setSnapshot] = useState({
  ministries: 0,
  offices: 0,
  committees: 0,
  governance: 0,
});
 
 

 
 
  
 

  // FIX: reusable so we can re-run it after saving a new appointment,
  // instead of only loading once on mount.
  const loadData = useCallback(async () => {
    const stored = await AsyncStorage.getItem("activeEntity");
    if (!stored) return;

    const entity = JSON.parse(stored);


 const assignmentsSnap = await getDocs(
  collection(
    db,
    "organizations",
    entity.organizationId,
    "leadershipAssignments"
  )
);
const assignments =
  assignmentsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

setAppointments(assignments);

const ministriesSnap =
  await getDocs(
    collection(
      db,
      "organizations",
      entity.organizationId,
      "ministries"
    )
  );

const officesSnap =
  await getDocs(
    collection(
      db,
      "organizations",
      entity.organizationId,
      "offices"
    )
  );

const committeesSnap =
  await getDocs(
    collection(
      db,
      "organizations",
      entity.organizationId,
      "committees"
    )
  );

const governanceSnap =
  await getDocs(
    collection(
      db,
      "organizations",
      entity.organizationId,
      "governanceBodies"
    )
  );

setSnapshot({
  ministries:
    ministriesSnap.docs.filter(
      (d) => d.data().active !== false
    ).length,

  offices:
    officesSnap.docs.filter(
      (d) => d.data().active !== false
    ).length,

  committees:
    committeesSnap.docs.filter(
      (d) => d.data().active !== false
    ).length,

  governance:
    governanceSnap.docs.filter(
      (d) => d.data().active !== false
    ).length,
});


  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

 

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Leadership Assignment"
        subtitle="Assign Church Office"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate("MinistryLeadership")}
          >
            <Ionicons name="people-outline" size={30} color="#4F46E5" />
            <Text style={styles.quickTitle}>Ministries</Text>
          </TouchableOpacity>

          <TouchableOpacity
  style={styles.quickCard}
  onPress={() =>
    navigation.navigate(
      "GovernanceBodies"
    )
  }
>
  <Ionicons
    name="shield-outline"
    size={30}
    color="#16A085"
  />

  <Text style={styles.quickTitle}>
    Governance
  </Text>
</TouchableOpacity>

         <TouchableOpacity
  style={styles.quickCard}
  onPress={() =>
    navigation.navigate("Office")
  }
>
  <Ionicons
    name="briefcase-outline"
    size={30}
    color="#0984E3"
  />
  <Text style={styles.quickTitle}>
    Offices
  </Text>
</TouchableOpacity>

          <TouchableOpacity
  style={styles.quickCard}
  onPress={() =>
    navigation.navigate("Committee")
  }
>
  <Ionicons
    name="git-network-outline"
    size={30}
    color="#E67E22"
  />
  <Text style={styles.quickTitle}>
    Committees
  </Text>
</TouchableOpacity>
        </View>

<Text style={styles.activeHeader}>
  Leadership Structures
</Text>

<View style={styles.distributionCard}>
{[
  {
    label: "Governance",
    count: snapshot.governance,
    color: "#16A085",
  },

  {
    label: "Committees",
    count: snapshot.committees,
    color: "#E67E22",
  },

  {
    label: "Ministries",
    count: snapshot.ministries,
    color: "#4F46E5",
  },

  {
    label: "Offices",
    count: snapshot.offices,
    color: "#0984E3",
  },
].map((item) => (

    <View
      key={item.label}
      style={styles.distributionRow}
    >

      <Text style={styles.distributionLabel}>
        {item.label}
      </Text>

      <View style={styles.badgesContainer}>
        {Array.from({
          length: Math.min(item.count, 10),
        }).map((_, index) => (

          <View
            key={index}
            style={[
              styles.badgeDot,
              {
                backgroundColor:
                  item.color,
              },
            ]}
          />

        ))}
      </View>

      <Text style={styles.distributionCount}>
        {item.count}
      </Text>

    </View>

  ))}

</View>

<Text style={styles.activeHeader}>
  Recent Leadership Activity
</Text>

{appointments.length === 0 ? (

  <View style={styles.infoCard}>
    <Text style={styles.infoTitle}>
      No leadership appointments yet
    </Text>

    <Text style={styles.infoSub}>
      Leadership assignments will appear here.
    </Text>
  </View>

) : (

  appointments
    .sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    )
    .slice(0, 5)
    .map((item) => (

      <View
        key={item.id}
        style={styles.infoCard}
      >
        <Text style={styles.infoTitle}>
          {item.positionTitle}
        </Text>

        <Text style={styles.infoSub}>
          {item.memberName}
        </Text>

        <Text
          style={{
            marginTop: 4,
            color: "#666",
          }}
        >
          {item.entityName ||
            item.ministryName ||
            "Church Office"}
        </Text>
      </View>

    ))

)}
      </ScrollView>

      
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "700", marginTop: 12, marginBottom: 8 },
  option: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  selected: { backgroundColor: "#DDE3FF" },
  notes: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
  },
  quickTitle: { marginTop: 10, fontWeight: "700", fontSize: 14, color: "#222" },
  primaryAction: {
    backgroundColor: "#4B3F72",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    alignItems: "center",
  },
  primaryActionText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  activeHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
    marginTop: 24,
    marginBottom: 12,
  },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 2 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#222" },
  infoSub: { color: "#666", marginTop: 4 },
  distributionCard: {
  backgroundColor: "#FFF",
  borderRadius: 18,
  padding: 18,
  elevation: 2,
  marginBottom: 20,
},

distributionRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 14,
},

distributionLabel: {
  width: 100,
  fontSize: 14,
  fontWeight: "600",
  color: "#333",
},

badgesContainer: {
  flex: 1,
  flexDirection: "row",
  flexWrap: "wrap",
},

badgeDot: {
  width: 12,
  height: 12,
  borderRadius: 6,
  marginRight: 4,
},

distributionCount: {
  width: 30,
  textAlign: "right",
  fontWeight: "800",
  color: "#222",
},

});