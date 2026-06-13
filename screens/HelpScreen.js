import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function HelpScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ✅ HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.getParent()?.navigate("Home")}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      {/* ✅ BODY */}
      <View style={styles.body}>
        <Text style={styles.title}>How can we help you?</Text>

        <View style={styles.card}>
          <Ionicons name="chatbubbles-outline" size={22} color="#4B3F72" />
          <Text style={styles.cardText}>Contact Support</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="book-outline" size={22} color="#4B3F72" />
          <Text style={styles.cardText}>User Guide</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="information-circle-outline" size={22} color="#4B3F72" />
          <Text style={styles.cardText}>About App</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}const styles = StyleSheet.create({
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
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 16,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },

  cardText: {
    fontSize: 14,
    fontWeight: "600",
  },
});