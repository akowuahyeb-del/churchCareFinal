import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function LeadershipAssignmentsScreen({ navigation }) {
  const [organizationId, setOrganizationId] = useState(null);
  const [entityId, setEntityId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [members, setMembers] = useState([]);
const [startDate, setStartDate] = useState(new Date());
 
 
  
 

  // FIX: reusable so we can re-run it after saving a new appointment,
  // instead of only loading once on mount.
  const loadData = useCallback(async () => {
    const stored = await AsyncStorage.getItem("activeEntity");
    if (!stored) return;

    const entity = JSON.parse(stored);
    setOrganizationId(entity.organizationId);
    setEntityId(entity.entityId);

    const membersSnap = await getDocs(
      collection(
        db,
        "organizations",
        entity.organizationId,
        "entities",
        entity.entityId,
        "members"
      )
    );
    setMembers(membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));


    const ministriesSnap = await getDocs(
      collection(db, "organizations", entity.organizationId, "ministries")
    );
    setMinistries(ministriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const assignmentsSnap = await getDocs(
      collection(
        db,
        "organizations",
        entity.organizationId,
        "leadershipAssignments"
      )
    );
    setAppointments(
      assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

 

  const saveAssignment = async () => {
    if (!selectedMember || !selectedRole) {
      Alert.alert("Required", "Select member and role.");
      return;
    }

    // FIX: prevent saving an end date before the start date.
    if (endDate && endDate < startDate) {
      Alert.alert("Invalid dates", "End date cannot be before the start date.");
      return;
    }

    setSaving(true);

    try {
      // FIX: mirror MinistryLeadershipScreen's behavior — close out any
      // existing active assignment for the same role (and ministry, if
      // one was picked) before creating a new one. Without this, using
      // this screen to assign a ministry leader left two "active"
      // leaders for the same ministry, inconsistent with the other
      // entry point into this same collection.
      const existingSnap = await getDocs(
        collection(db, "organizations", organizationId, "leadershipAssignments")
      );

      const existingActive = existingSnap.docs.filter((d) => {
        const data = d.data();
        const sameRole = data.roleId === selectedRole.id;
        const sameMinistry = selectedMinistry
          ? data.ministryId === selectedMinistry.id
          : !data.ministryId;
        return sameRole && sameMinistry && data.status === "active";
      });

      for (const existing of existingActive) {
        await updateDoc(
          doc(
            db,
            "organizations",
            organizationId,
            "leadershipAssignments",
            existing.id
          ),
          {
            status: "completed",
            endDate: new Date().toISOString(),
          }
        );
      }

      await addDoc(
        collection(db, "organizations", organizationId, "leadershipAssignments"),
        {
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          roleId: selectedRole.id,
          roleLabel: selectedRole.label,
          ministryId: selectedMinistry?.id || null,
          ministryName: selectedMinistry?.name || null,
          positionTitle: selectedRole.label,
          status: "active",
          startDate: startDate.toISOString(),
          endDate: endDate ? endDate.toISOString() : null,
          notes,
          createdAt: new Date().toISOString(),
        }
      );

      Alert.alert("Success", "Leadership assignment saved.");

      // FIX: refresh local state before leaving so the list is correct
      // if navigation.goBack() returns to an already-mounted screen
      // whose useEffect won't rerun on its own.
      await loadData();
      resetForm();
      setShowAppointmentModal(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not Set";
    return date.toISOString().split("T")[0];
  };

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


        <Text style={styles.activeHeader}>Active Appointments</Text>

        {appointments.length === 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>No appointments created</Text>
            <Text style={styles.infoSub}>
              Create leaders, elders and office holders.
            </Text>
          </View>
        ) : (
          appointments.map((item) => (
            <View key={item.id} style={styles.infoCard}>
              <Text style={styles.infoTitle}>{item.positionTitle}</Text>
              <Text style={styles.infoSub}>{item.memberName}</Text>
              <Text style={{ marginTop: 4, color: "#666" }}>
                {item.ministryName || "Church Office"}
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
});