import React, {
  useState,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";
import AppHeader from "../components/AppHeader";


export default function DepartmentsScreen() {
  const navigation = useNavigation();
  const [selectedDept, setSelectedDept] =
  useState(null);

const [organizationId,
  setOrganizationId] =
    useState(null);

const [departments,
  setDepartments] =
    useState([]);
    const [members, setMembers] =
  useState([]);

 useEffect(() => {

  AsyncStorage
    .getItem("activeEntity")
    .then((data) => {

      if (!data) return;

      const parsed =
        JSON.parse(data);

      setOrganizationId(
        parsed.organizationId
      );

    });

}, []);

useEffect(() => {

  if (!organizationId) return;

  const ministriesRef =
    collection(
      db,
      "organizations",
      organizationId,
      "ministries"
    );

  const unsub =
    onSnapshot(
      ministriesRef,
      (snap) => {

        const list =
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

        setDepartments(list);

      }
    );

  return () => unsub();

}, [organizationId]);

useEffect(() => {

  if (!organizationId) return;

  AsyncStorage
    .getItem("activeEntity")
    .then(async (data) => {

      if (!data) return;

      const parsed =
        JSON.parse(data);

      const membersSnap =
        await getDocs(
          collection(
            db,
            "organizations",
            organizationId,
            "entities",
            parsed.entityId,
            "members"
          )
        );

      setMembers(
        membersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

    });

}, [organizationId]);


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      <AppHeader
  title="Departments"
  subtitle="App preferences & controls"
  onBack={() => navigation.goBack()}
/>


      {/* ✅ BODY */}
      <ScrollView contentContainerStyle={styles.body}>

  {/* ✅ DEPARTMENT LIST */}
  {departments.map((dept, index) => (
    <TouchableOpacity
      key={index}
      style={styles.card}
      onPress={() => setSelectedDept(dept)}
    >
      <View style={[styles.iconBox, { backgroundColor: dept.color + "15" }]}>
        <Ionicons name={dept.icon} size={24} color={dept.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{dept.name}</Text>
        <Text style={styles.cardDesc}>Tap to view members</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  ))}
{selectedDept && (
  <View style={styles.membersBox}>

    <Text style={styles.membersTitle}>
      {selectedDept.name}
    </Text>

   {members
  .filter(
    (member) =>
      member.ministry ===
      selectedDept.name
  )
  .map((member) => (

    <View
      key={member.id}
      style={styles.memberRow}
    >
      <Ionicons
        name="person-outline"
        size={16}
        color="#4B3F72"
      />

      <Text
        style={styles.memberText}
      >
        {member.name}
      </Text>
    </View>

))}

  </View>
)}

</ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  body: {
    flexGrow: 1,
    backgroundColor: "#f4f6fb",
    padding: 14,
    paddingBottom: 80,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    elevation: 2,
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  cardDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },

  membersBox: {
  marginTop: 16,
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 14,
  elevation: 2,
},

membersTitle: {
  fontSize: 14,
  fontWeight: "800",
  marginBottom: 10,
},

memberRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
},

memberText: {
  fontSize: 13,
  color: "#333",
},
});