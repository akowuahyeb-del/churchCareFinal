// screens/RolesScreen.js
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
import RoleEditorModal from "../components/RoleEditorModal";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { DEFAULT_ROLES } from "../constants/permissions";

export default function RolesScreen() {
  const navigation = useNavigation();

  const [organizationId, setOrganizationId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const seedingRef = React.useRef(false);

  // ✅ Which organization we're managing roles for
  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setOrganizationId(parsed.organizationId || null);
      }
    });
  }, []);

  // ✅ Real-time roles list + one-time seed of standard roles for a new org.
  // This is what makes everything below actually persist — the original
  // screen never wrote to Firestore at all, so every change vanished on
  // navigating away or reopening the app.
  useEffect(() => {
    if (!organizationId) return;

    const rolesRef = collection(db, "organizations", organizationId, "roles");

    const unsub = onSnapshot(rolesRef, async snap => {
      if (snap.empty && !seedingRef.current) {
        seedingRef.current = true;
        try {
          const batch = writeBatch(db);
          DEFAULT_ROLES.forEach(role => {
            batch.set(doc(rolesRef, role.id), role);
          });
          await batch.commit();
        } catch (e) {
          console.log("Seed roles error:", e);
        }
        seedingRef.current = false;
        return; // the listener fires again once the seed write lands
      }

      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRoles(list);
      setLoading(false);
    });

    return () => unsub();
  }, [organizationId]);

  const activeRoles = roles.filter(r => r.active !== false);
  const inactiveRoles = roles.filter(r => r.active === false);

  const saveRole = async (roleData) => {
    if (!organizationId) return;
    try {
      await setDoc(
        doc(db, "organizations", organizationId, "roles", roleData.id),
        roleData,
        { merge: true }
      );
      setModalVisible(false);
      setEditingRole(null);
    } catch (e) {
      Alert.alert("Save failed", e.message);
    }
  };

  const toggleActive = async (roleId, nextActive) => {
    if (!organizationId) return;
    try {
      await updateDoc(doc(db, "organizations", organizationId, "roles", roleId), {
        active: nextActive
      });
      setModalVisible(false);
      setEditingRole(null);
    } catch (e) {
      Alert.alert("Update failed", e.message);
    }
  };

  const deleteRole = async (roleId) => {
    if (!organizationId) return;
    try {
      await deleteDoc(doc(db, "organizations", organizationId, "roles", roleId));
      setModalVisible(false);
      setEditingRole(null);
    } catch (e) {
      Alert.alert("Delete failed", e.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AppHeader
        title="Roles & Privileges"
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#4B3F72" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>

          <Text style={styles.title}>Manage Roles</Text>
          <Text style={styles.subtitle}>
            Define what each role can do here. To assign a role to a specific
            person, open their profile from the Members list.
          </Text>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingRole({});
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Define New Role</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Active Roles</Text>
          {activeRoles.map(role => (
            <RoleRow
              key={role.id}
              role={role}
              onPress={() => {
                setEditingRole(role);
                setModalVisible(true);
              }}
            />
          ))}

          {inactiveRoles.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                Inactive Roles
              </Text>
              {inactiveRoles.map(role => (
                <RoleRow
                  key={role.id}
                  role={role}
                  inactive
                  onPress={() => {
                    setEditingRole(role);
                    setModalVisible(true);
                  }}
                />
              ))}
            </>
          )}

        </ScrollView>
      )}

      <RoleEditorModal
        visible={modalVisible}
        initialData={editingRole || {}}
        onClose={() => {
          setModalVisible(false);
          setEditingRole(null);
        }}
        onSave={saveRole}
        onToggleActive={toggleActive}
        onDelete={deleteRole}
      />
    </View>
  );
}

const RoleRow = ({ role, onPress, inactive }) => (
  <TouchableOpacity
    style={[styles.row, inactive && styles.rowInactive]}
    onPress={onPress}
  >
    <View style={{ flex: 1 }}>
      <View style={styles.rowTitleLine}>
        <Text style={styles.label}>{role.label}</Text>
        {role.protected && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Protected</Text>
          </View>
        )}
        {role.isDefault && (
          <View style={[styles.badge, styles.badgeDefault]}>
            <Text style={styles.badgeText}>Default</Text>
          </View>
        )}
      </View>
      <Text style={styles.rowSub}>
        {(role.permissions || []).length} permission
        {(role.permissions || []).length === 1 ? "" : "s"}
        {inactive ? " • inactive" : ""}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#bbb" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 17 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 10,
    gap: 6,
    marginBottom: 20
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 8
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
    marginBottom: 8
  },
  rowInactive: { backgroundColor: "#f9f9f9", opacity: 0.7 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 14, fontWeight: "700", color: "#222" },
  rowSub: { fontSize: 11, color: "#888", marginTop: 3 },

  badge: { backgroundColor: "#4B3F72", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeDefault: { backgroundColor: "#888" },
  badgeText: { fontSize: 9, color: "#fff", fontWeight: "800" }
});