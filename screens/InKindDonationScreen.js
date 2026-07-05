// screens/InKindDonationScreen.js
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
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp
} from "firebase/firestore";

import AppHeader from "../components/AppHeader";
import { hasPermission } from "../constants/permissions";
import {
  INKIND_CATEGORIES, CONDITION_OPTIONS, DONOR_TYPES, findCategory
} from "../constants/inKindCategories";
import { generateInKindReceipt } from "../utils/receiptGenerator";

export default function InKindDonationScreen({ route }) {
  const navigation = useNavigation();

  const viewerName        = route?.params?.viewerName        || "Staff";
  const viewerUid         = route?.params?.viewerUid         || null;
  const viewerPermissions = route?.params?.viewerPermissions || [];
  const canAcknowledge    = hasPermission({ permissions: viewerPermissions }, "manage_donations");

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;
  const churchName     = activeEntity?.name || "Church";

  // ── ITEM DETAILS ──
  const [category,    setCategory]    = useState(null);
  const [itemName,    setItemName]    = useState("");
  const [quantity,    setQuantity]    = useState("1");
  const [unit,        setUnit]        = useState("");
  const [condition,   setCondition]   = useState("new");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [description, setDescription] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [dateReceived, setDateReceived] = useState(
    new Date().toISOString().split("T")[0]
  );

  // ── DONOR ──
  const [donorType,    setDonorType]    = useState("member");
  const [donors,       setDonors]       = useState([]); // [{ id, name, type }]
  const [donorModal,   setDonorModal]   = useState(false);
  const [externalName, setExternalName] = useState("");

  // ── MEMBER/GROUP SEARCH ──
  const [members,     setMembers]     = useState([]);
  const [groups,      setGroups]      = useState([]);
  const [ministries,  setMinistries]  = useState([]);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [dataLoaded,  setDataLoaded]  = useState(false);

  // ── SUBMIT ──
  const [selfAcknowledge, setSelfAcknowledge] = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [successModal,    setSuccessModal]    = useState(false);
  const [savedRecord,     setSavedRecord]     = useState(null);
  const [generatingPDF,   setGeneratingPDF]   = useState(false);

  // ── HISTORY ──
  const [history, setHistory] = useState([]);
  const [tab,     setTab]     = useState("record"); // record | history | pending

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;
    loadPeopleData();
    loadHistory();
  }, [organizationId, entityId]);

  // ── Auto-set unit when category changes ──
  useEffect(() => {
    if (category?.units?.length > 0) setUnit(category.units[0]);
  }, [category]);

  const loadPeopleData = async () => {
    try {
      const [mSnap, gSnap] = await Promise.all([
        getDocs(collection(db, "organizations", organizationId, "entities", entityId, "members")),
        getDocs(collection(db, "organizations", organizationId, "entities", entityId, "groups")
        ).catch(() => ({ docs: [] })), // groups may not exist yet
      ]);

      setMembers(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const groupList = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(groupList.filter(g => !g.isMinistry));
      setMinistries(groupList.filter(g => g.isMinistry));
      setDataLoaded(true);
    } catch (e) {
      console.log("❌ loadPeopleData:", e);
      setDataLoaded(true);
    }
  };

  const loadHistory = async () => {
    if (!organizationId || !entityId) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, "organizations", organizationId, "entities", entityId, "inkind_donations")
        )
      );
      setHistory(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      );
    } catch (e) {
      console.log("❌ loadHistory:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // DONOR SEARCH
  // ─────────────────────────────────────────────────────────────────
  const sourceList = () => {
    if (donorType === "member") return members;
    if (donorType === "group") return groups;
    if (donorType === "ministry") return ministries;
    return [];
  };

  const filtered = sourceList().filter(p =>
    !searchTerm || (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addDonor = (person) => {
    if (donors.some(d => d.id === person.id)) return; // already added
    setDonors(prev => [...prev, { id: person.id, name: person.name, type: donorType }]);
    setSearchTerm("");
  };

  const removeDonor = (id) => setDonors(prev => prev.filter(d => d.id !== id));

  // ─────────────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!category) { Alert.alert("Required", "Select an item category."); return; }
    if (!itemName.trim()) { Alert.alert("Required", "Enter the item name."); return; }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert("Required", "Enter a valid quantity.");
      return;
    }
    if (donorType !== "anonymous" && donorType !== "external" && donors.length === 0) {
      Alert.alert("Required", "Add at least one donor, or select Anonymous.");
      return;
    }
    if (donorType === "external" && !externalName.trim()) {
      Alert.alert("Required", "Enter the external donor's name.");
      return;
    }
    if (!organizationId || !entityId) return;

    setSubmitting(true);
    try {
      const acknowledged = canAcknowledge && selfAcknowledge;
      const cat = findCategory(category.key);

      const payload = {
        // Item
        categoryKey:    category.key,
        categoryLabel:  category.label,
        itemName:       itemName.trim(),
        quantity:       Number(quantity),
        unit,
        condition,
        conditionLabel: CONDITION_OPTIONS.find(c => c.key === condition)?.label || condition,
        description:    description.trim(),
        locationNote:   locationNote.trim(),
        estimatedValue: estimatedValue ? Number(estimatedValue) : null,
        dateReceived,

        // Donors
        donorType,
        donors: donorType === "anonymous"
          ? [{ id: "anonymous", name: "Anonymous", type: "anonymous" }]
          : donorType === "external"
            ? [{ id: "external", name: externalName.trim(), type: "external" }]
            : donors,
        donorSummary: donorType === "anonymous"
          ? "Anonymous"
          : donorType === "external"
            ? externalName.trim()
            : donors.map(d => d.name).join(", "),

        // Meta
        recordedBy:      viewerName,
        organizationId,
        entityId,
        status:          acknowledged ? "acknowledged" : "pending",
        createdAt:       new Date().toISOString(),

        ...(acknowledged && {
          acknowledgedByName: viewerName,
          acknowledgedAt:     new Date().toISOString().split("T")[0],
        }),
      };

      const ref = await addDoc(
        collection(db, "organizations", organizationId, "entities", entityId, "inkind_donations"),
        payload
      );

      setSavedRecord({ id: ref.id, ...payload });
      setSuccessModal(true);
      await loadHistory();

      // Reset form
      setCategory(null);
      setItemName("");
      setQuantity("1");
      setUnit("");
      setCondition("new");
      setEstimatedValue("");
      setDescription("");
      setLocationNote("");
      setDonors([]);
      setExternalName("");
      setSelfAcknowledge(false);

    } catch (e) {
      console.log("❌ handleSubmit inkind:", e);
      Alert.alert("Error", "Could not record this donation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const acknowledge = async (item) => {
    if (!canAcknowledge) {
      Alert.alert("Not Authorized", "You don't have permission to acknowledge donations.");
      return;
    }
    try {
      await updateDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "inkind_donations", item.id),
        {
          status:             "acknowledged",
          acknowledgedByName: viewerName,
          acknowledgedAt:     new Date().toISOString().split("T")[0],
        }
      );
      await loadHistory();
      Alert.alert("✅ Acknowledged", `${item.itemName} donation confirmed.`);
    } catch (e) {
      Alert.alert("Error", "Could not acknowledge.");
    }
  };

  const handlePDF = async (record) => {
  setGeneratingPDF(true);

  try {
    console.log("RECORD:", record);

    await generateInKindReceipt(
      record,
      churchName
    );

  } catch (e) {
    console.log("PDF ERROR:", e);

    Alert.alert(
      "Error",
      String(e?.message || e)
    );

  } finally {
    setGeneratingPDF(false);
  }
};

  const acknowledgedItems = history.filter(h => h.status === "acknowledged");
  const pendingItems      = history.filter(h => h.status === "pending");

  const totalEstimated = acknowledgedItems.reduce(
    (s, h) => s + (h.estimatedValue || 0), 0
  );

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppHeader
        title="In-Kind Donations"
        subtitle="Material & non-cash contributions"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* SUMMARY BANNER */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{acknowledgedItems.length}</Text>
          <Text style={styles.summaryLabel}>Confirmed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: "#F39C12" }]}>{pendingItems.length}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: "#27ae60", fontSize: 13 }]}>
            {totalEstimated > 0 ? `GH₵${totalEstimated.toLocaleString()}` : "—"}
          </Text>
          <Text style={styles.summaryLabel}>Est. Value</Text>
        </View>
      </View>

      {/* FINTECH TABS */}
      <View style={styles.tabRow}>
        {[
          { key: "record",  label: "Record",  icon: "add-circle-outline",   color: "#4B3F72" },
          { key: "history", label: "History", icon: "list-outline",          color: "#0984E3" },
          ...(canAcknowledge ? [{ key: "pending", label: "Pending", icon: "hourglass-outline", color: "#F39C12" }] : []),
        ].map(t => {
          const active = tab === t.key;
          const badge  = t.key === "pending" ? pendingItems.length : 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => setTab(t.key)}
            >
              <View style={[styles.tabCircle, { backgroundColor: active ? t.color : "#fff" },
                !active && { borderWidth: 1.5, borderColor: "#eee" }]}>
                <Ionicons name={t.icon} size={18} color={active ? "#fff" : t.color} />
                {badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, active && { color: t.color, fontWeight: "800" }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════════ RECORD TAB ══════════════════ */}
      {tab === "record" && (
        <ScrollView contentContainerStyle={styles.body}>

          {/* CATEGORY GRID */}
          <Text style={styles.sectionLabel}>Category *</Text>
          <View style={styles.categoryGrid}>
            {INKIND_CATEGORIES.map(cat => {
              const active = category?.key === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.categoryItem}
                  onPress={() => setCategory(cat)}
                >
                  <View style={[styles.categoryCircle,
                    { backgroundColor: active ? cat.color : "#fff" },
                    !active && { borderWidth: 1.5, borderColor: "#eee" }]}>
                    <Ionicons name={cat.icon} size={18} color={active ? "#fff" : cat.color} />
                  </View>
                  <Text style={[styles.categoryLabel, active && { color: cat.color, fontWeight: "800" }]}>
                    {cat.label.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ITEM NAME */}
          <Text style={styles.sectionLabel}>Item Name *</Text>
          {category?.examples?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={styles.examplesRow}>
                {category.examples.map(ex => (
                  <TouchableOpacity
                    key={ex}
                    style={[styles.exampleChip, itemName === ex && styles.exampleChipActive]}
                    onPress={() => setItemName(ex)}
                  >
                    <Text style={[styles.exampleChipText, itemName === ex && { color: "#fff" }]}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
          <TextInput
            style={styles.input}
            placeholder={category ? `e.g. ${category.examples?.[0] || "Item name"}` : "Select a category first"}
            value={itemName}
            onChangeText={setItemName}
          />

          {/* QUANTITY + UNIT */}
          <View style={styles.qtyRow}>
            <View style={styles.qtyField}>
              <Text style={styles.sectionLabel}>Quantity *</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.unitField}>
              <Text style={styles.sectionLabel}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {(category?.units || ["Units", "Pieces", "Kg", "Litres"]).map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.chip, unit === u && styles.chipActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* CONDITION */}
          <Text style={styles.sectionLabel}>Condition</Text>
          <View style={styles.chipRow}>
            {CONDITION_OPTIONS.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, condition === c.key && { backgroundColor: c.color, borderColor: c.color }]}
                onPress={() => setCondition(c.key)}
              >
                <Text style={[styles.chipText, condition === c.key && { color: "#fff" }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ESTIMATED VALUE */}
          <Text style={styles.sectionLabel}>Estimated Value (GH₵, optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Market value estimate — for records only"
            keyboardType="numeric"
            value={estimatedValue}
            onChangeText={setEstimatedValue}
          />
          <Text style={styles.hint}>
            This doesn't change the donation to a cash transaction — it's recorded separately as in-kind for accurate reporting.
          </Text>

          {/* DONOR(S) */}
          <Text style={styles.sectionLabel}>Donated By *</Text>

          {/* Donor type selector */}
          <View style={styles.donorTypeRow}>
            {DONOR_TYPES.map(dt => (
              <TouchableOpacity
                key={dt.key}
                style={[styles.donorTypeChip, donorType === dt.key && styles.donorTypeChipActive]}
                onPress={() => { setDonorType(dt.key); setDonors([]); setExternalName(""); }}
              >
                <Ionicons
                  name={dt.icon}
                  size={12}
                  color={donorType === dt.key ? "#fff" : "#555"}
                />
                <Text style={[styles.donorTypeChipText, donorType === dt.key && { color: "#fff" }]}>
                  {dt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Donor list or external name field */}
          {(donorType === "member" || donorType === "group" || donorType === "ministry") && (
            <>
              {/* Added donors */}
              {donors.length > 0 && (
                <View style={styles.donorList}>
                  {donors.map(d => (
                    <View key={d.id} style={styles.donorTag}>
                      <Ionicons name="person-circle-outline" size={14} color="#4B3F72" />
                      <Text style={styles.donorTagText}>{d.name}</Text>
                      <TouchableOpacity onPress={() => removeDonor(d.id)}>
                        <Ionicons name="close-circle" size={14} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add donor button */}
              <TouchableOpacity
                style={styles.addDonorBtn}
                onPress={() => { setSearchTerm(""); setDonorModal(true); }}
              >
                <Ionicons name="add-circle-outline" size={15} color="#4B3F72" />
                <Text style={styles.addDonorBtnText}>
                  Add {donorType === "member" ? "Member" : donorType === "group" ? "Group" : "Ministry"}
                </Text>
              </TouchableOpacity>

              {donors.length > 1 && (
                <Text style={styles.hint}>
                  Multiple donors recorded — this contribution will appear in each of their giving histories.
                </Text>
              )}
            </>
          )}

          {donorType === "external" && (
            <TextInput
              style={styles.input}
              placeholder="Name of company, organization, or individual"
              value={externalName}
              onChangeText={setExternalName}
            />
          )}

          {donorType === "anonymous" && (
            <View style={styles.infoBox}>
              <Ionicons name="eye-off-outline" size={13} color="#4B3F72" />
              <Text style={styles.infoBoxText}>
                Anonymous donations are recorded without linking to any member or group.
              </Text>
            </View>
          )}

          {/* DESCRIPTION */}
          <Text style={styles.sectionLabel}>Description / Specification</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: "top" }]}
            placeholder="e.g. 42.5 grade Portland cement, 50kg bags"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* WHERE IT WENT */}
          <Text style={styles.sectionLabel}>Received / Stored At</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Site office, Church store, Vestry"
            value={locationNote}
            onChangeText={setLocationNote}
          />

          {/* DATE */}
          <Text style={styles.sectionLabel}>Date Received</Text>
          <TextInput
            style={styles.input}
            value={dateReceived}
            onChangeText={setDateReceived}
            placeholder="YYYY-MM-DD"
          />

          {/* ACKNOWLEDGMENT */}
          {canAcknowledge && (
            <TouchableOpacity
              style={styles.ackRow}
              onPress={() => setSelfAcknowledge(p => !p)}
            >
              <Ionicons
                name={selfAcknowledge ? "checkbox" : "square-outline"}
                size={20}
                color={selfAcknowledge ? "#27ae60" : "#999"}
              />
              <Text style={styles.ackText}>
                I am physically confirming I have received and verified this donation
              </Text>
            </TouchableOpacity>
          )}

          {!canAcknowledge && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={13} color="#4B3F72" />
              <Text style={styles.infoBoxText}>
                This will be recorded as pending until confirmed by an authorized officer who physically verifies the items.
              </Text>
            </View>
          )}

          {/* SUMMARY PREVIEW */}
          {category && itemName && quantity && (
            <View style={styles.previewCard}>
              <View style={[styles.previewIcon, { backgroundColor: (category?.color || "#4B3F72") + "20" }]}>
                <Ionicons name={category?.icon || "gift-outline"} size={20} color={category?.color || "#4B3F72"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{quantity} {unit} of {itemName}</Text>
                <Text style={styles.previewSub}>
                  {CONDITION_OPTIONS.find(c => c.key === condition)?.label}
                  {estimatedValue ? `  ·  Est. GH₵${Number(estimatedValue).toLocaleString()}` : ""}
                </Text>
                {donors.length > 0 && (
                  <Text style={styles.previewDonors}>From: {donors.map(d => d.name).join(", ")}</Text>
                )}
              </View>
            </View>
          )}

          {/* SUBMIT */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Record In-Kind Donation</Text>
                </>}
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* ══════════════════ HISTORY TAB ══════════════════ */}
      {tab === "history" && (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>Confirmed In-Kind Donations</Text>
          {acknowledgedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={40} color="#ddd" />
              <Text style={styles.emptyText}>No confirmed in-kind donations yet</Text>
            </View>
          ) : (
            acknowledgedItems.map(item => (
              <InKindCard
                key={item.id}
                item={item}
                onReceipt={() => handlePDF(item)}
                generatingPDF={generatingPDF}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ══════════════════ PENDING TAB ══════════════════ */}
      {tab === "pending" && canAcknowledge && (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>Awaiting Physical Confirmation</Text>
          {pendingItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={40} color="#ddd" />
              <Text style={styles.emptyText}>All donations confirmed</Text>
            </View>
          ) : (
            pendingItems.map(item => (
              <InKindCard
                key={item.id}
                item={item}
                onAcknowledge={() => acknowledge(item)}
                onReceipt={() => handlePDF(item)}
                generatingPDF={generatingPDF}
                showAcknowledge
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ══ DONOR SEARCH MODAL ══ */}
      <Modal visible={donorModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>
              Add {donorType === "member" ? "Member" : donorType === "group" ? "Group" : "Ministry"}
            </Text>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={15} color="#aaa" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name…"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoFocus
              />
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {filtered.length === 0 ? (
                <Text style={styles.emptyText}>
                  {dataLoaded ? "No results found" : "Loading…"}
                </Text>
              ) : (
                filtered.map(person => {
                  const already = donors.some(d => d.id === person.id);
                  return (
                    <TouchableOpacity
                      key={person.id}
                      style={[styles.searchResult, already && { opacity: 0.4 }]}
                      onPress={() => { if (!already) { addDonor(person); setDonorModal(false); } }}
                      disabled={already}
                    >
                      <View style={styles.searchResultAvatar}>
                        <Text style={styles.searchResultInitials}>
                          {(person.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchResultName}>{person.name}</Text>
                        <Text style={styles.searchResultSub}>
                          {person.ministry || person.description || ""}
                        </Text>
                      </View>
                      {already
                        ? <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                        : <Ionicons name="add-circle-outline" size={16} color="#4B3F72" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity onPress={() => setDonorModal(false)}>
              <Text style={styles.cancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ SUCCESS MODAL ══ */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#27ae60" />
            </View>
            <Text style={styles.modalTitle}>Donation Recorded</Text>
            {savedRecord && (
              <Text style={styles.modalSub}>
                {savedRecord.quantity} {savedRecord.unit} of{" "}
                <Text style={{ fontWeight: "800" }}>{savedRecord.itemName}</Text>
                {savedRecord.status === "pending"
                  ? " recorded and awaiting physical confirmation by an authorized officer."
                  : " recorded and confirmed."}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.pdfBtn, generatingPDF && { opacity: 0.6 }]}
              onPress={() => savedRecord && handlePDF(savedRecord)}
              disabled={generatingPDF}
            >
              {generatingPDF
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="receipt-outline" size={15} color="#fff" />
                    <Text style={styles.pdfBtnText}>Generate Receipt (PDF)</Text>
                  </>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSuccessModal(false); setSavedRecord(null); }}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// IN-KIND CARD
// ─────────────────────────────────────────────────────────────────
function InKindCard({ item, onAcknowledge, onReceipt, generatingPDF, showAcknowledge }) {
  const cat = findCategory(item.categoryKey);
  const cond = CONDITION_OPTIONS.find(c => c.key === item.condition);

  return (
    <View style={styles.ikCard}>
      <View style={[styles.ikCardStripe, { backgroundColor: cat.color }]} />
      <View style={styles.ikCardBody}>
        <View style={styles.ikCardHeader}>
          <View style={[styles.ikIcon, { backgroundColor: cat.color + "20" }]}>
            <Ionicons name={cat.icon} size={16} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ikItemName}>{item.itemName}</Text>
            <Text style={styles.ikQty}>{item.quantity} {item.unit}</Text>
          </View>
          <View style={styles.ikRightCol}>
            {item.estimatedValue ? (
              <Text style={[styles.ikValue, { color: "#27ae60" }]}>
                GH₵{Number(item.estimatedValue).toLocaleString()}
              </Text>
            ) : <Text style={styles.ikValueEmpty}>No est.</Text>}
            {cond && (
              <View style={[styles.ikCondBadge, { backgroundColor: cond.color + "20" }]}>
                <Text style={[styles.ikCondText, { color: cond.color }]}>{cond.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Donors */}
        <View style={styles.ikDonorRow}>
          <Ionicons name="person-outline" size={11} color="#aaa" />
          <Text style={styles.ikDonorText}>{item.donorSummary}</Text>
        </View>

        {item.description ? (
          <Text style={styles.ikDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {item.locationNote ? (
          <View style={styles.ikLocationRow}>
            <Ionicons name="location-outline" size={11} color="#aaa" />
            <Text style={styles.ikLocationText}>{item.locationNote}</Text>
          </View>
        ) : null}

        <View style={styles.ikFooter}>
          <Text style={styles.ikDate}>{item.dateReceived}</Text>
          {item.acknowledgedByName
            ? <Text style={styles.ikAck}>✓ {item.acknowledgedByName}</Text>
            : <Text style={[styles.ikAck, { color: "#F39C12" }]}>⏳ Pending confirmation</Text>}
        </View>

        <View style={styles.ikActions}>
          {showAcknowledge && onAcknowledge && (
            <TouchableOpacity style={styles.ikAckBtn} onPress={onAcknowledge}>
              <Ionicons name="checkmark-circle-outline" size={13} color="#fff" />
              <Text style={styles.ikAckBtnText}>Confirm Receipt</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.ikReceiptBtn}
            onPress={onReceipt}
            disabled={generatingPDF}
          >
            {generatingPDF
              ? <ActivityIndicator size="small" color="#4B3F72" />
              : <>
                  <Ionicons name="receipt-outline" size={12} color="#4B3F72" />
                  <Text style={styles.ikReceiptBtnText}>Receipt</Text>
                </>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { padding: 14, paddingBottom: 70 },

  summaryBanner: { flexDirection: "row", backgroundColor: "#4B3F72", paddingVertical: 14, paddingHorizontal: 20 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 20, fontWeight: "900", color: "#fff" },
  summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "700", textTransform: "uppercase", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 4 },

  tabRow: { flexDirection: "row", justifyContent: "center", gap: 24, backgroundColor: "#fff", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabItem: { alignItems: "center" },
  tabCircle: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  tabBadge: { position: "absolute", top: -3, right: -3, backgroundColor: "#e74c3c", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", paddingHorizontal: 2 },
  tabBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  tabLabel: { fontSize: 10, color: "#888", marginTop: 5, fontWeight: "600" },

  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", textTransform: "uppercase", marginBottom: 8, marginTop: 14 },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  categoryItem: { alignItems: "center", width: 64 },
  categoryCircle: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  categoryLabel: { fontSize: 9, color: "#666", marginTop: 5, fontWeight: "600", textAlign: "center" },

  examplesRow: { flexDirection: "row", gap: 6, paddingBottom: 2 },
  exampleChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  exampleChipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  exampleChipText: { fontSize: 11, color: "#555", fontWeight: "600" },

  qtyRow: { flexDirection: "row", gap: 10 },
  qtyField: { width: 90 },
  unitField: { flex: 1 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "transparent" },
  chipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  chipText: { fontSize: 11, color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#eee", fontSize: 14, marginBottom: 4 },
  hint: { fontSize: 10, color: "#aaa", marginBottom: 4, lineHeight: 14 },

  donorTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  donorTypeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0" },
  donorTypeChipActive: { backgroundColor: "#4B3F72" },
  donorTypeChipText: { fontSize: 10, color: "#555", fontWeight: "600" },

  donorList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  donorTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EEF0FA", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  donorTagText: { fontSize: 12, color: "#4B3F72", fontWeight: "600" },

  addDonorBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  addDonorBtnText: { fontSize: 13, color: "#4B3F72", fontWeight: "700" },

  ackRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
  ackText: { flex: 1, fontSize: 12, color: "#333", fontWeight: "600" },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 12, marginTop: 6, marginBottom: 4 },
  infoBoxText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },

  previewCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1.5, borderColor: "#4B3F72" },
  previewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  previewTitle: { fontSize: 14, fontWeight: "800", color: "#222" },
  previewSub: { fontSize: 12, color: "#888", marginTop: 2 },
  previewDonors: { fontSize: 11, color: "#4B3F72", marginTop: 2, fontWeight: "600" },

  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4B3F72", borderRadius: 14, padding: 16, marginTop: 16 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // In-kind cards
  ikCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", elevation: 1 },
  ikCardStripe: { width: 4 },
  ikCardBody: { flex: 1, padding: 12 },
  ikCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  ikIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ikItemName: { fontSize: 14, fontWeight: "800", color: "#222" },
  ikQty: { fontSize: 12, color: "#888", marginTop: 1 },
  ikRightCol: { alignItems: "flex-end", gap: 4 },
  ikValue: { fontSize: 14, fontWeight: "800" },
  ikValueEmpty: { fontSize: 11, color: "#ccc" },
  ikCondBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  ikCondText: { fontSize: 9, fontWeight: "700" },
  ikDonorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  ikDonorText: { fontSize: 11, color: "#555", fontWeight: "600" },
  ikDesc: { fontSize: 11, color: "#888", marginBottom: 4 },
  ikLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  ikLocationText: { fontSize: 11, color: "#aaa" },
  ikFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  ikDate: { fontSize: 10, color: "#bbb" },
  ikAck: { fontSize: 10, color: "#27ae60", fontWeight: "700" },
  ikActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  ikAckBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#27ae60", borderRadius: 8, padding: 9 },
  ikAckBtnText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  ikReceiptBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  ikReceiptBtnText: { fontSize: 11, color: "#4B3F72", fontWeight: "700" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13, textAlign: "center" },

  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#222", marginBottom: 14 },
  modalSub: { fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 16 },
  cancelText: { textAlign: "center", color: "#888", padding: 14, fontWeight: "600" },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f4f6fb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13 },
  searchResult: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#f0f0f0", marginBottom: 6 },
  searchResultAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  searchResultInitials: { fontSize: 12, fontWeight: "800", color: "#4B3F72" },
  searchResultName: { fontSize: 13, fontWeight: "700", color: "#222" },
  searchResultSub: { fontSize: 11, color: "#aaa", marginTop: 1 },

  successIcon: { alignItems: "center", marginBottom: 10 },
  pdfBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#4B3F72", borderRadius: 12, padding: 13, marginBottom: 8 },
  pdfBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});