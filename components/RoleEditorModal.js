// components/RoleEditorModal.js
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from "react-native";
import { PERMISSION_GROUPS } from "../constants/permissions";

export default function RoleEditorModal({
  visible,
  onClose,
  onSave,
  onToggleActive,
  onDelete,
  initialData = {}
}) {
  const [label, setLabel] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [error, setError] = useState("");

  const isProtected = !!initialData?.protected;
  const isDefaultRole = !!initialData?.isDefault;
  const isEditing = !!initialData?.id;
  const isActive = initialData?.active !== false; // treat missing as active

  useEffect(() => {
    if (!visible) return;
    setLabel(initialData?.label || "");
    setSelectedPermissions(initialData?.permissions || []);
    setError("");
  }, [visible, initialData]);

  const togglePermission = (key) => {
    if (isProtected) return; // Super Admin always has everything, by design
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    if (!label.trim()) {
      setError("Role name is required");
      return;
    }

    onSave({
      id: initialData?.id || label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label: label.trim(),
      description: initialData?.description || "",
      permissions: isProtected ? initialData.permissions : selectedPermissions,
      protected: isProtected,
      isDefault: isDefaultRole,
      active: initialData?.active !== false
    });
  };

  const handleDeactivateToggle = () => {
    if (isProtected || isDefaultRole) return;
    onToggleActive && onToggleActive(initialData.id, !isActive);
  };

  const handleDelete = () => {
    Alert.alert(
      `Delete "${initialData?.label}"?`,
      "This is permanent. Members currently holding this role will keep it referenced on their record, but it will no longer grant any permissions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete && onDelete(initialData.id)
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={styles.title}>
              {isEditing ? "Edit Role" : "New Role"}
            </Text>

            {isProtected && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  Super Admin is a protected role with full access by design.
                  It can't be renamed, re-permissioned, deactivated, or deleted.
                </Text>
              </View>
            )}

            {isDefaultRole && !isProtected && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  This is the default fallback role every member starts with.
                  You can rename it and change its permissions, but it can't
                  be deactivated or deleted.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Role Name</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              editable={!isProtected}
              placeholder="e.g. Choir Director"
            />

            <Text style={styles.label}>Permissions</Text>

            {PERMISSION_GROUPS.map(group => (
              <View key={group.group} style={styles.group}>
                <Text style={styles.groupTitle}>{group.group}</Text>
                {group.permissions.map(p => {
                  const checked = isProtected
                    ? true
                    : selectedPermissions.includes(p.key);
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={styles.permRow}
                      onPress={() => togglePermission(p.key)}
                      disabled={isProtected}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                        {checked && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.permLabel}>{p.label}</Text>
                        <Text style={styles.permDesc}>{p.description}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.save} onPress={handleSave}>
              <Text style={styles.white}>Save</Text>
            </TouchableOpacity>

            {isEditing && !isProtected && !isDefaultRole && (
              <TouchableOpacity style={styles.deactivate} onPress={handleDeactivateToggle}>
                <Text style={styles.white}>
                  {isActive ? "Deactivate Role" : "Activate Role"}
                </Text>
              </TouchableOpacity>
            )}

            {isEditing && !isProtected && !isDefaultRole && !isActive && (
              <TouchableOpacity style={styles.delete} onPress={handleDelete}>
                <Text style={styles.white}>Delete Permanently</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#0006", justifyContent: "center" },
  box: { backgroundColor: "#fff", margin: 20, padding: 16, borderRadius: 16, maxHeight: "85%" },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  noticeBox: { backgroundColor: "#FFF8E1", borderRadius: 10, padding: 10, marginBottom: 12 },
  noticeText: { fontSize: 12, color: "#8a6d1d", lineHeight: 17 },
  label: { fontSize: 12, fontWeight: "700", color: "#777", marginBottom: 6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, marginBottom: 12 },
  group: { marginBottom: 12 },
  groupTitle: { fontSize: 11, fontWeight: "800", color: "#4B3F72", textTransform: "uppercase", marginBottom: 6 },
  permRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 7 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#ccc", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "800" },
  permLabel: { fontSize: 13, fontWeight: "700", color: "#222" },
  permDesc: { fontSize: 11, color: "#888", marginTop: 1 },
  errorText: { color: "#e74c3c", fontSize: 12, marginBottom: 8, fontWeight: "600" },
  save: { backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 6 },
  deactivate: { backgroundColor: "#E17055", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  delete: { backgroundColor: "#E11D48", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  cancel: { textAlign: "center", marginTop: 12, color: "#888" },
  white: { color: "#fff", fontWeight: "700" }
});