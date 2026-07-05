// screens/MemberMobilityScreen.js
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, getDocs, doc, updateDoc, query, where
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";
import {
  MOBILITY_STATUS, MOBILITY_LABELS, getMobilityLabel, isMemberAway, trueLocalMembers
} from "../constants/memberMobility";

export default function MemberMobilityScreen() {
  const navigation = useNavigation();
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;

  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");

  const [editModal,  setEditModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [mobStatus,  setMobStatus]  = useState(MOBILITY_STATUS.PERMANENT);
  const [awayFrom,   setAwayFrom]   = useState("");
  const [awayTo,     setAwayTo]     = useState("");
  const [awayReason, setAwayReason] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [homeCity,   setHomeCity]   = useState("");
  const [saving,     setSaving]     = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(d => {
      if (d) { try { setActiveEntity(JSON.parse(d)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;
    loadMembers();
  }, [organizationId, entityId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        collection(db, "organizations", organizationId, "entities", entityId, "members")
      );
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("❌ loadMembers mobility:", e);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (member) => {
    setEditing(member);
    setMobStatus(member.mobilityStatus || MOBILITY_STATUS.PERMANENT);
    setSchoolName(member.schoolName || "");
    setHomeCity(member.homeCity || "");
    setAwayFrom(""); setAwayTo(""); setAwayReason("");
    setEditModal(true);
  };

  const saveStatus = async () => {
    if (!editing || !organizationId || !entityId) return;
    setSaving(true);
    try {
      const currentAway = editing.awayPeriods || [];
      let updatedAway = [...currentAway];

      if (awayFrom && awayTo) {
        if (awayFrom > awayTo) {
          Alert.alert("Invalid Dates", "From date must be before To date.");
          setSaving(false); return;
        }
        updatedAway = [
          ...currentAway.filter(p => p.to >= today), // keep future/current periods
          { from: awayFrom, to: awayTo, reason: awayReason || "Away" }
        ];
      }

      await updateDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "members", editing.id),
        {
          mobilityStatus: mobStatus,
          awayPeriods:    updatedAway,
          schoolName:     schoolName.trim() || null,
          homeCity:       homeCity.trim() || null,
          mobilityUpdatedAt: new Date().toISOString(),
        }
      );

      setMembers(prev => prev.map(m => m.id === editing.id
        ? { ...m, mobilityStatus: mobStatus, awayPeriods: updatedAway, schoolName, homeCity }
        : m));
      setEditModal(false);
      Alert.alert("✅ Saved", `${editing.name}'s mobility status updated.`);
    } catch (e) {
      Alert.alert("Error", "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const removeAwayPeriod = async (member, periodIndex) => {
    const updated = (member.awayPeriods || []).filter((_, i) => i !== periodIndex);
    await updateDoc(
      doc(db, "organizations", organizationId, "entities", entityId, "members", member.id),
      { awayPeriods: updated }
    );
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, awayPeriods: updated } : m));
  };

  const filtered = members.filter(m => {
    const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase());
    if (filter === "all") return matchSearch;
    if (filter === "away") return matchSearch && isMemberAway(m, today);
    if (filter === "seasonal") return matchSearch && m.mobilityStatus === MOBILITY_STATUS.SEASONAL;
    if (filter === "transient") return matchSearch && m.mobilityStatus === MOBILITY_STATUS.TRANSIENT;
    if (filter === "visiting") return matchSearch && m.mobilityStatus === MOBILITY_STATUS.VISITING;
    return matchSearch;
  });

  const awayCount      = members.filter(m => isMemberAway(m, today)).length;
  const seasonalCount  = members.filter(m => m.mobilityStatus === MOBILITY_STATUS.SEASONAL).length;
  const trueCount      = trueLocalMembers(members, today).length;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Member Mobility"
        subtitle="Track transient & seasonal members"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* STATS */}
      <View style={styles.statsRow}>
        <StatBox label="Total Members" value={members.length} color="#4B3F72" />
        <StatBox label="True Local" value={trueCount} color="#27ae60"
          sub="In city today" />
        <StatBox label="Away Now" value={awayCount} color="#F39C12" />
        <StatBox label="Seasonal" value={seasonalCount} color="#0984E3" />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="bulb-outline" size={13} color="#4B3F72" />
        <Text style={styles.infoBoxText}>
          <Text style={{ fontWeight: "800" }}>True Local: {trueCount}</Text> members are
          expected in church today. Away members are excluded from attendance rates and
          absence alerts automatically.
        </Text>
      </View>

      {/* SEARCH + FILTER */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={15} color="#aaa" />
        <TextInput style={styles.searchInput} placeholder="Search members…"
          value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
        <View style={styles.filterRow}>
          {[
            { key: "all",       label: "All" },
            { key: "away",      label: `Away (${awayCount})` },
            { key: "seasonal",  label: "Seasonal" },
            { key: "transient", label: "Transient" },
            { key: "visiting",  label: "Visiting" },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#4B3F72" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {filtered.map(member => {
            const cfg    = getMobilityLabel(member.mobilityStatus);
            const away   = isMemberAway(member, today);
            const periods = (member.awayPeriods || []).filter(p => p.to >= today);

            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberCardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(member.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {away && (
                        <View style={styles.awayBadge}>
                          <Text style={styles.awayBadgeText}>Away</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.mobilityPill, { backgroundColor: cfg.color + "20" }]}>
                      <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                      <Text style={[styles.mobilityPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {member.schoolName && (
                      <Text style={styles.memberSub}>🎓 {member.schoolName}</Text>
                    )}
                    {member.homeCity && (
                      <Text style={styles.memberSub}>🏠 Home: {member.homeCity}</Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(member)}>
                    <Ionicons name="pencil-outline" size={14} color="#4B3F72" />
                  </TouchableOpacity>
                </View>

                {/* Away periods */}
                {periods.map((p, i) => (
                  <View key={i} style={styles.awayPeriodRow}>
                    <Ionicons name="calendar-outline" size={12} color="#F39C12" />
                    <Text style={styles.awayPeriodText}>
                      {p.from} → {p.to}: {p.reason}
                    </Text>
                    <TouchableOpacity onPress={() => removeAwayPeriod(member, i)}>
                      <Ionicons name="close-circle" size={14} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#ddd" />
              <Text style={styles.emptyText}>No members match this filter</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* EDIT MODAL */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: "85%" }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editing?.name}</Text>
              <Text style={styles.modalSub}>Set mobility status and away periods</Text>

              <Text style={styles.fieldLabel}>Membership Type</Text>
              {Object.entries(MOBILITY_LABELS).map(([key, cfg]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.statusOption, mobStatus === key && styles.statusOptionActive]}
                  onPress={() => setMobStatus(key)}
                >
                  <Ionicons name={cfg.icon} size={16} color={mobStatus === key ? "#4B3F72" : "#aaa"} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusOptionName, mobStatus === key && { color: "#4B3F72" }]}>
                      {cfg.label}
                    </Text>
                    <Text style={styles.statusOptionDesc}>
                      {key === "permanent"  && "Always locally based. Fully counted in all attendance metrics."}
                      {key === "seasonal"   && "Away during known periods (students, seasonal workers). Excluded from absence alerts when away."}
                      {key === "transient"  && "Has moved away but not formally transferred. Not counted in local quorum."}
                      {key === "visiting"   && "Attending temporarily from another congregation. Welcome but not counted in local metrics."}
                    </Text>
                  </View>
                  <View style={[styles.radio, mobStatus === key && styles.radioActive]}>
                    {mobStatus === key && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}

              {mobStatus === MOBILITY_STATUS.SEASONAL && (
                <>
                  <Text style={styles.fieldLabel}>School / Institution</Text>
                  <TextInput style={styles.input} value={schoolName} onChangeText={setSchoolName}
                    placeholder="e.g. University of Ghana, Legon" />
                  <Text style={styles.fieldLabel}>Home City / Town</Text>
                  <TextInput style={styles.input} value={homeCity} onChangeText={setHomeCity}
                    placeholder="e.g. Kumasi" />
                </>
              )}

              {mobStatus === MOBILITY_STATUS.TRANSIENT && (
                <>
                  <Text style={styles.fieldLabel}>New City / Town</Text>
                  <TextInput style={styles.input} value={homeCity} onChangeText={setHomeCity}
                    placeholder="Where they moved to" />
                </>
              )}

              <Text style={styles.fieldLabel}>Add Away Period (optional)</Text>
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabel}>From</Text>
                  <TextInput style={styles.input} value={awayFrom} onChangeText={setAwayFrom}
                    placeholder="YYYY-MM-DD" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabel}>To</Text>
                  <TextInput style={styles.input} value={awayTo} onChangeText={setAwayTo}
                    placeholder="YYYY-MM-DD" />
                </View>
              </View>
              <TextInput style={styles.input} value={awayReason} onChangeText={setAwayReason}
                placeholder="Reason (e.g. University recess, Work posting)" />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
                  onPress={saveStatus} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.white}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModal(false)}>
                  <Text style={styles.white}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatBox({ label, value, color, sub }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  statsRow: { flexDirection: "row", backgroundColor: "#4B3F72", paddingVertical: 12 },
  statBox: { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.15)" },
  statValue: { fontSize: 20, fontWeight: "900", color: "#fff" },
  statLabel: { fontSize: 9, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: "700", marginTop: 2 },
  statSub: { fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", padding: 12, margin: 12, borderRadius: 10 },
  infoBoxText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 1 },
  searchInput: { flex: 1, fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  filterChipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  filterChipText: { fontSize: 11, color: "#888", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  body: { padding: 12, paddingBottom: 60 },
  memberCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1 },
  memberCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "800", color: "#4B3F72" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  memberName: { fontSize: 14, fontWeight: "700", color: "#222" },
  awayBadge: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  awayBadgeText: { fontSize: 9, color: "#856404", fontWeight: "800" },
  mobilityPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 3 },
  mobilityPillText: { fontSize: 10, fontWeight: "700" },
  memberSub: { fontSize: 11, color: "#888", marginTop: 2 },
  editBtn: { backgroundColor: "#EEF0FA", borderRadius: 8, padding: 7 },
  awayPeriodRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF9EC", borderRadius: 8, padding: 7, marginTop: 6 },
  awayPeriodText: { flex: 1, fontSize: 11, color: "#856404" },
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#222", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#888", marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 12 },
  statusOption: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#eee", marginBottom: 6 },
  statusOptionActive: { borderColor: "#4B3F72", backgroundColor: "#fafafe" },
  statusOptionName: { fontSize: 13, fontWeight: "700", color: "#333" },
  statusOptionDesc: { fontSize: 11, color: "#888", marginTop: 2, lineHeight: 15 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center", marginTop: 2 },
  radioActive: { borderColor: "#4B3F72" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4B3F72" },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 6 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateLabel: { fontSize: 11, color: "#aaa", marginBottom: 4 },
  modalBtnRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  modalSaveBtn: { flex: 1, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  modalCancelBtn: { flex: 1, backgroundColor: "#aaa", padding: 12, borderRadius: 10, alignItems: "center" },
  white: { color: "#fff", fontWeight: "700" },
});