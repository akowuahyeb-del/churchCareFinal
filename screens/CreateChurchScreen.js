// screens/CreateChurchScreen.js — multi-step wizard with template baked in
import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ORGANIZATION_TEMPLATES, getTemplate } from "../constants/organizationTemplates";
import { auth } from "../firebase";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";


const STEPS = ["Identity", "Governance", "Confirm"];

export default function CreateChurchScreen() {

const functions = getFunctions();

const _checkDuplicateOrganization =
  httpsCallable(
    functions,
    "checkDuplicateOrganization"
  );

const _submitOrganizationRegistration =
  httpsCallable(
    functions,
    "submitOrganizationRegistration"
  );

  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [churchName, setChurchName] = useState("");
const [denomination, setDenomination] = useState("");
const [location, setLocation] = useState("");


 const [contactName, setContactName] = useState("");
const [contactPhone, setContactPhone] = useState("");
const [contactEmail, setContactEmail] = useState("");

// Church Administrator
const [adminName, setAdminName] = useState("");
const [adminPhone, setAdminPhone] = useState("");
const [adminEmail, setAdminEmail] = useState("");

const [errors, setErrors] = useState({});
const [organizationAbbreviation,
  setOrganizationAbbreviation] =
  useState("");


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
    location.trim() &&

    adminName.trim() &&
    isValidPhone(adminPhone) &&
    isValidEmail(adminEmail) &&

    contactName.trim() &&
    isValidPhone(contactPhone) &&
    isValidEmail(contactEmail)
  );

 if (step === 1)
  return (
    !!templateId &&
    !!levelId &&
    (
      templateId !== "independent" ||
      organizationAbbreviation.trim()
    )
  );

  return true;
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone) => {
  const cleaned = phone.trim();
  return /^\+[1-9]\d{7,14}$/.test(cleaned);
};

const normalizePhone = (phone) => {
  return phone.trim();
};

const validateForm = () => {
  const newErrors = {};

  if (!adminName.trim()) {
    newErrors.adminName =
      "Administrator name is required";
  }

  if (!isValidPhone(adminPhone)) {
    newErrors.adminPhone =
      "Use international format (e.g. +233241234567)";
  }

  if (!isValidEmail(adminEmail)) {
    newErrors.adminEmail =
      "Enter a valid email address";
  }

  if (!contactName.trim()) {
    newErrors.contactName =
      "Contact person name is required";
  }

  if (!isValidPhone(contactPhone)) {
    newErrors.contactPhone =
      "Use international format (e.g. +233241234567)";
  }

  if (!isValidEmail(contactEmail)) {
    newErrors.contactEmail =
      "Enter a valid email address";
  }

  setErrors(newErrors);

  return Object.keys(newErrors).length === 0;
};



const handleSubmit = async () => {

  if (!validateForm()) {
  return;
}
  if (!churchName.trim() || !templateId) return;

  const user = auth.currentUser;
  if (!user) {
    Alert.alert(
      "Not Signed In",
      "You must be signed in before registering a church. Please sign in and try again."
    );
    return;
  }

  setSaving(true);

  try {
        const { data } =
      await _submitOrganizationRegistration({
        name: churchName,

        denomination,

        location,

        organizationAbbreviation,

        contactName,

        contactPhone:
          normalizePhone(contactPhone),

        contactEmail,

        adminName,

        adminPhone:
          normalizePhone(adminPhone),

        adminEmail,

        templateId,

        levelId,

        parentNodeId,
      });

    if (data.flaggedForReview) {
      Alert.alert(
        "Submitted For Review",
        "This registration is similar to an existing church and has been flagged for additional review."
      );
    }

    navigation.replace(
      "Pending",
      {
        org: {
          id: data.organizationId,
          name: churchName.trim(),
        },
      }
    );

    } catch (e) {
      console.log("❌ CreateChurch error:", e);
      if (
  e.code ===
  "functions/already-exists"
) {
  Alert.alert(
    "Possible Duplicate",
    e.message
  );
} else {
  Alert.alert(
    "Error",
    "Could not submit. Please try again."
  );
}

    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
       <TouchableOpacity
  onPress={() => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  }}
  style={{ opacity: step > 0 ? 1 : 0 }}
  disabled={step === 0}
>
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


           <Text style={styles.sectionDivider}>
  Church Administrator
</Text>

<Text style={styles.label}>
  Full Name *
</Text>


<TextInput
  style={[
    styles.input,
    errors.adminName && styles.inputError
  ]}
  value={adminName}
  onChangeText={(text) => {
    setAdminName(text);

    if (errors.adminName) {
      setErrors(prev => ({
        ...prev,
        adminName: null,
      }));
    }
  }}
  placeholder="Administrator full name"
  autoCapitalize="words"
/>

{errors.adminName && (
  <Text style={styles.errorText}>
    {errors.adminName}
  </Text>
)}

<Text style={styles.label}>
  Phone *
</Text>

<TextInput
  style={[
    styles.input,
    errors.adminPhone && styles.inputError
  ]}
  value={adminPhone}
  onChangeText={(text) => {
    setAdminPhone(text);

    if (errors.adminPhone) {
      setErrors(prev => ({
        ...prev,
        adminPhone: null,
      }));
    }
  }}
  placeholder="+233241234567"
  keyboardType="phone-pad"
  autoComplete="tel"
/>

<Text
  style={{
    fontSize: 11,
    color: "#888",
    marginTop: -2,
    marginBottom: 4,
  }}
>
  Include country code. Example: +233241234567
</Text>

{errors.adminPhone && (
  <Text style={styles.errorText}>
    {errors.adminPhone}
  </Text>
)}

<Text style={styles.label}>
  Email *
</Text>


<TextInput
  style={[
    styles.input,
    errors.adminEmail && styles.inputError
  ]}
  value={adminEmail}
  onChangeText={(text) => {
    setAdminEmail(text);

    if (errors.adminEmail) {
      setErrors(prev => ({
        ...prev,
        adminEmail: null,
      }));
    }
  }}
  placeholder="admin@church.org"
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="email"
/>

{errors.adminEmail && (
  <Text style={styles.errorText}>
    {errors.adminEmail}
  </Text>
)}

<Text style={styles.sectionDivider}>
  Primary Contact Person
</Text>

            <Text style={styles.label}>
  Full Name *
</Text>

<TextInput
  style={[
    styles.input,
    errors.contactName && styles.inputError
  ]}
  value={contactName}
  onChangeText={(text) => {
    setContactName(text);

    if (errors.contactName) {
      setErrors(prev => ({
        ...prev,
        contactName: null,
      }));
    }
  }}
  placeholder="Primary contact full name"
  autoCapitalize="words"
/>

{errors.contactName && (
  <Text style={styles.errorText}>
    {errors.contactName}
  </Text>
)}
<Text style={styles.label}>
  Phone *
</Text>

<TextInput
  style={[
    styles.input,
    errors.contactPhone && styles.inputError
  ]}
  value={contactPhone}
  onChangeText={(text) => {
    setContactPhone(text);

    if (errors.contactPhone) {
      setErrors(prev => ({
        ...prev,
        contactPhone: null,
      }));
    }
  }}
  placeholder="+233241234567"
  keyboardType="phone-pad"
  autoComplete="tel"
/>

<Text
  style={{
    fontSize: 11,
    color: "#888",
    marginTop: -2,
    marginBottom: 4,
  }}
>
  Include country code. Example: +233241234567
</Text>

{errors.contactPhone && (
  <Text style={styles.errorText}>
    {errors.contactPhone}
  </Text>
)}

<Text style={styles.label}>
  Email *
</Text>

<TextInput
  style={[
    styles.input,
    errors.contactEmail && styles.inputError
  ]}
  value={contactEmail}
  onChangeText={(text) => {
    setContactEmail(text);

    if (errors.contactEmail) {
      setErrors(prev => ({
        ...prev,
        contactEmail: null,
      }));
    }
  }}
  placeholder="contact@church.org"
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="email"
/>

{errors.contactEmail && (
  <Text style={styles.errorText}>
    {errors.contactEmail}
  </Text>
)}

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



{templateId === "independent" && (
  <>
    <Text style={styles.label}>
      Church Abbreviation *
    </Text>

    <TextInput
      style={styles.input}
      value={organizationAbbreviation}
      onChangeText={(text) =>
        setOrganizationAbbreviation(
          text.toUpperCase()
        )
      }
      placeholder="e.g. FTI"
      autoCapitalize="characters"
      maxLength={8}
    />

    <Text
      style={{
        fontSize: 11,
        color: "#888",
        marginBottom: 10,
      }}
    >
      Used for organisation codes
      (e.g. FTI-LC-0001)
    </Text>
  </>
)}

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
              {templateId === "independent" && (
  <SummaryRow
    label="Abbreviation"
    value={organizationAbbreviation}
  />
)}

              <SummaryRow label="Location" value={location} />
              



<SummaryRow
  label="Administrator"
  value={adminName || "—"}
/>

<SummaryRow
  label="Primary Contact"
  value={contactName || "—"}
/>

    
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
  inputError: {
  borderColor: "#e74c3c",
  borderWidth: 1.5,
},

errorText: {
  color: "#e74c3c",
  fontSize: 11,
  marginBottom: 8,
},
});