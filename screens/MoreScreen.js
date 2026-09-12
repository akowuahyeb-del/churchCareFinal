import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

import AppHeader from "../components/AppHeader";
import LogoutButton from "../components/LogoutButton";
import {
  hasPermission,
  DEFAULT_ROLES,
  mergePermissions,
} from "../constants/permissions";
const MORE_ITEMS = [
  {
    key: "Departments",
    icon: "people-circle-outline",
    color: "#4F46E5",
    bg: "#EEF2FF",
    desc: "Manage church departments & groups",
  },

  {
    key: "Events",
    icon: "calendar-outline",
    color: "#059669",
    bg: "#ECFDF5",
    desc: "Church calendar & programmes",
  },

  {
    key: "Finance",
    icon: "cash-outline",
    color: "#D97706",
    bg: "#FFFBEB",
    desc: "Financial reports & accounting",
  },

  {
  key: "PastoralCare",
  label: "Pastoral Care",
  icon: "heart-circle-outline",
  color: "#E11D48",
  bg: "#FFF1F2",
  desc: "Care, counselling & support requests",
},

{
  key: "ApprovalCenter",
  label: "Approval Centre",
  icon: "shield-checkmark-outline",
  color: "#7C3AED",
  bg: "#F3E8FF",
  desc: "Governance and disciplinary approvals",
},

{
  key: "PastoralDashboard",
  label: "Pastoral Dashboard",
  icon: "clipboard-outline",
  color: "#4B3F72",
  bg: "#EEF0FA",
  desc: "Manage pastoral requests",
},

{
  key: "PastoralTeam",
  label: "Pastoral Team",
  icon: "people-outline",
  color: "#00B894",
  bg: "#ECFDF5",
  desc: "Configure pastoral routing team",
},

  {
    key: "History",
    icon: "book-outline",
    color: "#00CEC9",
    bg: "#E8FFFE",
    desc: "Church history & records",
  },

  {
    key: "Settings",
    icon: "settings-outline",
    color: "#4B3F72",
    bg: "#F5F3FF",
    desc: "App preferences & controls",
  },

  {
    key: "Help",
    icon: "help-circle-outline",
    color: "#0984E3",
    bg: "#EBF4FD",
    desc: "AI assistant & support",
  },
];

export default function MoreScreen() {
  const navigation = useNavigation();
  const [role, setRole] = useState("");
const [roles, setRoles] = useState([]);
const [permissions, setPermissions] = useState([]);

const canDo = (permission) =>
  hasPermission(
    {
      roles,
      permissions,
    },
    permission
  );


  useEffect(() => {
    const loadRole = async () => {

  try {

    const userRaw =
      await AsyncStorage.getItem(
        "currentUser"
      );

    if (!userRaw) {
      return;
    }

    const user =
      JSON.parse(userRaw);

    const baseRoles =
      Array.isArray(user.roles)
        ? user.roles
        : (
            user.role
              ? [user.role]
              : ["member"]
          );

    const appointmentsSnap =
      await getDocs(
        collection(
          db,
          "organizations",
          user.organizationId,
          "officeAppointments"
        )
      );

    const activeOfficeRoles =
      appointmentsSnap.docs
        .map(d => d.data())
        .filter(
          a =>
            a.memberId ===
              user.memberId &&
            a.status === "active"
        )
        .map(
          a => a.officeId
        );

    const effectiveRoles =
      Array.from(
        new Set([
          ...baseRoles,
          ...activeOfficeRoles,
        ])
      );

    const effectivePermissions =
      mergePermissions(
        DEFAULT_ROLES.filter(
          r =>
            effectiveRoles.includes(
              r.id
            )
        )
      );

    setRoles(
      effectiveRoles
    );

    setPermissions(
      effectivePermissions
    );

    if (
      effectiveRoles.includes(
        "admin"
      )
    ) {

      setRole("admin");

    } else if (
      effectiveRoles.includes(
        "pastor"
      )
    ) {

      setRole("pastor");

    } else if (
      effectiveRoles.includes(
        "elders"
      )
    ) {

      setRole("elders");

    } else {

      setRole(
        effectiveRoles[0] ||
        "member"
      );

    }

    console.log(
      "MORE EFFECTIVE ROLES:",
      effectiveRoles
    );

  } catch (e) {

    console.log(
      "LOAD ROLE ERROR:",
      e
    );

  }
};

console.log("MORE ROLES:", roles);
console.log("MORE PERMISSIONS:", permissions);

    loadRole();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ✅ HEADER */}
      <AppHeader
        title="More Features"
        subtitle="App preferences & controls"
        onBack={() => navigation.goBack()}
      />

      {/* ✅ BODY */}
      <ScrollView contentContainerStyle={styles.body}>

        {/* ✅ MENU ITEMS */}
        <View>
       {MORE_ITEMS
.filter((item) => {

  switch (item.key) {

    case "Finance":
      return (
        canDo("manage_finance") ||
        canDo("view_finance_reports")
      );

    case "PastoralDashboard":
  return (
    roles.includes("admin") ||
    roles.includes("pastor") ||
    roles.includes("elders")
  );

case "PastoralTeam":
  return (
    roles.includes("admin") ||
    roles.includes("pastor") ||
    roles.includes("elders")
  );

case "ApprovalCenter":
  return (
    roles.includes("admin") ||
    roles.includes("governance_officer") ||
    canDo("manage_approvals")
  );


    default:
      return true;
  }

})

.map((item) => {
         const routes = {
  Settings: "Settings",
  Finance: "Finance",
  ApprovalCenter: "ApprovalCenter",
  Help: "Help",
  Departments: "Departments",
  Events: "Events",
  History: "HistoryScreen",

  PastoralCare: "PastoralRequest",

  PastoralDashboard:
    "PastoralCareDashboard",

  PastoralTeam:
    "PastoralTeamManagement",
};


            return (
              <TouchableOpacity
                key={item.key}
                style={styles.card}
                onPress={() => {
                  if (routes[item.key]) {
                    navigation.navigate(routes[item.key]);
                  } else {
                    alert(`${item.key} screen not built yet`);
                  }
                }}
              >
                <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={26} color={item.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
  {item.label || item.key}
</Text>

                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ✅ FOOTER SECTION */}
        <View style={styles.footer}>
          <Text style={styles.userText}>
            Logged in as {role === "admin" ? "Admin" : "Member"}
          </Text>

          <LogoutButton />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#4B3F72",
  },

  body: {
    padding: 14,
    backgroundColor: "#f4f6fb",
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

  footer: {
    marginTop: 30,
    alignItems: "center",
  },

  userText: {
    color: "#777",
    marginBottom: 10,
    fontSize: 13,
  },
});