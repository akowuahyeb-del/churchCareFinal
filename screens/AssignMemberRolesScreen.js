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
import {
  findPermission,
  mergePermissions,
  PROTECTED_ROLE_IDS,
} from "../constants/permissions";
import { useSubscription } from "../utils/subscription";


const ADMIN_PERMISSIONS = [
  "manage_roles",
  "manage_members",
  "manage_church_settings",
  "manage_finance",
];






export default function AssignMemberRolesScreen({ route }) {
  const navigation = useNavigation();
  const user = route.params?.user || {};
 
  


  const [organizationId, setOrganizationId] = useState(null);
  const [entityId, setEntityId] = useState(null);
  const { adminsLimit } = useSubscription(organizationId,entityId);


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
  r =>
    r.id !== "super_admin" &&
    !r.protected &&
    !PROTECTED_ROLE_IDS.includes(r.id) &&
    (
      r.active !== false ||
      selectedRoleIds.includes(r.id)
    )
);
const protectedRoles = roles.filter(
  r =>
    r.protected ||
    PROTECTED_ROLE_IDS.includes(r.id)
);

 const toggleRole = (role) => {
  // 🚫 Super Admin is not assignable from this screen
  if (role.id === "super_admin") {
    Alert.alert(
      "Restricted Role",
      "Super Admin cannot be assigned from this screen."
    );
    return;
  }

  const alreadySelected = selectedRoleIds.includes(role.id);

  setSelectedRoleIds(prev =>
    alreadySelected
      ? prev.filter(id => id !== role.id)
      : [...prev, role.id]
  );
};


const openProtectedOfficeNomination =
  (role) => {

    Alert.alert(
      "Protected Office",

      `Nominate ${user.name} for ${role.label}?`,

      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Submit",

          onPress: () =>
            submitProtectedOfficeNomination(
              role
            ),
        },
      ]
    );
  };

  const submitProtectedOfficeNomination =
  async (role) => {

    try {

      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (!stored) {
        Alert.alert(
          "Error",
          "No active entity."
        );
        return;
      }

      const activeEntity =
        JSON.parse(stored);

      await addDoc(
        collection(
          db,
          "organizations",
          activeEntity.organizationId,
          "approvalRequests"
        ),
        {
          type: "governance",

          nominationType:
            "protected_office",

          protectedOffice:
            role.id,

          protectedOfficeName:
            role.label,

          actionType:
            "add_holder",

          memberId:
            user.id,

          memberName:
            user.name,

          requestedAt:
            new Date().toISOString(),

          status:
            "pending",

          approvals: [],
          rejections: [],
        }
      );

      Alert.alert(
        "Submitted",

        `${role.label} nomination sent for governance approval.`
      );

    } catch (e) {

      Alert.alert(
        "Error",
        e.message
      );

    }
  };


  const handleSave = async () => {
    if (!organizationId || !entityId || !user?.id) {
      Alert.alert("Missing context", "Couldn't determine which church/member to update.");
      return;
    }

    setSaving(true);

    if (selectedRoleIds.includes("super_admin")) {
  Alert.alert(
    "Restricted Role",
    "Super Admin cannot be assigned from this screen."
  );
  setSaving(false);
  return;
}
    try {
   const safeRoleIds = selectedRoleIds.filter(
  id => id !== "super_admin"
);

const protectedSelections =
  safeRoleIds.filter(roleId =>
    PROTECTED_ROLE_IDS.includes(roleId)
  );

const selectedRoleObjects = roles.filter(r =>
  safeRoleIds.includes(r.id)
);
if (protectedSelections.length > 0) {

  Alert.alert(
    "Protected Office",
    "Protected offices cannot be assigned directly."
  );

  setSaving(false);

  return;
}



const effectivePermissions = mergePermissions(selectedRoleObjects);

const isAdminLevelUser =
  effectivePermissions.some(permission =>
    ADMIN_PERMISSIONS.includes(permission)
  );



if (isAdminLevelUser && adminsLimit.isAtLimit) {
  Alert.alert(
    "Admin Limit Reached",
    `You have reached your admin limit.

Current: ${adminsLimit.used} / ${adminsLimit.limit} administrators

Upgrade your plan to assign additional administrative roles.`,
    [
      {
        text: "View Plans",
        onPress: () => navigation.navigate("Subscription"),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]
  );

  setSaving(false);
  return;
}
      await updateDoc(
  doc(
    db,
    "organizations",
    organizationId,
    "entities",
    entityId,
    "members",
    user.id
  ),
  {
    roles: safeRoleIds,
    permissions: effectivePermissions
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
        title="Roles & Offices"
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

<Text
  style={{
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    color: "#4B3F72",
  }}
>
  Operational Roles
</Text>

<Text
  style={{
    fontSize: 12,
    color: "#777",
    marginBottom: 12,
  }}
>
  Operational roles are assigned directly and become effective immediately.
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

<Text
  style={{
    fontSize: 16,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
    color: "#B8860B",
  }}
>
  Protected Offices
</Text>

<Text
  style={{
    fontSize: 12,
    color: "#777",
    marginBottom: 12,
  }}
>
  Protected offices cannot be assigned directly.
  Any nomination will be routed through
  Governance Approval.
</Text>

{protectedRoles.map(role => (

  <TouchableOpacity
    key={role.id}
    style={[
      styles.row,
      {
        borderWidth: 1,
        borderColor: "#B8860B",
        backgroundColor: "#FFFBEA",
      },
    ]}
    onPress={() =>
      openProtectedOfficeNomination(role)
    }
  >

    <View style={{ flex: 1 }}>

      <Text
        style={[
          styles.roleLabel,
          { color: "#B8860B" }
        ]}
      >
        🔒 {role.label}
      </Text>

      <Text
        style={{
          fontSize: 11,
          color: "#666",
        }}
      >
        Governance approval required
      </Text>

    </View>

    <Ionicons
      name="lock-closed"
      size={20}
      color="#B8860B"
    />

  </TouchableOpacity>

))}


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