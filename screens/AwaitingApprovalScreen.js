import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AwaitingApprovalScreen({ navigation }) {
  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      "isLoggedIn",
      "currentUser",
      "activeEntity",
      "userEntities",
    ]);

    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="time-outline"
          size={80}
          color="#F39C12"
        />

        <Text style={styles.title}>
          Awaiting Approval
        </Text>

        <Text style={styles.subtitle}>
          Your church registration has been submitted
          successfully.
        </Text>

        <Text style={styles.message}>
          ChurchCare is currently reviewing your church
          registration. Once approved, you will gain
          access to members, attendance, finance,
          hierarchy setup, and all church management
          features.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>
            Current Status
          </Text>

          <Text style={styles.statusValue}>
            Pending Approval
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginTop: 12,
  },

  message: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 22,
  },

  statusCard: {
    backgroundColor: "#FFF8E7",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    width: "100%",
  },

  statusLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },

  statusValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F39C12",
  },

  logoutBtn: {
    marginTop: 30,
    backgroundColor: "#4B3F72",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "700",
  },
});