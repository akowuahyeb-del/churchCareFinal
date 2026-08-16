import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";
export default function OrganizationIdentityScreen({ navigation, route }) {
  const {
    organizationId,
    organizationCode: initialCode,
    organizationAbbreviation: initialAbbreviation,
  } = route?.params || {};

  const functions = getFunctions();
  const updateOrganizationIdentity = httpsCallable(
    functions,
    "updateOrganizationIdentity"
  );

  const [saving, setSaving] = useState(false);
  const [organizationCode, setOrganizationCode] = useState(initialCode || "");
  const [currentOrganizationId, setOrganizationId] = useState(organizationId || "");
  const [organizationAbbreviation, setOrganizationAbbreviation] = useState(
    initialAbbreviation || ""
  );
  const [churchAbbreviation, setChurchAbbreviation] = useState("");
  const [locationAbbreviation, setLocationAbbreviation] = useState("");

  useEffect(() => {
    const loadOrganization = async () => {
      try {
        // FIX: only fall back to the "active" org in storage if no
        // specific org was passed in via route params. Otherwise this
        // screen can silently start editing the wrong organization.
        let targetOrgId = organizationId;

        if (!targetOrgId) {
          const activeEntity = JSON.parse(
            (await AsyncStorage.getItem("activeEntity")) || "null"
          );
          targetOrgId = activeEntity?.organizationId;
        }

        if (!targetOrgId) return;

        const orgSnap = await getDoc(doc(db, "organizations", targetOrgId));
        if (!orgSnap.exists()) return;

        const org = orgSnap.data();

        setOrganizationId(targetOrgId);
        setOrganizationCode(org.organizationCode || "");

        const combinedAbbreviation = org.organizationAbbreviation || "";
        setOrganizationAbbreviation(combinedAbbreviation);

        const parts = combinedAbbreviation.split("-");
        setChurchAbbreviation(parts[0] || "");
        setLocationAbbreviation(parts[1] || "");
        // FIX: removed the stray second setLocationAbbreviation(org.locationAbbreviation)
        // call that was overwriting the split value with an undefined field,
        // wiping the field out on every load.
      } catch (e) {
        console.log("LOAD ORG ERROR", e);
      }
    };

    loadOrganization();
  }, [organizationId]);

  const handleSave = async () => {
    const church = churchAbbreviation.trim().toUpperCase();
    const location = locationAbbreviation.trim().toUpperCase();

    // FIX: validate before hitting the backend. An empty piece here
    // would produce a malformed Church ID (e.g. "POP-" or "-AYD") and
    // that cascades into org record / governance node / root entity.
    if (!church || !location) {
      Alert.alert(
        "Missing information",
        "Please enter both a church abbreviation and a location abbreviation."
      );
      return;
    }

    if (!currentOrganizationId) {
      Alert.alert("Error", "No organization selected to update.");
      return;
    }

    try {
      setSaving(true);

      const combinedAbbreviation = `${church}-${location}`;

      const { data } = await updateOrganizationIdentity({
        organizationId: currentOrganizationId,
        organizationAbbreviation: combinedAbbreviation,
      });

      Alert.alert(
        "Success",
        `Organisation code updated to ${data.organizationCode}`
      );

      // Reflect the change locally so the "current" fields and preview
      // are correct without needing to re-fetch.
      setOrganizationAbbreviation(combinedAbbreviation);
      if (data.organizationCode) {
        setOrganizationCode(data.organizationCode);
      }
    } catch (error) {
      console.error("Identity update failed", error);
      Alert.alert(
        "Error",
        error.message || "Unable to update organisation identity"
      );
    } finally {
      setSaving(false);
    }
  };

const segments =
  organizationCode?.split("-") || [];

const previewCode =
  segments.length >= 4
    ? `${segments[0]}-${
        churchAbbreviation || "?"
      }-${
        locationAbbreviation || "?"
      }-${
        segments[3]
      }`
    : organizationCode || "Preview unavailable";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <AppHeader
  title="Church Identity"
  onBack={() => navigation.goBack()}
/>

      <Text style={styles.subtitle}>
        Update the church abbreviation used to generate Church IDs and future
        Member IDs.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Current Church ID</Text>
        <Text style={styles.readOnlyValue}>
          {organizationCode || "Not Available"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current Abbreviation</Text>
        <Text style={styles.readOnlyValue}>
          {organizationAbbreviation || "Not Set"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Church Abbreviation</Text>
        <TextInput
          style={styles.input}
          value={churchAbbreviation}
          onChangeText={(text) => setChurchAbbreviation(text.toUpperCase())}
          placeholder="e.g. POP"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Location Abbreviation</Text>
        <TextInput
          style={styles.input}
          value={locationAbbreviation}
          onChangeText={(text) => setLocationAbbreviation(text.toUpperCase())}
          placeholder="e.g. AYD"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Church ID Preview</Text>
        <Text style={styles.readOnlyValue}>{previewCode}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: "#EEF0FA" }]}>
        <Text style={styles.infoText}>
          The church abbreviation forms part of the Church ID.
          {"\n\n"}Changing the abbreviation will update:
          {"\n\n"}• Church ID{"\n"}• Organisation Record{"\n"}• Governance Node
          {"\n"}• Root Entity
          {"\n\n"}Future Member IDs will use the new Church ID.
          {"\n\n"}Existing Member IDs remain unchanged.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#222" },
  subtitle: { fontSize: 13, color: "#777", marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: "700", color: "#666", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  infoText: { fontSize: 12, lineHeight: 18, color: "#4B3F72" },
  saveButton: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  readOnlyValue: { fontSize: 16, fontWeight: "700", color: "#222", marginTop: 6 },
});