// screens/OnboardingScreen.js
//
// Post-approval setup: service defaults, church location.
// On completion:
//   1. Writes settings/defaults + settings/location to entity
//   2. Writes onboarding completion record keyed by user uid
//   3. Navigates to MainTabs

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase";
import { doc, setDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STEPS = ["Welcome", "Service Setup", "Location", "Done"];

export default function OnboardingScreen({ route, navigation }) {
  const org = route?.params?.org || {};

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 2 — service defaults
  const [defaultService, setDefaultService] = useState("Sunday");
  const [defaultStart, setDefaultStart]     = useState("9:00 AM");
  const [timezone, setTimezone]             = useState("Africa/Accra");

  // Step 3 — location
  const [latitude, setLatitude]   = useState("5.6037");
  const [longitude, setLongitude] = useState("-0.1870");
  const [address, setAddress]     = useState("");

  const complete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // ✅ Get uid from Firebase auth (source of truth)
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Session Expired", "Please sign in again.");
        navigation.replace("Login");
        return;
      }
      const uid = user.uid;
      const email = user.email;

      // ✅ Resolve organizationId + entityId
      // Prefer route.params.org.id, fall back to finding by submittedByUid
      let organizationId = org.id;
      let entityId = null;

      if (!organizationId) {
        // Fallback: find the user's org from Firestore
        const orgsSnap = await getDocs(
          query(
            collection(db, "organizations"),
            where("submittedByUid", "==", uid),
            limit(1)
          )
        );
        if (!orgsSnap.empty) {
          organizationId = orgsSnap.docs[0].id;
        }
      }

      if (!organizationId) {
        Alert.alert("Error", "Could not find your church. Please sign out and back in.");
        setSaving(false);
        return;
      }

      // ✅ Get the entityId (first entity under this org)
      const entitiesSnap = await getDocs(
        collection(db, "organizations", organizationId, "entities")
      );
      if (!entitiesSnap.empty) {
        entityId = entitiesSnap.docs[0].id;
      }

      if (!entityId) {
        Alert.alert("Error", "Church setup incomplete. Please contact support.");
        setSaving(false);
        return;
      }

      // ✅ Save service defaults to entity settings
      await setDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "settings", "defaults"),
        { defaultService, defaultStartTime: defaultStart, timezone },
        { merge: true }
      );

      // ✅ Save church coordinates for Geo check-in
      if (latitude && longitude) {
        await setDoc(
          doc(db, "organizations", organizationId, "entities", entityId, "settings", "location"),
          {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address,
            geoRadiusMeters: 150,
          },
          { merge: true }
        );
      }

      // ✅ Mark onboarding complete — 4 segments (valid document reference)
      await setDoc(
        doc(db, "organizations", organizationId, "onboarding", uid),
        {
          completed: true,
          completedAt: new Date().toISOString(),
          uid,
          email,
        }
      );

      await setDoc(
  doc(db, "organizations", organizationId),
  {
    onboardingStatus:
      "onboarding_completed",

    onboardingCompletedAt:
      new Date().toISOString(),
  },
  { merge: true }
);

      // ✅ Persist activeEntity so the rest of the app knows the context
      const orgName = org.name || "Church";
      await AsyncStorage.setItem(
        "activeEntity",
        JSON.stringify({
          organizationId,
          entityId,
          name: orgName,
        })
      );

      // ✅ Update user profile with org/entity ids
      await setDoc(
        doc(db, "users", uid),
        { organizationId, entityId, entityName: orgName },
        { merge: true }
      );

      // ✅ Move to "Done" step, then continue to MainTabs
      setStep(STEPS.length - 1);
    } catch (e) {
      console.log("❌ onboarding complete error:", e);
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goToDashboard = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }],
    });
  };

  return (
    <View style={styles.container}>

      {/* PROGRESS */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.progressDot, i <= step && styles.progressDotActive]}>
              {i < step && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.progressLine, i < step && styles.progressLineActive]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body}>

        {/* STEP 0 — WELCOME */}
        {step === 0 && (
          <View style={styles.centered}>
            <View style={styles.approvedBadge}>
              <Ionicons name="checkmark-circle" size={56} color="#27ae60" />
            </View>
            <Text style={styles.bigTitle}>You're Approved! 🎉</Text>
            <Text style={styles.bigSub}>
              <Text style={{ fontWeight: "800" }}>{org.name}</Text> is now active on ChurchCare.
              Let's take 2 minutes to set up your dashboard.
            </Text>
            <View style={styles.featureList}>
              {["Attendance tracking with QR codes", "Member profiles & giving records", "Service program & preacher management", "AI-powered financial insights"].map(f => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STEP 1 — SERVICE DEFAULTS */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Service Setup</Text>
            <Text style={styles.stepSub}>
              These defaults pre-fill your Attendance screen every Sunday so you don't have to set them manually each time.
            </Text>

            <Text style={styles.label}>Primary Service Day</Text>
            <View style={styles.chipRow}>
              {["Sunday", "Saturday", "Friday", "Wednesday"].map(d => (
                <TouchableOpacity key={d}
                  style={[styles.chip, defaultService === d && styles.chipActive]}
                  onPress={() => setDefaultService(d)}>
                  <Text style={[styles.chipText, defaultService === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Typical Start Time</Text>
            <View style={styles.chipRow}>
              {["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM"].map(t => (
                <TouchableOpacity key={t}
                  style={[styles.chip, defaultStart === t && styles.chipActive]}
                  onPress={() => setDefaultStart(t)}>
                  <Text style={[styles.chipText, defaultStart === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Timezone</Text>
            <View style={styles.chipRow}>
              {["Africa/Accra", "Africa/Lagos", "Africa/Nairobi"].map(tz => (
                <TouchableOpacity key={tz}
                  style={[styles.chip, timezone === tz && styles.chipActive]}
                  onPress={() => setTimezone(tz)}>
                  <Text style={[styles.chipText, timezone === tz && styles.chipTextActive]}>{tz.replace("Africa/", "")}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2 — LOCATION */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Church Location</Text>
            <Text style={styles.stepSub}>
              Used by Geo check-in to verify members are physically at the church before marking them present.
            </Text>

            <Text style={styles.label}>Street Address</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress}
              placeholder="e.g. Plot 14, Liberation Road, Tema" />

            <Text style={styles.label}>GPS Coordinates</Text>
            <Text style={styles.hint}>Find these on Google Maps: press and hold your church location.</Text>
            <View style={styles.coordRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput style={styles.input} value={latitude} onChangeText={setLatitude}
                  keyboardType="decimal-pad" placeholder="e.g. 5.6037" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput style={styles.input} value={longitude} onChangeText={setLongitude}
                  keyboardType="decimal-pad" placeholder="e.g. -0.1870" />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="location-outline" size={13} color="#4B3F72" />
              <Text style={styles.infoText}>
                You can update these anytime in Settings → Church Location.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 3 — DONE */}
        {step === STEPS.length - 1 && (
          <View style={styles.centered}>
            <View style={styles.approvedBadge}>
              <Ionicons name="rocket-outline" size={56} color="#4B3F72" />
            </View>
            <Text style={styles.bigTitle}>All Set!</Text>
            <Text style={styles.bigSub}>
              Your dashboard is ready. You can add members, start tracking attendance, and manage your service program right away.
            </Text>
            <TouchableOpacity style={[styles.nextBtn, { marginTop: 20 }]} onPress={goToDashboard}>
              <Text style={styles.nextBtnText}>Go to Dashboard</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomBar}>
        {step < STEPS.length - 2 && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {step < STEPS.length - 2 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        ) : step === STEPS.length - 2 ? (
          <TouchableOpacity
            style={[styles.nextBtn, saving && { opacity: 0.6 }]}
            onPress={complete}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={styles.nextBtnText}>Complete Setup</Text>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </>}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  progressRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: "#4B3F72" },
  progressItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  progressDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  progressDotActive: { backgroundColor: "#fff" },
  progressLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 4 },
  progressLineActive: { backgroundColor: "#fff" },
  body: { padding: 20, paddingBottom: 120 },
  centered: { alignItems: "center", paddingTop: 10 },
  approvedBadge: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center", marginBottom: 20, marginTop: 10 },
  bigTitle: { fontSize: 24, fontWeight: "900", color: "#222", textAlign: "center" },
  bigSub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22, marginTop: 10, marginBottom: 20 },
  featureList: { alignSelf: "stretch", gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 10, padding: 12 },
  featureText: { fontSize: 13, color: "#333", fontWeight: "600", flex: 1 },
  stepTitle: { fontSize: 20, fontWeight: "800", color: "#222", marginBottom: 6 },
  stepSub: { fontSize: 13, color: "#888", lineHeight: 19, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "700", color: "#777", marginBottom: 6, marginTop: 10 },
  hint: { fontSize: 11, color: "#aaa", marginBottom: 6, marginTop: -4 },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#eee", fontSize: 14, marginBottom: 6, color: "#222" },
  coordRow: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  chipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  chipText: { fontSize: 12, color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 12, marginTop: 8 },
  infoText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, backgroundColor: "#fff", padding: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  skipBtn: { padding: 10 },
  skipText: { color: "#aaa", fontSize: 13, fontWeight: "600" },
  nextBtn: { backgroundColor: "#4B3F72", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});