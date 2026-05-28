import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity
} from "react-native";

import { Feather } from "@expo/vector-icons";

export default function AttendanceScreen() {

  const [search, setSearch] = useState("");

  /* ✅ MOCK DATA (we connect Firebase later) */
  const recent = [
    { id: "1", name: "Grace Mensah", time: "9:15 AM" },
    { id: "2", name: "Kofi Agyeman", time: "9:14 AM" }
  ];

  return (
    <View style={styles.container}>

      {/* ✅ HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Check‑in</Text>
      </View>

      {/* ✅ CONTENT */}
      <View style={styles.content}>

        {/* ✅ SERVICE SELECT */}
        <Text style={styles.label}>Select Service / Event</Text>

        <TouchableOpacity style={styles.dropdown}>
          <Text>Sunday Service - 12 May 2024</Text>
          <Feather name="chevron-down" size={18} />
        </TouchableOpacity>

        {/* ✅ QR AREA */}
        <View style={styles.qrBox}>
          <View style={styles.qrPlaceholder}>
            <Text style={{ color: "#999" }}>QR Code Area</Text>
          </View>

          <Text style={styles.qrText}>
            Scan member QR code to mark attendance
          </Text>
        </View>

        {/* ✅ DIVIDER */}
        <Text style={styles.or}>OR</Text>

        {/* ✅ SEARCH */}
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#888" />
          <TextInput
            placeholder="Search member by name or phone"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* ✅ RECENT CHECK-INS */}
        <Text style={styles.section}>Recent Check-ins</Text>

        <FlatList
          data={recent}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>

              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>

              <Feather name="check-circle" size={18} color="green" />
            </View>
          )}
        />

      </View>

    </View>
  );
}

/* ✅ STYLES */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#4B3F72"
  },

  header: {
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },

  content: {
    flex: 1,
    backgroundColor: "#f7f8fb",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18
  },

  label: {
    marginBottom: 6,
    fontWeight: "500"
  },

  dropdown: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15
  },

  qrBox: {
    alignItems: "center",
    marginBottom: 10
  },

  qrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: "#fff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd"
  },

  qrText: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
    textAlign: "center"
  },

  or: {
    textAlign: "center",
    marginVertical: 10,
    color: "#888"
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 15
  },

  searchInput: {
    marginLeft: 8,
    flex: 1
  },

  section: {
    fontWeight: "600",
    marginBottom: 10
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },

  name: {
    fontWeight: "500"
  },

  time: {
    fontSize: 12,
    color: "#777"
  }

});