import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";



export default function DepartmentsScreen() {
  const navigation = useNavigation();
  const [selectedDept, setSelectedDept] = React.useState(null);

  const departments = [
  {
    name: "Choir",
    members: ["John Doe", "Mary Mensah", "Kwame Asante"],
    icon: "musical-notes-outline",
    color: "#4F46E5",
  },
  {
    name: "Ushering",
    members: ["Daniel Owusu", "Ama Serwaa"],
    icon: "people-outline",
    color: "#059669",
  },
  {
    name: "Media",
    members: ["Kofi Appiah", "Kojo Mensah"],
    icon: "videocam-outline",
    color: "#D97706",
  },
  {
    name: "Prayer Team",
    members: ["Grace Arthur", "Paul Addo"],
    icon: "heart-outline",
    color: "#E11D48",
  },
];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ✅ HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.getParent()?.navigate("Home")}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Departments</Text>
      </View>

      {/* ✅ BODY */}
      <ScrollView contentContainerStyle={styles.body}>

  {/* ✅ DEPARTMENT LIST */}
  {departments.map((dept, index) => (
    <TouchableOpacity
      key={index}
      style={styles.card}
      onPress={() => setSelectedDept(dept)}
    >
      <View style={[styles.iconBox, { backgroundColor: dept.color + "15" }]}>
        <Ionicons name={dept.icon} size={24} color={dept.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{dept.name}</Text>
        <Text style={styles.cardDesc}>Tap to view members</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  ))}

  {/* ✅ 🔥 PLACE IT HERE (AFTER THE MAP) */}
  {selectedDept && (
    <View style={styles.membersBox}>
      <Text style={styles.membersTitle}>
        Members in {selectedDept.name}
      </Text>

      {selectedDept.members.map((member, i) => (
        <View key={i} style={styles.memberRow}>
          <Ionicons name="person-outline" size={16} color="#4B3F72" />
          <Text style={styles.memberText}>{member}</Text>
        </View>
      ))}
    </View>
  )}

</ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
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
    flexGrow: 1,
    backgroundColor: "#f4f6fb",
    padding: 14,
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

  membersBox: {
  marginTop: 16,
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 14,
  elevation: 2,
},

membersTitle: {
  fontSize: 14,
  fontWeight: "800",
  marginBottom: 10,
},

memberRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
},

memberText: {
  fontSize: 13,
  color: "#333",
},
});