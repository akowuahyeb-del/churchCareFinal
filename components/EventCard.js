import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EventCard({ event, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      
      {event.coverImage && (
        <Image source={{ uri: event.coverImage }} style={styles.image} />
      )}

      <View style={styles.body}>
        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={12} color="#888" />
          <Text style={styles.meta}>{event.startDate}</Text>
        </View>

        {event.location && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color="#888" />
            <Text style={styles.meta}>{event.location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 2,
  },

  image: {
    width: "100%",
    height: 110,
  },

  body: {
    padding: 12,
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  meta: {
    fontSize: 11,
    color: "#888",
  },
});