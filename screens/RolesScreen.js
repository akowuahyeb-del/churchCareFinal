import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { useNavigation } from "@react-navigation/native";

export default function RolesScreen({ route }) {

  const navigation = useNavigation();

  const [availableRoles, setAvailableRoles] = useState([
    { id: "admin", label: "Administrator" },
    { id: "pastor", label: "Pastor" },
    { id: "usher", label: "Usher" },
    { id: "choir", label: "Choir" }
  ]);

  const [newRole, setNewRole] = useState("");

  const [renameModal, setRenameModal] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [editValue, setEditValue] = useState("");

  const [deleteModal, setDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const user = route.params?.user || {};
  const [roles, setRoles] = useState(user.roles || []);

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

        {/* ✅ ADD ROLE */}
        <View style={{ marginBottom: 16 }}>
          <TextInput
            placeholder="Enter new role"
            value={newRole}
            onChangeText={setNewRole}
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.save}
            onPress={() => {
              if (!newRole.trim()) return;

              setAvailableRoles(prev => [
                ...prev,
                { id: Date.now().toString(), label: newRole.trim() }
              ]);

              setNewRole("");
            }}
          >
            <Text style={{ color: "#fff" }}>Add Role</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ ROLES LIST */}
        {availableRoles.map(role => {
          const selected = roles.includes(role.id);

          return (
            <TouchableOpacity
  key={role.id}
  style={styles.row}
  onPress={() => toggleRole(role.id)}
  onLongPress={() => {

    // ✅ PROTECT ADMIN ROLE
    if (role.id === "admin") {
      Alert.alert(
        "Protected Role",
        "Administrator role cannot be modified or deleted."
      );
      return;
    }

    Alert.alert(
      role.label,
      "Choose action",
      [
        {
          text: "Rename",
          onPress: () => {
            setRoleToEdit(role);
            setEditValue(role.label);
            setRenameModal(true);
          }
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setRoleToDelete(role);
            setDeleteModal(true);
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  }}
>
  <Text style={styles.label}>{role.label}</Text>

  <Ionicons
    name={roles.includes(role.id) ? "checkbox" : "square-outline"}
    size={22}
    color={roles.includes(role.id) ? "#4B3F72" : "#999"}
  />
</TouchableOpacity>
          );
        })}

      </ScrollView>

      {/* ✅ RENAME MODAL */}
      <Modal visible={renameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>Rename Role</Text>

            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.save}
              onPress={() => {
                if (!editValue.trim()) return;

                setAvailableRoles(prev =>
                  prev.map(r =>
                    r.id === roleToEdit.id
                      ? { ...r, label: editValue.trim() }
                      : r
                  )
                );

                setRenameModal(false);
              }}
            >
              <Text style={{ color: "#fff" }}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setRenameModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* ✅ DELETE MODAL */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>
              Delete "{roleToDelete?.label}"?
            </Text>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                setAvailableRoles(prev =>
                  prev.filter(r => r.id !== roleToDelete.id)
                );

                setRoles(prev =>
                  prev.filter(r => r !== roleToDelete.id)
                );

                setDeleteModal(false);
              }}
            >
              <Text style={{ color: "#fff" }}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setDeleteModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}



const styles = StyleSheet.create({

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

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },

  save: {
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8
  },

  deleteBtn: {
    backgroundColor: "#E11D48",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },

  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16
  },

  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center"
  },

  cancelText: {
    textAlign: "center",
    color: "#888"
  }

});