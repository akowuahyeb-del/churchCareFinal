import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ChurchLogo({
  entity,
  onPress,
  size = 42
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>

      {entity?.logo ? (
        <Image
          source={{ uri: entity.logo }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View style={[styles.iconBox, { width: size, height: size, borderRadius: size / 2 }]}>
          <Ionicons name="camera-outline" size={size * 0.5} color="#fff" />
        </View>
      )}

      <View style={{ marginLeft: 10 }}>
        <Text style={styles.title}>
          {entity?.name || "Select Church"}
        </Text>
        <Text style={styles.subtitle}>
          Tap to upload logo
        </Text>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  iconBox: {
    backgroundColor: "#4B3F72",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "800",
    fontSize: 14,
    color: "#222",
  },
  subtitle: {
    fontSize: 11,
    color: "#888",
  },
});