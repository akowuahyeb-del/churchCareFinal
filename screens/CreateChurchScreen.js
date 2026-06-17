
import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, Dimensions,
  Animated, ActivityIndicator, Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";

const { width: W } = Dimensions.get("window");
const TOTAL_STEPS = 4;

// ── Validation helpers ────────────────────────────────────────────
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidPhone = (p) => /^\+?[\d\s\-()]{8,15}$/.test(p.trim());

// ── Step indicator ────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotActive, i < current && styles.dotDone]} />
      ))}
    </View>
  );
}

// ── Field component ───────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: "#e74c3c" }}> *</Text>}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function CreateChurchScreen({ navigation }) {

  const [step,    setStep]    = useState(0);
  const [saving,  setSaving]  = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 0 — Church identity
  const [churchName,    setChurchName]    = useState("");
  const [denomination,  setDenomination]  = useState("");
  const [foundedYear,   setFoundedYear]   = useState("");
  const [motto,         setMotto]         = useState("");

  // Step 1 — Location
  const [country,  setCountry]  = useState("Ghana");
  const [region,   setRegion]   = useState("");
  const [district, setDistrict] = useState("");
  const [address,  setAddress]  = useState("");
  const [gps,      setGps]      = useState("");

  // Step 2 — Contact
  const [phone,   setPhone]   = useState("");
  const [email,   setEmail]   = useState("");
  const [website, setWebsite] = useState("");

  // Step 3 — Admin account
  const [adminName,     setAdminName]     = useState("");
  const [adminPhone,    setAdminPhone]    = useState("");
  const [adminEmail,    setAdminEmail]    = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPass,   setConfirmPass]   = useState("");
  const [showPass,      setShowPass]      = useState(false);

  const [errors, setErrors] = useState({});

  // ── Validation per step ────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!churchName.trim())   e.churchName   = "Church name is required";
      if (!denomination.trim()) e.denomination = "Denomination is required";
    }
    if (step === 1) {
      if (!country.trim())  e.country  = "Country is required";
      if (!region.trim())   e.region   = "Region is required";
      if (!address.trim())  e.address  = "Address is required";
    }
    if (step === 2) {
      if (!phone.trim())              e.phone = "Phone number is required";
      else if (!isValidPhone(phone))  e.phone = "Enter a valid phone number";
      if (email && !isValidEmail(email)) e.email = "Enter a valid email address";
    }
    if (step === 3) {
      if (!adminName.trim())          e.adminName     = "Your full name is required";
      if (!adminEmail.trim())         e.adminEmail    = "Email is required";
      else if (!isValidEmail(adminEmail)) e.adminEmail = "Enter a valid email";
      if (!adminPassword)             e.adminPassword = "Password is required";
      else if (adminPassword.length < 6) e.adminPassword = "Minimum 6 characters";
      if (adminPassword !== confirmPass)  e.confirmPass   = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Slide animation between steps ─────────────────────────────
  const animateNext = (direction = 1) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -direction * W, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue:  direction * W, duration: 0,   useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,               duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    if (!validate()) return;
    animateNext(1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    setErrors({});
    animateNext(-1);
    setStep(s => s - 1);
  };

  const handleCreateChurch = async () => {
  if (!validate()) return;

  setSaving(true);

  try {
    // ✅ 1. CREATE ORGANIZATION FIRST
    const orgRef = await addDoc(collection(db, "organizations"), {
      name: churchName.trim(),
      createdAt: new Date().toISOString(),
    });

    const organizationId = orgRef.id;

    // ✅ 2. CREATE CHURCH (ENTITY)
    const churchRef = await addDoc(
      collection(db, "organizations", organizationId, "entities"),
      {
        name: churchName.trim(),
        createdAt: new Date().toISOString(),
      }
    );

    const entityId = churchRef.id;
    const userId = `admin_${Date.now()}`;

    // ✅ 3. CREATE ADMIN USER
    await setDoc(doc(db, "users", userId), {
      id: userId,
      name: adminName.trim(),
      phone: adminPhone.trim(),
      email: adminEmail.trim(),
      role: "admin",
      organizationId,
      entityId,
      createdAt: new Date().toISOString(),
    });

    // ✅ 4. SAVE SESSION DATA
    await AsyncStorage.multiSet([
      ["isLoggedIn", "true"],

      ["currentUser", JSON.stringify({
        userId,
        name: adminName.trim(),
        email: adminEmail.trim(),
        role: "admin",
        organizationId,
        entityId
      })],

      ["activeEntity", JSON.stringify({
        organizationId,
        entityId,
        name: churchName.trim()
      })],

      ["userEntities", JSON.stringify([
        {
          entityId,
          name: churchName.trim()
        }
      ])]
    ]);

    // ✅ 5. NAVIGATE
    navigation.replace("MainTabs");

  } catch (err) {
    console.log("❌ FULL ERROR:", err);
    Alert.alert("Error", err.message);

  } finally {
    setSaving(false);
  }
};

      

  // ── Step content ───────────────────────────────────────────────
  const steps = [
    // ─── STEP 0: Church Identity ───────────────────────────────
    <ScrollView key={0} showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <View style={styles.stepIcon}><Ionicons name="business" size={32} color="#4B3F72" /></View>
      <Text style={styles.stepTitle}>Church Identity</Text>
      <Text style={styles.stepSub}>Tell us about your church</Text>

      <Field label="Church Name"    required error={errors.churchName}>
        <TextInput style={[styles.input, errors.churchName && styles.inputError]}
          placeholder="e.g. Grace Community Church"
          value={churchName} onChangeText={t => { setChurchName(t); setErrors(p => ({ ...p, churchName: null })); }} />
      </Field>

      <Field label="Denomination" required error={errors.denomination}>
        <TextInput style={[styles.input, errors.denomination && styles.inputError]}
          placeholder="e.g. Pentecostal, Baptist, Catholic…"
          value={denomination} onChangeText={t => { setDenomination(t); setErrors(p => ({ ...p, denomination: null })); }} />
      </Field>

      <Field label="Year Founded">
        <TextInput style={styles.input} placeholder="e.g. 1995" keyboardType="number-pad"
          value={foundedYear} onChangeText={setFoundedYear} maxLength={4} />
      </Field>

      <Field label="Church Motto / Vision">
        <TextInput style={[styles.input, { height: 64, textAlignVertical: "top" }]}
          placeholder="e.g. Reaching the unreached…" multiline
          value={motto} onChangeText={setMotto} />
      </Field>
    </ScrollView>,

    // ─── STEP 1: Location ──────────────────────────────────────
    <ScrollView key={1} showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <View style={styles.stepIcon}><Ionicons name="location" size={32} color="#0984E3" /></View>
      <Text style={styles.stepTitle}>Location</Text>
      <Text style={styles.stepSub}>Where is your church located?</Text>

      <Field label="Country" required error={errors.country}>
        <TextInput style={[styles.input, errors.country && styles.inputError]}
          placeholder="e.g. Ghana" value={country}
          onChangeText={t => { setCountry(t); setErrors(p => ({ ...p, country: null })); }} />
      </Field>

      <Field label="Region / State" required error={errors.region}>
        <TextInput style={[styles.input, errors.region && styles.inputError]}
          placeholder="e.g. Greater Accra" value={region}
          onChangeText={t => { setRegion(t); setErrors(p => ({ ...p, region: null })); }} />
      </Field>

      <Field label="District / City">
        <TextInput style={styles.input} placeholder="e.g. Accra Metropolitan"
          value={district} onChangeText={setDistrict} />
      </Field>

      <Field label="Street Address" required error={errors.address}>
        <TextInput style={[styles.input, { height: 64, textAlignVertical: "top" }, errors.address && styles.inputError]}
          placeholder="e.g. 12 Faith Avenue, North Kaneshie" multiline value={address}
          onChangeText={t => { setAddress(t); setErrors(p => ({ ...p, address: null })); }} />
      </Field>

      <Field label="GPS / Digital Address">
        <TextInput style={styles.input} placeholder="e.g. GA-123-4567"
          value={gps} onChangeText={setGps} autoCapitalize="characters" />
      </Field>
    </ScrollView>,

    // ─── STEP 2: Contact ───────────────────────────────────────
    <ScrollView key={2} showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <View style={styles.stepIcon}><Ionicons name="call" size={32} color="#00B894" /></View>
      <Text style={styles.stepTitle}>Contact Details</Text>
      <Text style={styles.stepSub}>How can people reach your church?</Text>

      <Field label="Church Phone" required error={errors.phone}>
        <View style={[styles.phoneRow, errors.phone && styles.inputError]}>
          <Ionicons name="call-outline" size={16} color="#4B3F72" style={{ marginRight: 8 }} />
          <TextInput style={styles.phoneInput} placeholder="+233 20 000 0000"
            keyboardType="phone-pad" value={phone}
            onChangeText={t => { setPhone(t); setErrors(p => ({ ...p, phone: null })); }} />
        </View>
      </Field>

      <Field label="Church Email" error={errors.email}>
        <TextInput style={[styles.input, errors.email && styles.inputError]}
          placeholder="church@example.com" keyboardType="email-address"
          autoCapitalize="none" value={email}
          onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: null })); }} />
      </Field>

      <Field label="Website (optional)">
        <TextInput style={styles.input} placeholder="www.yourchurch.org"
          autoCapitalize="none" keyboardType="url" value={website} onChangeText={setWebsite} />
      </Field>
    </ScrollView>,

    // ─── STEP 3: Admin Account ─────────────────────────────────
    <ScrollView key={3} showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <View style={styles.stepIcon}><Ionicons name="shield-checkmark" size={32} color="#6C5CE7" /></View>
      <Text style={styles.stepTitle}>Admin Account</Text>
      <Text style={styles.stepSub}>Create the administrator account for your church</Text>

      <View style={styles.adminNote}>
        <Ionicons name="information-circle-outline" size={16} color="#0984E3" />
        <Text style={styles.adminNoteText}>This account will have full admin access. Keep credentials safe.</Text>
      </View>

      <Field label="Your Full Name" required error={errors.adminName}>
        <TextInput style={[styles.input, errors.adminName && styles.inputError]}
          placeholder="e.g. Kwame Mensah" value={adminName}
          onChangeText={t => { setAdminName(t); setErrors(p => ({ ...p, adminName: null })); }} />
      </Field>

      <Field label="Your Phone">
        <TextInput style={styles.input} placeholder="+233 20 000 0000"
          keyboardType="phone-pad" value={adminPhone} onChangeText={setAdminPhone} />
      </Field>

      <Field label="Admin Email" required error={errors.adminEmail}>
        <TextInput style={[styles.input, errors.adminEmail && styles.inputError]}
          placeholder="admin@yourchurch.org" keyboardType="email-address"
          autoCapitalize="none" value={adminEmail}
          onChangeText={t => { setAdminEmail(t); setErrors(p => ({ ...p, adminEmail: null })); }} />
      </Field>

      <Field label="Password" required error={errors.adminPassword}>
        <View style={[styles.phoneRow, errors.adminPassword && styles.inputError]}>
          <TextInput style={styles.phoneInput} placeholder="Minimum 6 characters"
            secureTextEntry={!showPass} value={adminPassword}
            onChangeText={t => { setAdminPassword(t); setErrors(p => ({ ...p, adminPassword: null })); }} />
          <TouchableOpacity onPress={() => setShowPass(p => !p)}>
            <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#aaa" />
          </TouchableOpacity>
        </View>
      </Field>

      <Field label="Confirm Password" required error={errors.confirmPass}>
        <TextInput style={[styles.input, errors.confirmPass && styles.inputError]}
          placeholder="Re-enter password" secureTextEntry={!showPass}
          value={confirmPass}
          onChangeText={t => { setConfirmPass(t); setErrors(p => ({ ...p, confirmPass: null })); }} />
      </Field>
    </ScrollView>,
  ];

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* Header */}
      <View style={styles.header}>
        {step > 0
          ? <TouchableOpacity style={styles.backBtn} onPress={goBack}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
          : <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace("Login")}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
        }
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Register Church</Text>
          <Text style={styles.headerSub}>Step {step + 1} of {TOTAL_STEPS}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      {/* Step dots */}
      <StepDots current={step} total={TOTAL_STEPS} />

      {/* Animated step content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
          {steps[step]}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Bottom buttons */}
      <View style={styles.footer}>
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: "#00B894" }, saving && { opacity: 0.6 }]}
            onPress={handleCreateChurch} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.nextBtnText}>Create Church</Text></>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.replace("Login")}>
          <Text style={styles.cancelLinkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, paddingTop: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 1 },

  progressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 0 },
  progressFill: { height: 3, backgroundColor: "#1BA97F" },

  dots: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  dotActive: { backgroundColor: "#fff", width: 24 },
  dotDone: { backgroundColor: "#1BA97F" },

  stepContainer: { flex: 1 },
  stepScroll: { padding: 16, paddingBottom: 40, backgroundColor: "#f4f6fb" },

  stepIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 12, elevation: 2 },
  stepTitle: { fontSize: 20, fontWeight: "900", color: "#222", marginBottom: 4 },
  stepSub: { fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 18 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 5 },
  fieldError: { fontSize: 11, color: "#e74c3c", marginTop: 3 },

  input: { backgroundColor: "#fff", borderRadius: 12, padding: 13, fontSize: 13, color: "#222", borderWidth: 1.5, borderColor: "#eee" },
  inputError: { borderColor: "#e74c3c" },

  phoneRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 13, borderWidth: 1.5, borderColor: "#eee" },
  phoneInput: { flex: 1, fontSize: 13, color: "#222", paddingVertical: 13 },

  adminNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EBF4FD", borderRadius: 10, padding: 12, marginBottom: 14 },
  adminNoteText: { flex: 1, fontSize: 12, color: "#0984E3", lineHeight: 18 },

  footer: { backgroundColor: "#fff", padding: 16, paddingBottom: Platform.OS === "ios" ? 28 : 16, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", borderRadius: 14, padding: 15, gap: 8 },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  cancelLink: { alignItems: "center", paddingTop: 12 },
  cancelLinkText: { fontSize: 12, color: "#888" },
});
