import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, serverTimestamp,onSnapshot
} from "firebase/firestore";

import { PAYMENT_METHODS, MOMO_PROVIDERS, detectMomoProvider, isValidGhanaPhone, findMethod } from "../constants/donationMethods";
import { hasPermission } from "../constants/permissions";
import { generateDonationReceipt } from "../utils/receiptGenerator";

const AMOUNTS = ["10", "20", "50", "100", "200", "500"];

const CATEGORIES = [
  { label: "Tithe",    icon: "leaf-outline",          color: "#4F46E5" },
  { label: "Offering", icon: "gift-outline",          color: "#059669" },
  { label: "Building", icon: "business-outline",      color: "#D97706" },
  { label: "Missions", icon: "earth-outline",         color: "#0891B2" },
  { label: "Welfare",  icon: "heart-outline",         color: "#E11D48" },
  { label: "Other",    icon: "ellipsis-horizontal",   color: "#7C3AED" },
];

export default function DonateScreen({ route, navigation }) {
  const memberId   = route?.params?.memberId   || null;
  const memberName = route?.params?.memberName || null;

  // ⚠️ Same placeholder pattern as MemberProfileScreen — replace with a
  // real Firebase Auth → member lookup once that linkage exists. Until
  // then this is how the screen knows whether the person recording a
  // donation is themselves authorized to acknowledge it.
  const viewerName = route?.params?.viewerName || "Staff";
  const [viewerPermissions] = useState(route?.params?.viewerPermissions || []);
  const canAcknowledge = hasPermission({ permissions: viewerPermissions }, "manage_donations");

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId || null;
  const entityId       = activeEntity?.entityId       || null;
  const churchName     = activeEntity?.name || "Church";

  const [selectedCategory, setSelectedCategory] = useState("Offering");
  const [selectedAmount,   setSelectedAmount]   = useState("");
  const [customAmount,     setCustomAmount]     = useState("");
  const [note,             setNote]             = useState("");
  const [loading,          setLoading]          = useState(false);

  // ✅ NEW — payment method state
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [momoPhone,      setMomoPhone]      = useState("");
  const [bankRef,        setBankRef]        = useState("");
  const [cardRef,        setCardRef]        = useState("");
  const [selfAcknowledge, setSelfAcknowledge] = useState(false);

  const detectedProvider = detectMomoProvider(momoPhone);

  const [history,    setHistory]    = useState([]);
  const [activeTab,  setActiveTab]  = useState("give"); // give | history | pending
  const [generatingReceiptId, setGeneratingReceiptId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) {
        try { setActiveEntity(JSON.parse(data)); } catch (_) {}
      }
    });
  }, []);

  useEffect(() => {
  if (!organizationId || !entityId) return;

  const unsubscribe = loadHistory();

  return () => {
    if (unsubscribe) unsubscribe(); 
  };
}, [organizationId, entityId, memberId]);


  useEffect(() => {
    const presetAmount = route?.params?.amount;
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
      const match = CATEGORIES.find(c => c.label.toLowerCase() === String(presetCategory).toLowerCase());
      if (match) setSelectedCategory(match.label);
    }
  }, [route?.params?.amount, route?.params?.category]);

  useEffect(() => {
    const qrEntityId = route?.params?.entityId;
    if (qrEntityId && entityId && qrEntityId !== entityId) {
      Alert.alert(
        "Different Church",
        "This donation link belongs to a different church than the one currently active on this device."
      );
    }
  }, [route?.params?.entityId, entityId]);

 const loadHistory = () => {
  if (!organizationId || !entityId) return;

  const contributionsRef = collection(
    db,
    "organizations",
    organizationId,
    "entities",
    entityId,
    "contributions"
  );

  const q = memberId
    ? query(contributionsRef, where("memberId", "==", memberId))
    : query(contributionsRef);

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

      setHistory(data);
    },
    (error) => {
      console.log("Realtime error:", error);
    }
  );

  return unsubscribe; // ✅ VERY IMPORTANT
};


  const finalAmount = selectedAmount || customAmount;

  const resetPaymentFields = () => {
    setSelectedMethod("cash");
    setMomoPhone("");
    setBankRef("");
    setCardRef("");
    setSelfAcknowledge(false);
  };

  const handleDonate = async () => {
    if (!finalAmount || isNaN(Number(finalAmount)) || Number(finalAmount) <= 0) {
      Alert.alert("Invalid amount", "Please enter or select a valid donation amount.");
      return;
    }
    if (!organizationId || !entityId) {
      Alert.alert("Error", "No active church found. Please select a church first.");
      return;
    }

    // ✅ Method-specific validation
    if (selectedMethod === "momo") {
      if (!momoPhone.trim() || !isValidGhanaPhone(momoPhone)) {
        Alert.alert("Invalid Number", "Please enter a valid Ghana mobile number (e.g. 024XXXXXXX).");
        return;
      }
    }
    if (selectedMethod === "bank" && !bankRef.trim()) {
      Alert.alert("Reference Required", "Please enter the bank transaction reference.");
      return;
    }
    if (selectedMethod === "card" && !cardRef.trim()) {
      Alert.alert("Reference Required", "Please enter the card payment reference/transaction ID.");
      return;
    }

    if (loading) return; 
     setLoading(true);
    try {
      const methodInfo = findMethod(selectedMethod);

      // ✅ Integrity rule: EVERY donation requires acknowledgment by
      // someone holding manage_donations — regardless of method. The
      // only shortcut is the recorder explicitly self-acknowledging,
      // and that option only appears at all if they actually hold that
      // permission (see selfAcknowledge checkbox below).
      const acknowledged = canAcknowledge && selfAcknowledge;
      const now = new Date();
      const payload = {
        memberId:   memberId   || "anonymous",
        memberName: memberName || "Anonymous",
        amount:     Number(finalAmount),
        type:       selectedCategory,
        note:       note.trim(),
        entityId,
        organizationId,
        date:new Date().toISOString().split("T")[0],
        createdAt:  serverTimestamp(),

        method:       selectedMethod,
        methodLabel:  methodInfo?.label || selectedMethod,
        recordedBy:   viewerName,

        ...(selectedMethod === "momo" && {
          momoPhone: momoPhone.trim(),
          momoProvider: detectedProvider?.label || "Unknown",
        }),
        ...(selectedMethod === "bank" && { reference: bankRef.trim() }),
        ...(selectedMethod === "card" && { reference: cardRef.trim() }),

        status: acknowledged ? "acknowledged" : "pending",
        ...(acknowledged && {
          acknowledgedByName: viewerName,
          acknowledgedAt: new Date().toISOString().split("T")[0],
        }),
      };
    

     const docRef = await addDoc(
  collection(db, "organizations", organizationId, "entities", entityId, "contributions"),
  payload
);

const savedData = { id: docRef.id, ...payload };

// ✅ auto-generate receipt ONLY if acknowledged
if (savedData.status === "acknowledged") {
  try {
  await generateDonationReceipt(
  savedData,
  churchName,
  activeEntity?.logo || null
);


  } catch (e) {
    console.log("Receipt generation failed:", e);
  }
}
      Alert.alert(
        acknowledged ? "Thank You! 🙏" : "Recorded — Awaiting Acknowledgment",
        acknowledged
          ? `GH₵ ${finalAmount} ${selectedCategory} recorded and acknowledged.`
          : `GH₵ ${finalAmount} ${selectedCategory} has been recorded. It will appear in giving history once acknowledged by an authorized officer.`
      );

      setSelectedAmount(""); setCustomAmount(""); setNote("");
      resetPaymentFields();
      loadHistory();
    } catch (e) {
      Alert.alert("Error", "Could not save donation. Please try again.");
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeDonation = async (item) => {
    if (!canAcknowledge) {
      Alert.alert("Not Authorized", "You don't have permission to acknowledge donations.");
      return;
    }
    try {
      await updateDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "contributions", item.id),
        {
          status: "acknowledged",
          acknowledgedByName: viewerName,
          acknowledgedAt: new Date().toISOString().split("T")[0],
        }
      );
      Alert.alert("✅ Acknowledged", `Donation of GH₵ ${item.amount} confirmed.`);
      loadHistory();
    } catch (e) {
      Alert.alert("Error", "Could not acknowledge this donation.");
    }
  };

  const handleReceipt = async (item) => {
    setGeneratingReceiptId(item.id);
    try {
      await generateDonationReceipt(item, churchName);
    } catch (e) {
      Alert.alert("Error", "Could not generate receipt.");
    } finally {
      setGeneratingReceiptId(null);
    }
  };

  // ✅ acknowledged-only total — pending records aren't counted as
  // confirmed giving yet, which is the whole point of the acknowledgment
  // requirement
  const acknowledgedHistory = history.filter(h => h.status === "acknowledged" || !h.status);
  const pendingHistory = history.filter(h => h.status === "pending");
  const totalGiven = acknowledgedHistory.reduce((s, h) => s + (h.amount || 0), 0);

  return (
    <View style={styles.container}>

      {/* HEADER */}
    <View style={styles.header}>
  <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
    <Ionicons name="arrow-back" size={20} color="#fff" />
  </TouchableOpacity>

  <View style={{ flex: 1 }}>
    <Text style={styles.headerTitle}>Donate</Text>
    {memberName && (
      <Text style={styles.headerSub}>{memberName}</Text>
    )}
  </View>
  <TouchableOpacity
    onPress={() => navigation.navigate("VerifyReceipt")}
    style={styles.scanBtn}
  >
    <Ionicons name="qr-code-outline" size={20} color="#fff" />
  </TouchableOpacity>

  <View style={styles.totalPill}>
    <Text style={styles.totalPillText}>
      GH₵ {totalGiven.toLocaleString()}
    </Text>
    <Text style={styles.totalPillLabel}>Total Given</Text>
  </View>
</View>

{/* ✅ ACTION ROW */}
<View style={styles.actionRow}>

  <TouchableOpacity
    style={styles.actionItem}
    onPress={() =>
      navigation.navigate("Approval", {
        organizationId,
        entityId,
        viewerName,
      })
    }
  >
    <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
    <Text style={styles.actionText}>Approve</Text>
    <Ionicons name="chevron-forward" size={16} color="#999" />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.actionItem}
    onPress={() => navigation.navigate("VerifyReceipt")}
  >
    <Ionicons name="qr-code-outline" size={16} color="#4B3F72" />
    <Text style={styles.actionText}>Scan</Text>
    <Ionicons name="chevron-forward" size={16} color="#999" />
  </TouchableOpacity>

</View>



      {/* ✅ FINTECH-STYLE ICON TABS */}
      <View style={styles.fintechTabRow}>
        {[
          { key: "give",    label: "Give",    icon: "heart",         color: "#E11D48" },
          { key: "history", label: "History", icon: "time",          color: "#4B3F72" },
          ...(canAcknowledge ? [{ key: "pending", label: "Pending", icon: "alert-circle", color: "#e67e22" }] : []),
        ].map(t => {
          const active = activeTab === t.key;
          const badgeCount = t.key === "pending" ? pendingHistory.length : 0;
          return (
            <TouchableOpacity key={t.key} style={styles.fintechTabItem} onPress={() => setActiveTab(t.key)}>
              <View style={[
                styles.fintechCircle,
                { backgroundColor: active ? t.color : "#fff" },
                !active && { borderWidth: 1.5, borderColor: "#eee" }
              ]}>
                <Ionicons name={t.icon} size={20} color={active ? "#fff" : t.color} />
                {badgeCount > 0 && (
                  <View style={styles.fintechBadge}>
                    <Text style={styles.fintechBadgeText}>{badgeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.fintechTabLabel, active && { color: t.color, fontWeight: "800" }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === "give" && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {/* CATEGORY — fintech circular icons */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.fintechGrid}>
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat.label;
              return (
                <TouchableOpacity key={cat.label} style={styles.fintechGridItem} onPress={() => setSelectedCategory(cat.label)}>
                  <View style={[
                    styles.fintechCircleLg,
                    { backgroundColor: active ? cat.color : "#fff" },
                    !active && { borderWidth: 1.5, borderColor: "#eee" }
                  ]}>
                    <Ionicons name={cat.icon} size={20} color={active ? "#fff" : cat.color} />
                  </View>
                  <Text style={[styles.fintechGridLabel, active && { color: cat.color, fontWeight: "800" }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
                <Text style={[styles.amountText, selectedAmount === amt && styles.amountTextActive]}>{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Or enter custom amount"
            keyboardType="numeric"
            value={customAmount}
            onChangeText={v => { setCustomAmount(v); setSelectedAmount(""); }}
          />

          {/* ✅ PAYMENT METHOD — fintech circular icons */}
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.fintechGrid}>
            {PAYMENT_METHODS.map(m => {
              const active = selectedMethod === m.key;
              return (
                <TouchableOpacity key={m.key} style={styles.fintechGridItem} onPress={() => setSelectedMethod(m.key)}>
                  <View style={[
                    styles.fintechCircleLg,
                    { backgroundColor: active ? m.color : "#fff" },
                    !active && { borderWidth: 1.5, borderColor: "#eee" }
                  ]}>
                    <Ionicons name={m.icon} size={20} color={active ? "#fff" : m.color} />
                  </View>
                  <Text style={[styles.fintechGridLabel, active && { color: m.color, fontWeight: "800" }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ✅ MOBILE MONEY FIELDS — with smart provider auto-detect */}
          {selectedMethod === "momo" && (
            <View style={styles.methodBox}>
              <Text style={styles.methodBoxLabel}>Mobile Money Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 0241234567"
                keyboardType="phone-pad"
                value={momoPhone}
                onChangeText={setMomoPhone}
                maxLength={13}
              />
              {detectedProvider && (
                <View style={[styles.providerTag, { backgroundColor: detectedProvider.color + "18" }]}>
                  <View style={[styles.providerDot, { backgroundColor: detectedProvider.color }]} />
                  <Text style={[styles.providerTagText, { color: detectedProvider.color }]}>
                    Detected: {detectedProvider.label}
                  </Text>
                </View>
              )}
              {momoPhone.length > 0 && !detectedProvider && (
                <Text style={styles.providerWarning}>
                  Couldn't auto-detect a Ghana MoMo provider from this number — double-check it.
                </Text>
              )}
              <Text style={styles.methodHint}>
                Confirm the member has actually sent this amount via Mobile Money before recording it here.
              </Text>
            </View>
          )}

          {/* ✅ BANK FIELDS */}
          {selectedMethod === "bank" && (
            <View style={styles.methodBox}>
              <Text style={styles.methodBoxLabel}>Bank Transaction Reference *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. transfer reference / receipt number"
                value={bankRef}
                onChangeText={setBankRef}
              />
              <Text style={styles.methodHint}>
                Used to reconcile this record against the church's bank statement.
              </Text>
            </View>
          )}

          {/* ✅ CARD FIELDS */}
          {selectedMethod === "card" && (
            <View style={styles.methodBox}>
              <Text style={styles.methodBoxLabel}>Card Payment Reference *</Text>
              <TextInput
                style={styles.input}
                placeholder="Transaction ID from terminal/POS"
                value={cardRef}
                onChangeText={setCardRef}
              />
            </View>
          )}

          {/* ✅ SELF-ACKNOWLEDGE — only visible to people who actually hold
             manage_donations, so the integrity rule can't be bypassed by
             anyone else */}
          {canAcknowledge && (
            <TouchableOpacity
              style={styles.ackToggleRow}
              onPress={() => setSelfAcknowledge(p => !p)}
            >
              <Ionicons
                name={selfAcknowledge ? "checkbox" : "square-outline"}
                size={20}
                color={selfAcknowledge ? "#27ae60" : "#999"}
              />
              <Text style={styles.ackToggleText}>
                I'm acknowledging this donation myself right now
              </Text>
            </TouchableOpacity>
          )}

          {!canAcknowledge && (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={14} color="#4B3F72" />
              <Text style={styles.infoBannerText}>
                This donation will be recorded as pending until acknowledged by a finance officer, elder, or admin.
              </Text>
            </View>
          )}

          {/* NOTE */}
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: "top" }]}
            placeholder="Add a note..."
            multiline
            value={note}
            onChangeText={setNote}
          />

          {finalAmount ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                GH₵ <Text style={styles.summaryAmt}>{finalAmount}</Text>  ·  {selectedCategory}
                {memberName ? `  ·  ${memberName}` : ""}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.donateBtn, loading && { opacity: 0.6 }]}
            onPress={handleDonate}
            disabled={loading}
          >
            <Ionicons name="heart" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.donateBtnText}>{loading ? "Saving..." : "Record Donation"}</Text>
          </TouchableOpacity>

        </ScrollView>
      )}

      {activeTab === "history" && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>
            {memberName ? `${memberName}'s Giving History` : "All Donations"}
          </Text>

          {acknowledgedHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={42} color="#ccc" />
              <Text style={styles.emptyText}>No acknowledged donations yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.summaryRow}>
                {CATEGORIES.map(cat => {
                  const total = acknowledgedHistory.filter(h => h.type === cat.label).reduce((s, h) => s + (h.amount || 0), 0);
                  if (!total) return null;
                  return (
                    <View key={cat.label} style={[styles.summaryChip, { borderColor: cat.color }]}>
                      <Text style={[styles.summaryChipLabel, { color: cat.color }]}>{cat.label}</Text>
                      <Text style={[styles.summaryChipAmt, { color: cat.color }]}>GH₵ {total.toLocaleString()}</Text>
                    </View>
                  );
                })}
              </View>

              {acknowledgedHistory.map(item => {
                const cat = CATEGORIES.find(c => c.label === item.type) || CATEGORIES[5];
                const methodInfo = findMethod(item.method) || { icon: "cash-outline", color: "#888" };
                return (
                  <View key={item.id} style={styles.historyRow}>
                    <View style={[styles.historyIcon, { backgroundColor: cat.color + "18" }]}>
                      <Ionicons name={cat.icon} size={16} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyType}>{item.type}</Text>
                      <Text style={styles.historyDate}>
                        {item.date}{item.note ? ` · ${item.note}` : ""}
                      </Text>
                      <View style={styles.historyMethodRow}>
                        <Ionicons name={methodInfo.icon} size={11} color={methodInfo.color} />
                        <Text style={[styles.historyMethodText, { color: methodInfo.color }]}>
                          {item.methodLabel || "Cash"}
                          {item.momoProvider ? ` · ${item.momoProvider}` : ""}
                        </Text>
                      </View>
                      {!memberName && item.memberName !== "Anonymous" && (
                        <Text style={styles.historyMember}>{item.memberName}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={[styles.historyAmt, { color: cat.color }]}>GH₵ {item.amount?.toLocaleString()}</Text>
                      <TouchableOpacity
                        style={styles.receiptBtn}
                        onPress={() => handleReceipt(item)}
                        disabled={generatingReceiptId === item.id}
                      >
                        {generatingReceiptId === item.id ? (
                          <ActivityIndicator size="small" color="#4B3F72" />
                        ) : (
                          <>
                            <Ionicons name="receipt-outline" size={12} color="#4B3F72" />
                            <Text style={styles.receiptBtnText}>Receipt</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {activeTab === "pending" && canAcknowledge && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Awaiting Acknowledgment</Text>

          {pendingHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={42} color="#ccc" />
              <Text style={styles.emptyText}>Nothing pending — all caught up</Text>
            </View>
          ) : (
            pendingHistory.map(item => {
              const methodInfo = findMethod(item.method) || { icon: "cash-outline", color: "#888" };
              return (
                <View key={item.id} style={styles.pendingCard}>
                  <View style={styles.pendingCardHeader}>
                    <Text style={styles.pendingAmt}>GH₵ {item.amount?.toLocaleString()}</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  </View>
                  <Text style={styles.pendingMeta}>
                    {item.memberName} · {item.type} · {item.date}
                  </Text>
                  <View style={styles.historyMethodRow}>
                    <Ionicons name={methodInfo.icon} size={12} color={methodInfo.color} />
                    <Text style={[styles.historyMethodText, { color: methodInfo.color }]}>
                      {item.methodLabel}
                      {item.momoProvider ? ` · ${item.momoProvider} · ${item.momoPhone}` : ""}
                      {item.reference ? ` · Ref: ${item.reference}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.pendingRecordedBy}>Recorded by {item.recordedBy || "—"}</Text>

                  <TouchableOpacity style={styles.acknowledgeBtn} onPress={() => acknowledgeDonation(item)}>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                    <Text style={styles.acknowledgeBtnText}>Acknowledge</Text>
                  </TouchableOpacity>
                </View>
              );
            })
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

  /* ✅ Fintech tab row */
  fintechTabRow: {
    flexDirection: "row", justifyContent: "center", gap: 28,
    backgroundColor: "#fff", paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#eee"
  },
  fintechTabItem: { alignItems: "center" },
  fintechCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 5, elevation: 2,
  },
  fintechBadge: {
    position: "absolute", top: -3, right: -3,
    backgroundColor: "#e74c3c", borderRadius: 9, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff",
    paddingHorizontal: 3,
  },
  fintechBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  fintechTabLabel: { fontSize: 11, color: "#888", marginTop: 6, fontWeight: "600" },

  /* ✅ Fintech grid (category + payment method) */
  fintechGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 18 },
  fintechGridItem: { alignItems: "center", width: 64 },
  fintechCircleLg: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  fintechGridLabel: { fontSize: 10, color: "#666", marginTop: 6, fontWeight: "600", textAlign: "center" },

  body: { padding: 16, paddingBottom: 60 },

  label: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 10, marginTop: 6 },

  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  amountBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: "#e0e0e0" },
  amountBtnActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  amountText: { fontSize: 14, fontWeight: "700", color: "#555" },
  amountTextActive: { color: "#fff" },

  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e8e8e8" },

  methodBox: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#eee" },
  methodBoxLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 8 },
  methodHint: { fontSize: 11, color: "#aaa", marginTop: 4, lineHeight: 16 },

  providerTag: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 6 },
  providerDot: { width: 8, height: 8, borderRadius: 4 },
  providerTagText: { fontSize: 12, fontWeight: "700" },
  providerWarning: { fontSize: 11, color: "#e67e22", marginBottom: 6 },

  ackToggleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, backgroundColor: "#fff", padding: 12, borderRadius: 10 },
  ackToggleText: { flex: 1, fontSize: 12, color: "#333", fontWeight: "600" },

  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 12, marginBottom: 16 },
  infoBannerText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },

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
  historyMethodRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  historyMethodText: { fontSize: 10, fontWeight: "700" },
  historyMember: { fontSize: 11, color: "#4B3F72", marginTop: 1, fontWeight: "600" },
  historyAmt: { fontSize: 15, fontWeight: "800" },

  receiptBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  receiptBtnText: { fontSize: 10, color: "#4B3F72", fontWeight: "700" },

  pendingCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: "#e67e22" },
  pendingCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pendingAmt: { fontSize: 18, fontWeight: "900", color: "#222" },
  pendingBadge: { backgroundColor: "#fff3e0", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pendingBadgeText: { fontSize: 10, fontWeight: "800", color: "#e67e22" },
  pendingMeta: { fontSize: 12, color: "#666", marginTop: 6, fontWeight: "600" },
  pendingRecordedBy: { fontSize: 11, color: "#aaa", marginTop: 4 },
  acknowledgeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#27ae60", borderRadius: 10, padding: 11, marginTop: 12 },
  acknowledgeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  scanBtn: {
  marginRight: 10,
  padding: 8,
  borderRadius: 10,
  backgroundColor: "rgba(255,255,255,0.15)",
},

actionRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 10,
  backgroundColor: "#fff",
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
},

actionItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "#f8f9fb",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#eee",
},

actionText: {
  fontSize: 12,
  fontWeight: "700",
  color: "#333",
},


});