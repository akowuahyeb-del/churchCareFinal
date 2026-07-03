// screens/CreateChurchScreen.js — multi-step wizard with template baked in
import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { ORGANIZATION_TEMPLATES, getTemplate } from "../constants/organizationTemplates";
import { auth } from "../firebase";

const STEPS = ["Identity", "Governance", "Confirm"];

export default function CreateChurchScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Identity
  const [churchName,    setChurchName]    = useState("");
  const [denomination,  setDenomination]  = useState("");
  const [location,      setLocation]      = useState("");
  const [contactName,   setContactName]   = useState("");
  const [contactPhone,  setContactPhone]  = useState("");
  const [contactEmail,  setContactEmail]  = useState("");

  // Step 2 — Governance (the merge point)
  const [templateId, setTemplateId] = useState("presbyterian");
  const [levelId, setLevelId] = useState(null);
  const [parentNodeId, setParentNodeId] = useState(null);

  const template = getTemplate(templateId);

  

  const canNext = () => {
  if (step === 0)
    return (
      churchName.trim() &&
      denomination.trim() &&
      location.trim()
    );

  if (step === 1)
    return !!templateId && !!levelId;

  return true;
};

/* 
const user = auth.currentUser;

if (!user) {
  Alert.alert(
    "Authentication Required",
    "You must be signed in before registering a church."
  );
  return;
} */

console.log("===== SUBMIT START =====");
console.log("Current User:", auth.currentUser);

const handleSubmit = async () => {
  if (!churchName.trim() || !templateId) return;

  setSaving(true);

  try {
    const user = auth.currentUser;

    // ✅ Create the organization document
    const orgRef = await addDoc(collection(db, "organizations"), {
      name: churchName.trim(),
      denomination: denomination.trim(),
      location: location.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),

      // ✅ Applicant information
      submittedByUid: user?.uid || null,
      submittedByEmail: user?.email || null,

      // ✅ Governance
      templateId,
      levelId,
      parentNodeId,

      // ✅ Status
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Keep the rest of your existing code unchanged
  

      // ✅ Create the first entity (the congregation being registered)
      const entityRef = await addDoc(
        collection(db, "organizations", orgRef.id, "entities"),
        {
          name: churchName.trim(),
          organizationId: orgRef.id,
          status: "pending",
          createdAt: new Date().toISOString(),
        }
      );

console.log(
  "✅ Creating governance node",
  {
    name: org.name,
    levelId: level.id,
    organizationId: org.id,
  }
);


await setDoc(
  doc(db, "organizations", orgRef.id),
  {
    rootEntityId: entityRef.id,
  },
  { merge: true }
);
      // ✅ Store the structure template immediately — OrganisationStructureScreen
      // reads from here, so it won't show "Not Configured" even before approval
      await setDoc(
        doc(db, "organizations", orgRef.id, "settings", "structure"),
        {
          templateId,
          status: "pending", // nodes will be seeded on approval
          organizationId: orgRef.id,
          entityId: entityRef.id,
        }
      );

      Alert.alert(
        "✅ Submitted",
        `${churchName} has been submitted for review. You'll be notified once approved.`
      );
      navigation.goBack();

    } catch (e) {
      console.log("❌ CreateChurch error:", e);
      Alert.alert("Error", "Could not submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

console.log(
  "✅ Current User:",
  auth.currentUser
);


  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Church</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* STEP INDICATOR */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
              {i < step
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[styles.stepNum, i <= step && { color: "#fff" }]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body}>

        {/* ── STEP 1: IDENTITY ── */}
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Church Details</Text>
            <Text style={styles.stepSubtitle}>Tell us about your church</Text>

            <Text style={styles.label}>Church Name *</Text>
            <TextInput style={styles.input} value={churchName} onChangeText={setChurchName}
              placeholder="e.g. Prince of Peace Presbyterian Church" />

            <Text style={styles.label}>Denomination *</Text>
            <TextInput style={styles.input} value={denomination} onChangeText={setDenomination}
              placeholder="e.g. Presbyterian Church of Ghana" />

            <Text style={styles.label}>Location *</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation}
              placeholder="e.g. Tema, Greater Accra" />

            <Text style={styles.sectionDivider}>Contact Person</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName}
              placeholder="Administrator's name" />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone}
              placeholder="e.g. 0241234567" keyboardType="phone-pad" />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail}
              placeholder="admin@church.org" keyboardType="email-address" autoCapitalize="none" />
          </View>
        )}

        {/* ── STEP 2: GOVERNANCE TEMPLATE ── */}
        {/* ✅ THIS IS THE MERGE — template picked here, not separately in Settings */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Governance Structure</Text>
            <Text style={styles.stepSubtitle}>
              Choose the hierarchy model that matches your church's governing structure.
              This determines how your church is organized in the system.
            </Text>

            {Object.values(ORGANIZATION_TEMPLATES).map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.templateCard, templateId === t.id && styles.templateCardActive]}
                onPress={() => {
  setTemplateId(t.id);
  setLevelId(null);
}}
              >
                <View style={styles.templateCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.templateCardName, templateId === t.id && { color: "#4B3F72" }]}>
                      {t.name}
                    </Text>
                    <Text style={styles.templateCardDesc}>{t.description}</Text>
                  </View>
                  <View style={[styles.radioOuter, templateId === t.id && styles.radioOuterActive]}>
                    {templateId === t.id && <View style={styles.radioInner} />}
                  </View>
                </View>

                {/* Show the level chain */}
                <View style={styles.levelChain}>
                  {t.levels.map((l, i) => (
                    <View key={l.id} style={styles.levelChainItem}>
                      <View style={[styles.levelChainDot, { backgroundColor: l.color }]} />
                      <Text style={styles.levelChainLabel}>{l.label}</Text>
                      {i < t.levels.length - 1 && (
                        <Ionicons name="chevron-forward" size={10} color="#ccc" />
                      )}
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}

<Text style={styles.label}>
  Registration Level *
</Text>

<Text style={styles.stepSubtitle}>
  Select the level at which this church is registering.
</Text>

{template.levels.map(level => (
  <TouchableOpacity
    key={level.id}
    style={[
      styles.templateCard,
      levelId === level.id && styles.templateCardActive
    ]}
    onPress={() => {
  setLevelId(level.id);
  setParentNodeId(null);
}}
  >
    <View style={styles.templateCardTop}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.templateCardName,
            levelId === level.id && { color: "#4B3F72" }
          ]}
        >
          {level.label}
        </Text>

        <Text style={styles.templateCardDesc}>
          Register as a {level.label}
        </Text>
      </View>

      <View
        style={[
          styles.radioOuter,
          levelId === level.id && styles.radioOuterActive
        ]}
      >
        {levelId === level.id && (
          <View style={styles.radioInner} />
        )}
      </View>
    </View>
  </TouchableOpacity>
))}



            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={14} color="#4B3F72" />
              <Text style={styles.infoBoxText}>
                Your hierarchy nodes will be automatically created when your church is approved.
                You can rename them and add branches in Settings afterward.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 3: CONFIRM ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Confirm & Submit</Text>
            <Text style={styles.stepSubtitle}>Review your details before submitting for approval.</Text>

            <View style={styles.summaryCard}>
              <SummaryRow label="Church Name" value={churchName} />
              <SummaryRow label="Denomination" value={denomination} />
              <SummaryRow label="Location" value={location} />
              <SummaryRow label="Contact" value={contactName || "—"} />
              <SummaryRow
                label="Governance"
                value={getTemplate(templateId).name}
                highlight
              />
              <SummaryRow
  label="Registration Level"
  value={
    template.levels.find(
      l => l.id === levelId
    )?.label || "Not Selected"
  }
/>
              <SummaryRow
                label="Structure"
                value={getTemplate(templateId).levels.map(l => l.label).join(" → ")}
              />
            </View>




            <View style={[styles.infoBox, { backgroundColor: "#fff3e0" }]}>
              <Ionicons name="time-outline" size={14} color="#e67e22" />
              <Text style={[styles.infoBoxText, { color: "#e67e22" }]}>
                Your registration goes to a developer for review. Once approved, your hierarchy
                will be set up automatically and you'll receive a notification.
              </Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* BOTTOM ACTION */}
      <View style={styles.bottomBar}>
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && { opacity: 0.4 }]}
            onPress={() => setStep(s => s + 1)}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, saving && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>Submit for Approval</Text>}
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && { color: "#4B3F72", fontWeight: "800" }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  header: { backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },

  stepRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  stepItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#eee", alignItems: "center", justifyContent: "center", marginRight: 6 },
  stepCircleActive: { backgroundColor: "#4B3F72" },
  stepNum: { fontSize: 11, fontWeight: "800", color: "#aaa" },
  stepLabel: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  stepLabelActive: { color: "#4B3F72", fontWeight: "800" },
  stepLine: { flex: 1, height: 2, backgroundColor: "#eee", marginHorizontal: 6 },
  stepLineActive: { backgroundColor: "#4B3F72" },

  body: { padding: 16, paddingBottom: 100 },
  stepTitle: { fontSize: 18, fontWeight: "800", color: "#222", marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 18 },

  label: { fontSize: 12, fontWeight: "700", color: "#777", marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e8e8e8", fontSize: 14, marginBottom: 4 },
  sectionDivider: { fontSize: 13, fontWeight: "800", color: "#4B3F72", marginTop: 20, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 6 },

  templateCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: "transparent", elevation: 1 },
  templateCardActive: { borderColor: "#4B3F72", backgroundColor: "#fafafe" },
  templateCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  templateCardName: { fontSize: 14, fontWeight: "800", color: "#222" },
  templateCardDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center", marginTop: 2 },
  radioOuterActive: { borderColor: "#4B3F72" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4B3F72" },
  levelChain: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 12 },
  levelChainItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  levelChainDot: { width: 6, height: 6, borderRadius: 3 },
  levelChainLabel: { fontSize: 10, color: "#666", fontWeight: "600" },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 12, marginTop: 12 },
  infoBoxText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },

  summaryCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  summaryLabel: { fontSize: 12, color: "#aaa", fontWeight: "600" },
  summaryValue: { fontSize: 12, color: "#222", fontWeight: "600", flex: 1, textAlign: "right" },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  nextBtn: { backgroundColor: "#4B3F72", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});