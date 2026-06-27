import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from "firebase/firestore";

const AMOUNTS = ["10", "20", "50", "100", "200", "500"];

const CATEGORIES = [
  { label: "Tithe",       icon: "leaf-outline",       color: "#4F46E5" },
  { label: "Offering",    icon: "gift-outline",        color: "#059669" },
  { label: "Building",    icon: "business-outline",    color: "#D97706" },
  { label: "Missions",    icon: "earth-outline",       color: "#0891B2" },
  { label: "Welfare",     icon: "heart-outline",       color: "#E11D48" },
  { label: "Other",       icon: "ellipsis-horizontal", color: "#7C3AED" },
];


export default function DonateScreen({ route, navigation }) {
  // memberId passed when navigating from MembersScreen
  // If navigated from HomeScreen quick action, memberId is undefined → general donation
  const memberId   = route?.params?.memberId   || null;
  const memberName = route?.params?.memberName || null;

  const [selectedCategory, setSelectedCategory] = useState("Offering");
  const [selectedAmount,   setSelectedAmount]   = useState("");
  const [customAmount,     setCustomAmount]      = useState("");
  const [note,             setNote]             = useState("");
  const [loading,          setLoading]          = useState(false);

  /* DONATION HISTORY — loads member-specific or all */
  const [history,     setHistory]     = useState([]);
  const [historyTab,  setHistoryTab]  = useState("donate"); // "donate" | "history"

  // ✅ FIXED: was reading AsyncStorage("churchId"), a key nothing in the app
  // ever sets. Every other screen uses "activeEntity" → { organizationId,
  // entityId } — that's what's actually populated when a church is selected.
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId || null;
  const entityId       = activeEntity?.entityId       || null;

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) {
        try { setActiveEntity(JSON.parse(data)); } catch (_) {}
      }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;
    loadHistory();
  }, [organizationId, entityId]);

  // ✅ NEW — prefill from a scanned donate QR link (utils/qrLinks.js /
  // utils/qrRouter.js). amount/category are optional; whichever are present
  // get applied, the rest stay at their defaults.
  useEffect(() => {
    const presetAmount   = route?.params?.amount;
    const presetCategory = route?.params?.category;

    if (presetAmount) {
      if (AMOUNTS.includes(String(presetAmount))) {
        setSelectedAmount(String(presetAmount));
        setCustomAmount("");
      } else {
        setCustomAmount(String(presetAmount));
        setSelectedAmount("");
      }
    }

    if (presetCategory) {
      const match = CATEGORIES.find(
        c => c.label.toLowerCase() === String(presetCategory).toLowerCase()
      );
      if (match) setSelectedCategory(match.label);
    }
  }, [route?.params?.amount, route?.params?.category]);

  // ✅ NEW — a donate QR carries the church it was generated for. If this
  // device currently has a DIFFERENT church active, flag it instead of
  // silently recording the gift under the wrong church.
  useEffect(() => {
    const qrEntityId = route?.params?.entityId;
    if (qrEntityId && entityId && qrEntityId !== entityId) {
      Alert.alert(
        "Different Church",
        "This donation link belongs to a different church than the one currently active on this device."
      );
    }
  }, [route?.params?.entityId, entityId]);

  const loadHistory = async () => {
    if (!organizationId || !entityId) return;

    try {
      const contributionsRef = collection(
        db, "organizations", organizationId, "entities", entityId, "contributions"
      );

      const q = memberId
        ? query(contributionsRef, where("memberId", "==", memberId))
        : query(contributionsRef);

      const snap = await getDocs(q);
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistory(data);
    } catch (e) {
      console.log(e);
    }
  };

  const finalAmount = selectedAmount || customAmount;

  const handleDonate = async () => {
    if (!finalAmount || isNaN(Number(finalAmount)) || Number(finalAmount) <= 0) {
      Alert.alert("Invalid amount", "Please enter or select a valid donation amount.");
      return;
    }

    if (!organizationId || !entityId) {
      Alert.alert("Error", "No active church found. Please select a church first.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(
        collection(db, "organizations", organizationId, "entities", entityId, "contributions"),
        {
          memberId:   memberId   || "anonymous",
          memberName: memberName || "Anonymous",
          amount:     Number(finalAmount),
          type:       selectedCategory,
          note:       note.trim(),
          entityId,
          organizationId,
          date:       new Date().toISOString().split("T")[0],
          createdAt:  serverTimestamp(),
        }
      );
      Alert.alert("Thank you! 🙏", `GH₵ ${finalAmount} ${selectedCategory} recorded successfully.`);
      setSelectedAmount(""); setCustomAmount(""); setNote("");
      loadHistory();
    } catch (e) {
      Alert.alert("Error", "Could not save donation. Please try again.");
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const totalGiven = history.reduce((s, h) => s + (h.amount || 0), 0);

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Donate</Text>
          {memberName && <Text style={styles.headerSub}>{memberName}</Text>}
        </View>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillText}>GH₵ {totalGiven.toLocaleString()}</Text>
          <Text style={styles.totalPillLabel}>Total Given</Text>
        </View>
      </View>

      {/* TAB SWITCHER */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, historyTab === "donate" && styles.tabActive]}
          onPress={() => setHistoryTab("donate")}
        >
          <Ionicons name="heart" size={14} color={historyTab === "donate" ? "#4B3F72" : "#aaa"} />
          <Text style={[styles.tabText, historyTab === "donate" && styles.tabTextActive]}>Give</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, historyTab === "history" && styles.tabActive]}
          onPress={() => setHistoryTab("history")}
        >
          <Ionicons name="time" size={14} color={historyTab === "history" ? "#4B3F72" : "#aaa"} />
          <Text style={[styles.tabText, historyTab === "history" && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {historyTab === "donate" ? (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {/* CATEGORY */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.label}
                style={[
                  styles.categoryCard,
                  selectedCategory === cat.label && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.color + "12" }
                ]}
                onPress={() => setSelectedCategory(cat.label)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + "20" }]}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                </View>
                <Text style={[styles.categoryLabel, selectedCategory === cat.label && { color: cat.color, fontWeight: "700" }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AMOUNT PRESETS */}
          <Text style={styles.label}>Amount (GH₵)</Text>
          <View style={styles.amountGrid}>
            {AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[styles.amountBtn, selectedAmount === amt && styles.amountBtnActive]}
                onPress={() => { setSelectedAmount(amt); setCustomAmount(""); }}
              >
                <Text style={[styles.amountText, selectedAmount === amt && styles.amountTextActive]}>
                  {amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CUSTOM AMOUNT */}
          <TextInput
            style={styles.input}
            placeholder="Or enter custom amount"
            keyboardType="numeric"
            value={customAmount}
            onChangeText={v => { setCustomAmount(v); setSelectedAmount(""); }}
          />

          {/* NOTE */}
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: "top" }]}
            placeholder="Add a note..."
            multiline
            value={note}
            onChangeText={setNote}
          />

          {/* SUMMARY */}
          {finalAmount ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                GH₵ <Text style={styles.summaryAmt}>{finalAmount}</Text>  ·  {selectedCategory}
                {memberName ? `  ·  ${memberName}` : ""}
              </Text>
            </View>
          ) : null}

          {/* DONATE BUTTON */}
          <TouchableOpacity
            style={[styles.donateBtn, loading && { opacity: 0.6 }]}
            onPress={handleDonate}
            disabled={loading}
          >
            <Ionicons name="heart" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.donateBtnText}>{loading ? "Saving..." : "Donate Now"}</Text>
          </TouchableOpacity>

        </ScrollView>
      ) : (
        /* HISTORY TAB */
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>
            {memberName ? `${memberName}'s Giving History` : "All Donations"}
          </Text>

          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={42} color="#ccc" />
              <Text style={styles.emptyText}>No donations recorded yet</Text>
            </View>
          ) : (
            <>
              {/* Summary by category */}
              <View style={styles.summaryRow}>
                {CATEGORIES.map(cat => {
                  const total = history.filter(h => h.type === cat.label).reduce((s, h) => s + (h.amount || 0), 0);
                  if (!total) return null;
                  return (
                    <View key={cat.label} style={[styles.summaryChip, { borderColor: cat.color }]}>
                      <Text style={[styles.summaryChipLabel, { color: cat.color }]}>{cat.label}</Text>
                      <Text style={[styles.summaryChipAmt, { color: cat.color }]}>GH₵ {total.toLocaleString()}</Text>
                    </View>
                  );
                })}
              </View>

              {history.map(item => {
                const cat = CATEGORIES.find(c => c.label === item.type) || CATEGORIES[5];
                return (
                  <View key={item.id} style={styles.historyRow}>
                    <View style={[styles.historyIcon, { backgroundColor: cat.color + "18" }]}>
                      <Ionicons name={cat.icon} size={16} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyType}>{item.type}</Text>
                      <Text style={styles.historyDate}>{item.date}{item.note ? `  ·  ${item.note}` : ""}</Text>
                      {!memberName && item.memberName !== "Anonymous" && (
                        <Text style={styles.historyMember}>{item.memberName}</Text>
                      )}
                    </View>
                    <Text style={[styles.historyAmt, { color: cat.color }]}>GH₵ {item.amount?.toLocaleString()}</Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  header: { backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backBtn: { marginRight: 12 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 1 },
  totalPill: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  totalPillText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  totalPillLabel: { color: "rgba(255,255,255,0.7)", fontSize: 9, marginTop: 1 },

  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { fontSize: 13, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#4B3F72" },

  body: { padding: 16, paddingBottom: 60 },

  label: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 10, marginTop: 6 },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  categoryCard: { width: "30%", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 10, gap: 4, borderWidth: 1.5, borderColor: "transparent",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  categoryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  categoryLabel: { fontSize: 11, color: "#555", fontWeight: "600" },

  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  amountBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: "#e0e0e0" },
  amountBtnActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  amountText: { fontSize: 14, fontWeight: "700", color: "#555" },
  amountTextActive: { color: "#fff" },

  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e8e8e8" },

  summaryBox: { backgroundColor: "#EEF2FF", borderRadius: 10, padding: 14, marginBottom: 12, alignItems: "center" },
  summaryText: { fontSize: 13, color: "#4B3F72" },
  summaryAmt: { fontWeight: "800", fontSize: 18 },

  donateBtn: { backgroundColor: "#E11D48", borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4 },
  donateBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13 },

  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  summaryChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  summaryChipLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  summaryChipAmt: { fontSize: 13, fontWeight: "800" },

  historyRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, gap: 12,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyType: { fontSize: 13, fontWeight: "700", color: "#222" },
  historyDate: { fontSize: 11, color: "#888", marginTop: 2 },
  historyMember: { fontSize: 11, color: "#4B3F72", marginTop: 1, fontWeight: "600" },
  historyAmt: { fontSize: 15, fontWeight: "800" },
});