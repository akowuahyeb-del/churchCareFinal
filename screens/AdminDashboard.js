import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function AdminDashboard() {

  const navigation = useNavigation();

  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState("Activities");

  /* ✅ LOAD DATA */
  useEffect(() => {
    const mem = onSnapshot(collection(db, "members"),
      snap => setMembers(snap.docs.map(d => d.data()))
    );

    const att = onSnapshot(collection(db, "attendance"),
      snap => setAttendance(snap.docs.map(d => d.data()))
    );

    return () => {
      mem();
      att();
    };
  }, []);

  /* ✅ METRICS */
  const totalMembers = members.length;
  const present = attendance.filter(a => a.status === "present").length;
  const absent = attendance.filter(a => a.status === "absent").length;

  /* ✅ DATA */
  const stats = {

    Activities: [
      { title: "Events", value: 12, icon: "calendar", color: "#6C5CE7" },
      { title: "Services", value: 8, icon: "time", color: "#00B894" },
    ],

    Members: [
      { title: "Total Members", value: totalMembers, icon: "people", color: "#0984E3" },
      { title: "New Members", value: 12, icon: "person-add", color: "#00CEC9" },
    ],

    Attendance: [
      { title: "Present", value: present, icon: "checkmark-circle", color: "#00B894" },
      { title: "Absent", value: absent, icon: "close-circle", color: "#D63031" },
    ],

    Financial: [
      { title: "Tithes", value: "₵5000", icon: "cash", color: "#FDCB6E" },
      { title: "Offerings", value: "₵3200", icon: "wallet", color: "#E17055" },
    ],

    /* ✅ NEW TAB */
    Inventory: [
      { title: "In Stock", value: 120, icon: "cube", color: "#00B894" },
      { title: "Low Stock", value: 8, icon: "alert-circle", color: "#E17055" },
    ],

    /* ✅ NEW TAB */
    History: [
      { title: "Today's Logs", value: 25, icon: "time", color: "#6C5CE7" },
      { title: "Total Records", value: 540, icon: "document-text", color: "#0984E3" },
    ]
  };

  return (
    <View style={styles.container}>

      {/* ✅ HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "MainTabs" }]
              })
            )
          }
        >
          <Ionicons name="arrow-back" size={20} />
        </TouchableOpacity>

        <Text style={styles.header}>Admin Dashboard</Text>
      </View>

      {/* ✅ MODERN SLIM TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {Object.keys(stats).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabPill,
              activeTab === tab && styles.activePill
            ]}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ✅ GRID CARDS */}
      <ScrollView contentContainerStyle={styles.grid}>
        {stats[activeTab].map((item, index) => (

          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("DashboardDetails", {
              title: item.title
            })}
          >

            {/* ICON */}
            <View style={[styles.iconBox, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={16} color="#fff" />
            </View>

            {/* VALUE */}
            <Text style={styles.value}>{item.value}</Text>

            {/* LABEL */}
            <Text style={styles.label}>{item.title}</Text>

            {/* FOOTER */}
            <Text style={styles.cardHint}>View details →</Text>

          </TouchableOpacity>

        ))}
      </ScrollView>

    </View>
  );
}

/* ✅ ✅ ✅ FINAL STYLES */
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 15
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15
  },

  header: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8
  },

  /* ✅ SLIM TABS */
  tabsContainer: {
    flexDirection: "row",
    paddingBottom: 8
  },

  tabPill: {
    paddingVertical: 6,   // ✅ reduced height
    paddingHorizontal: 14,
    backgroundColor: "#eee",
    borderRadius: 18,
    marginRight: 8
  },

  activePill: {
    backgroundColor: "#4B3F72"
  },

  tabText: {
    fontSize: 11,
    color: "#555"
  },

  activeText: {
    color: "#fff",
    fontWeight: "600"
  },

  /* ✅ GRID */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },

  /* ✅ PREMIUM CARD */
  card: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3
  },

  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8
  },

  value: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333"
  },

  label: {
    fontSize: 12,
    color: "#777",
    marginTop: 4
  },

  cardHint: {
    marginTop: 8,
    fontSize: 10,
    color: "#1BA97F"
  }

});
``