import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView ,TextInput} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { useNavigation } from "@react-navigation/native";



export default function RolesScreen({ route }) {

const [availableRoles, setAvailableRoles] = useState([
  { id: "admin", label: "Administrator" },
  { id: "pastor", label: "Pastor" },
  { id: "usher", label: "Usher" },
  { id: "choir", label: "Choir" }
]);

const [newRole, setNewRole] = useState("");
const navigation = useNavigation();


  const user = route.params?.user || {};
  const [roles, setRoles] = useState(user.roles || []);

  // ✅ TOGGLE ROLE
  const toggleRole = (roleId) => {
    if (roles.includes(roleId)) {
      setRoles(prev => prev.filter(r => r !== roleId));
    } else {
      setRoles(prev => [...prev, roleId]);
    }
  };

  return (
  <View style={{ flex: 1, backgroundColor: "#fff" }}>

    {/* ✅ HEADER */}
    <AppHeader
  title="Roles & Privileges"
  showBack
  onBack={() => navigation.goBack()}
/>

    {/* ✅ CONTENT */}
    <ScrollView contentContainerStyle={{ padding: 16 }}>

      <Text style={styles.title}>Assign Roles</Text>


{/* ✅ ADD NEW ROLE INPUT (INSERTED HERE) */}
<View style={{ marginBottom: 16 }}>

  <TextInput
    placeholder="Enter new role"
    value={newRole}
    onChangeText={setNewRole}
    style={{
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 8,
      padding: 10,
      marginBottom: 8
    }}
  />

  <TouchableOpacity
    style={{
      backgroundColor: "#4B3F72",
      padding: 10,
      borderRadius: 8
    }}
    onPress={() => {
      if (!newRole.trim()) return;

      const newItem = {
        id: Date.now().toString(),
        label: newRole.trim()
      };

      setAvailableRoles(prev => [...prev, newItem]);
      setNewRole("");
    }}
  >
    <Text style={{ color: "#fff", textAlign: "center" }}>
      Add Role
    </Text>
  </TouchableOpacity>

</View>
{availableRoles.map(role => {
  const selected = roles.includes(role.id);

  return (
    <TouchableOpacity
      key={role.id}
      style={styles.row}

      // ✅ TOGGLE ROLE
      onPress={() => toggleRole(role.id)}

      // ✅ LONG PRESS → RENAME OR DELETE
      onLongPress={() => {
        Alert.alert(
          role.label,
          "Choose action",
          [
            {
              text: "Rename",
              onPress: () => {
                Alert.prompt(
                  "Rename Role",
                  "Enter new name",
                  (text) => {
                    if (!text || !text.trim()) return;

                    setAvailableRoles(prev =>
                      prev.map(r =>
                        r.id === role.id
                          ? { ...r, label: text.trim() }
                          : r
                      )
                    );
                  },
                  "plain-text",
                  role.label
                );
              }
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                Alert.alert(
                  "Delete Role",
                  `Are you sure you want to delete "${role.label}"?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        // ✅ remove role
                        setAvailableRoles(prev =>
                          prev.filter(r => r.id !== role.id)
                        );

                        // ✅ remove from assigned roles
                        setRoles(prev =>
                          prev.filter(r => r !== role.id)
                        );
                      }
                    }
                  ]
                );
              }
            },
            { text: "Cancel", style: "cancel" }
          ]
        );
      }}
    >
      <Text style={styles.label}>{role.label}</Text>

      <Ionicons
        name={selected ? "checkbox" : "square-outline"}
        size={22}
        color={selected ? "#4B3F72" : "#999"}
      />
    </TouchableOpacity>
  );
})}



      {/* ✅ SAVE BUTTON */}
      <TouchableOpacity
        style={styles.save}
        onPress={() => {
          console.log("Saved roles:", roles);
        }}
      >
        <Text style={{ color: "#fff" }}>Save Roles</Text>
      </TouchableOpacity>

    </ScrollView>

  </View>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },

  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
    marginBottom: 8
  },

  label: {
    fontSize: 14,
    fontWeight: "600"
  },

  save: {
    marginTop: 20,
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 10,
    alignItems: "center"
  }
});
