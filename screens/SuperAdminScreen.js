import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";

export default function SuperAdminScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <AppHeader
        title="Super Admin"
        subtitle="Developer Console"
        onBack={() => navigation.goBack()}
      />
<ScrollView contentContainerStyle={styles.body}>

  <View style={styles.card}>
    <Text style={styles.title}>
      ChurchCare Developer Console
    </Text>

    <Text style={styles.sub}>
      Super Admin tools will appear here.
    </Text>
  </View>

  <TouchableOpacity
    style={styles.toolCard}
    onPress={() => navigation.navigate("PendingChurches")}
  >
    <Ionicons
      name="hourglass-outline"
      size={24}
      color="#F39C12"
    />

    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.toolTitle}>
        Pending Churches
      </Text>

      <Text style={styles.toolSub}>
        Review and approve church registrations
      </Text>
    </View>

    <Ionicons
      name="chevron-forward"
      size={18}
      color="#999"
    />
  </TouchableOpacity>

</ScrollView>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  body: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
  },

  sub: {
    marginTop: 8,
    color: "#777",
  },
  toolCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  flexDirection: "row",
  alignItems: "center",
  marginTop: 12,
},

toolTitle: {
  fontSize: 15,
  fontWeight: "700",
  color: "#222",
},

toolSub: {
  fontSize: 12,
  color: "#888",
  marginTop: 2,
},
});