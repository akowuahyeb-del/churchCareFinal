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

import AppHeader from "../components/AppHeader";
import LogoutButton from "../components/LogoutButton";
const MORE_ITEMS = [
  { key: "Departments", icon: "people-circle-outline", color: "#4F46E5", bg: "#EEF2FF", desc: "Manage church departments & groups" },
  { key: "Events", icon: "calendar-outline", color: "#059669", bg: "#ECFDF5", desc: "Church calendar & programmes" },
  { key: "Finance", icon: "cash-outline", color: "#D97706", bg: "#FFFBEB", desc: "Financial reports & accounting" },

  { key: "History", icon: "book-outline", color: "#00CEC9", bg: "#E8FFFE", desc: "Church history & records" },

  { key: "Settings", icon: "settings-outline", color: "#4B3F72", bg: "#F5F3FF", desc: "App preferences & controls" },
  { key: "Help", icon: "help-circle-outline", color: "#0984E3", bg: "#EBF4FD", desc: "AI assistant & support" },
];

export default function MoreScreen() {
  const navigation = useNavigation();
  const [role, setRole] = useState("");

  useEffect(() => {
    const loadRole = async () => {
      const storedRole = await AsyncStorage.getItem("role");
      setRole(storedRole || "User");
    };

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
          {MORE_ITEMS.map((item) => {
            const routes = {
              Settings: "Settings",
              Finance: "Finance",
              Help: "Help",
              Departments: "Departments",
              Events: "Events",
              History: "HistoryScreen"
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
                  <Text style={styles.cardTitle}>{item.key}</Text>
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