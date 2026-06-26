// screens/AssignMemberRolesScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { findPermission, mergePermissions } from "../constants/permissions";

export default function AssignMemberRolesScreen({ route }) {
  const navigation = useNavigation();
  const user = route.params?.user || {};

  const [organizationId, setOrganizationId] = useState(null);
  const [entityId, setEntityId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleIds, setSelectedRoleIds] = useState(user.roles || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setOrganizationId(parsed.organizationId || null);
        setEntityId(parsed.entityId || null);
      }
    });
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    const unsub = onSnapshot(
      collection(db, "organizations", organizationId, "roles"),
      snap => {
        setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [organizationId]);

  // ✅ Show every active role, PLUS any inactive role this member already
  // happens to hold — visible so it can be removed, but not re-addable.
  const assignableRoles = roles.filter(
    r => r.active !== false || selectedRoleIds.includes(r.id)
  );

  const toggleRole = (role) => {
    const alreadySelected = selectedRoleIds.includes(role.id);

    if (!alreadySelected && role.id === "super_admin") {
      Alert.alert(
        "Grant Super Admin?",
        "This gives full unrestricted access, including the ability to manage other admins' roles. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Grant",
            style: "destructive",
            onPress: () => setSelectedRoleIds(prev => [...prev, role.id])
          }
        ]
      );
      return;
    }

    setSelectedRoleIds(prev =>
      alreadySelected ? prev.filter(id => id !== role.id) : [...prev, role.id]
    );
  };

  const handleSave = async () => {
    if (!organizationId || !entityId || !user?.id) {
      Alert.alert("Missing context", "Couldn't determine which church/member to update.");
      return;
    }

    setSaving(true);
    try {
      const selectedRoleObjects = roles.filter(r => selectedRoleIds.includes(r.id));
      const effectivePermissions = mergePermissions(selectedRoleObjects);

      // ⚠️ Assumes members live at
      // organizations/{organizationId}/entities/{entityId}/members/{memberId}.
      // Adjust this path if your Members screen stores them somewhere else.
      await updateDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "members", user.id),
        {
          roles: selectedRoleIds,
          permissions: effectivePermissions // ✅ denormalized union, cheap to check elsewhere
        }
      );

      Alert.alert("✅ Saved", `Roles updated for ${user.name || "this member"}.`);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Save failed", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AppHeader
        title="Assign Roles"
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#4B3F72" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.title}>{user.name || "Member"}</Text>
          <Text style={styles.subtitle}>
            Select every role this person should hold. Their effective
            permissions are the combination of all selected roles.
          </Text>

          {assignableRoles.map(role => {
            const selected = selectedRoleIds.includes(role.id);
            const inactive = role.active === false;

            return (
              <TouchableOpacity
                key={role.id}
                style={styles.row}
                onPress={() => toggleRole(role)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleLabel}>
                    {role.label}{inactive ? "  (inactive — remove only)" : ""}
                  </Text>
                  <View style={styles.chipsRow}>
                    {(role.permissions || []).slice(0, 4).map(key => {
                      const perm = findPermission(key);
                      return (
                        <View key={key} style={styles.chip}>
                          <Text style={styles.chipText}>{perm?.label || key}</Text>
                        </View>
                      );
                    })}
                    {(role.permissions || []).length > 4 && (
                      <Text style={styles.moreText}>
                        +{role.permissions.length - 4} more
                      </Text>
                    )}
                    {(role.permissions || []).length === 0 && (
                      <Text style={styles.moreText}>No special permissions</Text>
                    )}
                  </View>
                </View>

                <Ionicons
                  name={selected ? "checkbox" : "square-outline"}
                  size={22}
                  color={selected ? "#4B3F72" : "#999"}
                />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {saving ? "Saving..." : "Save Roles"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 17 },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
    marginBottom: 8,
    gap: 10
  },
  roleLabel: { fontSize: 14, fontWeight: "700", color: "#222", marginBottom: 6 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, color: "#4B3F72", fontWeight: "700" },
  moreText: { fontSize: 10, color: "#aaa", alignSelf: "center" },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10
  }
});