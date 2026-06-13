import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const MORE_ITEMS = [
  { key: "Departments", icon: "people-circle-outline",  color: "#4F46E5", bg: "#EEF2FF", desc: "Manage church departments & groups" },
  { key: "Events",      icon: "calendar-outline",        color: "#059669", bg: "#ECFDF5", desc: "Church calendar & programmes"        },
  { key: "Finance",     icon: "cash-outline",            color: "#D97706", bg: "#FFFBEB", desc: "Financial reports & accounting"      },
  { key: "Settings",    icon: "settings-outline",        color: "#4B3F72", bg: "#F5F3FF", desc: "App preferences & controls"          },
  { key: "Help",        icon: "help-circle-outline",     color: "#0984E3", bg: "#EBF4FD", desc: "AI assistant & support"              },
];

export default function MoreScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
        <Text style={styles.headerSub}>Additional features & settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {MORE_ITEMS.map(item => (
          <TouchableOpacity key={item.key} style={styles.card}
            onPress={() => navigation.navigate("Settings")}>
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.key}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  header: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  body: { padding: 14, backgroundColor: "#f4f6fb", paddingBottom: 80 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, gap: 14, elevation: 2 },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#222" },
  cardDesc: { fontSize: 12, color: "#888", marginTop: 3 },
});
