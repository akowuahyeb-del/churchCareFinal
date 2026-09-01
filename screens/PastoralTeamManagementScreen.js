import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

const CATEGORIES = [
  { key: "prayer", label: "Prayer" },
  { key: "counselling", label: "Counselling" },
  { key: "bereavement", label: "Bereavement" },
  { key: "financial", label: "Financial" },
  { key: "general", label: "General" },
];

export default function PastoralTeamManagementScreen({ navigation }) {
  const [entity, setEntity] = useState(null);
  const [churchMembers, setChurchMembers] = useState([]);
  const [team, setTeam] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // existing team doc, or null for "add new"

  const [selectedMember, setSelectedMember] = useState(null);
  const [manualUid, setManualUid] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isSeniorPastor, setIsSeniorPastor] = useState(false);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const stored = await AsyncStorage.getItem("activeEntity");
    if (!stored) return;
    const ent = JSON.parse(stored);
    setEntity(ent);

    const membersSnap = await getDocs(
      collection(
        db,
        "organizations",
        ent.organizationId,
        "entities",
        ent.entityId,
        "members"
      )
    );
    setChurchMembers(membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const teamSnap = await getDocs(
      collection(
        db,
        "organizations",
        ent.organizationId,
        "entities",
        ent.entityId,
        "pastoralTeam"
      )
    );
    setTeam(teamSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditing(null);
    setSelectedMember(null);
    setManualUid("");
    setSelectedCategories([]);
    setIsSeniorPastor(false);
    setActive(true);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setEditing(member);
    setSelectedMember(null);
    setManualUid(member.uid);
    setSelectedCategories(member.categories || []);
    setIsSeniorPastor(!!member.isSeniorPastor);
    setActive(member.active !== false);
    setShowModal(true);
  };

  const toggleCategory = (key) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const save = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert("Required", "Select at least one category this person will cover.");
      return;
    }

    // Resolve the Auth UID: editing an existing entry, a church member
    // record with a linked `uid` field, or a manually entered UID.
    const resolvedUid = editing
      ? editing.uid
      : selectedMember?.uid || manualUid.trim();

    const resolvedName = editing
      ? editing.name
      : selectedMember?.name || manualUid.trim();

    if (!resolvedUid) {
      Alert.alert(
        "Required",
        "Select a member with a linked account, or enter their Auth UID manually."
      );
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(
          db,
          "organizations",
          entity.organizationId,
          "entities",
          entity.entityId,
          "pastoralTeam",
          resolvedUid
        ),
        {
          name: resolvedName,
          categories: selectedCategories,
          isSeniorPastor,
          active,
          updatedAt: new Date().toISOString(),
          ...(editing ? {} : { createdAt: new Date().toISOString() }),
        },
        { merge: true }
      );

      Alert.alert("Success", `${resolvedName} saved to the pastoral team.`);
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    try {
      await updateDoc(
        doc(
          db,
          "organizations",
          entity.organizationId,
          "entities",
          entity.entityId,
          "pastoralTeam",
          member.uid
        ),
        { active: !member.active, updatedAt: new Date().toISOString() }
      );
      await loadData();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Pastoral Team"
        subtitle="Manage staff & routing"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {team.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No team members yet</Text>
            <Text style={styles.emptyText}>
              Add staff so requests can be routed automatically.
            </Text>
          </View>
        ) : (
          team.map((member) => (
            <TouchableOpacity
              key={member.uid}
              style={[styles.card, !member.active && styles.cardInactive]}
              onPress={() => openEditModal(member)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{member.name}</Text>
                {member.isSeniorPastor && (
                  <View style={styles.seniorBadge}>
                    <Text style={styles.seniorBadgeText}>Senior Pastor</Text>
                  </View>
                )}
              </View>

              <View style={styles.categoryRow}>
                {(member.categories || []).map((c) => (
                  <View key={c} style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>
                      {CATEGORIES.find((x) => x.key === c)?.label || c}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.statusText}>
                  {member.active ? "Active" : "Inactive"}
                </Text>
                <Switch
                  value={member.active !== false}
                  onValueChange={() => toggleActive(member)}
                />
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add Team Member</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showModal} animationType="slide">
        <View style={{ flex: 1 }}>
          <AppHeader
            title={editing ? "Edit Team Member" : "Add Team Member"}
            subtitle="Pastoral Care"
            onBack={() => {
              setShowModal(false);
              resetForm();
            }}
          />

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {!editing && (
              <>
                <Text style={styles.label}>Select Church Member</Text>
                {churchMembers.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.option,
                      selectedMember?.id === m.id && styles.optionSelected,
                    ]}
                    onPress={() => {
                      setSelectedMember(m);
                      setManualUid(m.uid || "");
                    }}
                  >
                    <Text>{m.name}</Text>
                    {!m.uid && (
                      <Text style={styles.noUidNote}>No linked account</Text>
                    )}
                  </TouchableOpacity>
                ))}

                <Text style={styles.label}>
                  {selectedMember && !selectedMember.uid
                    ? "This member has no linked account — enter their Auth UID"
                    : "Or enter an Auth UID directly"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Firebase Auth UID"
                  value={manualUid}
                  onChangeText={setManualUid}
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>
                  Find this in the Firebase console under Authentication, or
                  from the app's account/profile screen once your team's
                  member↔account linking is in place.
                </Text>
              </>
            )}

            <Text style={styles.label}>Categories Covered</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.chip,
                    selectedCategories.includes(c.key) && styles.chipActive,
                  ]}
                  onPress={() => toggleCategory(c.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCategories.includes(c.key) && styles.chipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Senior Pastor</Text>
                <Text style={styles.switchSub}>
                  Also pages this person on crisis-flagged and stale
                  escalated requests, regardless of category.
                </Text>
              </View>
              <Switch value={isSeniorPastor} onValueChange={setIsSeniorPastor} />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Active</Text>
                <Text style={styles.switchSub}>
                  Inactive staff won't receive new assignments.
                </Text>
              </View>
              <Switch value={active} onValueChange={setActive} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add to Team"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { marginTop: 8, color: "#666" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardInactive: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700" },
  seniorBadge: { backgroundColor: "#4B3F72", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  seniorBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  categoryPill: { backgroundColor: "#EEF0FA", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryPillText: { fontSize: 11, color: "#4B3F72", fontWeight: "600" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  statusText: { fontSize: 12, color: "#666" },
  addBtn: { backgroundColor: "#4B3F72", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  addBtnText: { color: "#fff", fontWeight: "700" },
  label: { fontWeight: "700", marginTop: 16, marginBottom: 8 },
  option: { backgroundColor: "#EEE", padding: 12, borderRadius: 10, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionSelected: { backgroundColor: "#DDE3FF" },
  noUidNote: { fontSize: 10, color: "#E67E22", fontWeight: "700" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12 },
  hint: { fontSize: 11, color: "#999", marginTop: 6, lineHeight: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#EEE", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipActive: { backgroundColor: "#4B3F72" },
  chipText: { color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  switchRow: { flexDirection: "row", alignItems: "center", marginTop: 20, backgroundColor: "#F5F5F5", padding: 14, borderRadius: 12 },
  switchLabel: { fontWeight: "700" },
  switchSub: { color: "#777", fontSize: 12, marginTop: 2 },
  saveBtn: { backgroundColor: "#4B3F72", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});