import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EventsTabs({
  events,
  program,
  preachers,
  onEditProgram,
  onEditPreacher
}) {

  const [activeTab, setActiveTab] = useState("events");

  return (
    <View style={styles.container}>

      {/* ✅ TAB HEADER */}
      <View style={styles.tabRow}>

        {[
          { key: "events", label: "Upcoming", icon: "calendar-outline" },
          { key: "program", label: "Program", icon: "list-outline" },
          { key: "preachers", label: "Preachers", icon: "person-outline" }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? "#fff" : "#777"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}

      </View>

      {/* ✅ CONTENT */}
      <View style={{ marginTop: 10 }}>

        {/* ── UPCOMING EVENTS ── */}
        {activeTab === "events" && (
          <>
            {events.map(ev => (
              <View key={ev.id} style={styles.card}>
                <Text style={styles.title}>{ev.title}</Text>
                <Text style={styles.sub}>{ev.date}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── PROGRAM ── */}
        {activeTab === "program" && (
          <>
            {program.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => onEditProgram(item)}
              >
                <Text style={styles.title}>{item.item}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── PREACHERS ── */}
        {activeTab === "preachers" && (
          <>
            {preachers.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => onEditPreacher(p)}
              >
                <Text style={styles.title}>{p.name}</Text>
                <Text style={styles.sub}>{p.topic}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 12,
  },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderRadius: 12,
    padding: 4,
  },

  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 5,
  },

  activeTab: {
    backgroundColor: "#4B3F72",
    borderRadius: 10,
  },

  tabText: {
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
  },

  activeTabText: {
    color: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },

  title: {
    fontWeight: "700",
    fontSize: 14,
    color: "#222"
  },

  sub: {
    fontSize: 12,
    color: "#777"
  }
});