import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import AppHeader from "../components/AppHeader";

const CATEGORIES = [
  { key: "prayer", label: "Prayer Request" },
  { key: "counselling", label: "Counselling" },
  { key: "bereavement", label: "Bereavement" },
  { key: "financial", label: "Financial Support" },
  { key: "general", label: "General Support" },
];

export default function PastoralRequestScreen({ navigation }) {
  const [category, setCategory] = useState("prayer");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const functions = getFunctions();
  const submitPastoralRequest = httpsCallable(functions, "submitPastoralRequest");

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert("Required", "Please describe what you need.");
      return;
    }

    setSubmitting(true);
    try {
      const storedEntity = await AsyncStorage.getItem("activeEntity");
      // ASSUMPTION: the logged-in member's own profile lives here.
      // Adjust to match your actual member-auth pattern.
      const storedMember = await AsyncStorage.getItem("currentMember");

      if (!storedEntity) {
        Alert.alert("Error", "No active church selected.");
        return;
      }

      const entity = JSON.parse(storedEntity);
      const member = storedMember ? JSON.parse(storedMember) : {};

      const { data } = await submitPastoralRequest({
        organizationId: entity.organizationId,
        entityId: entity.entityId,
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        category,
        description: description.trim(),
        anonymous,
      });

      if (data.urgency === "crisis") {
        Alert.alert(
          "You're not alone",
          "Your request has been sent immediately to our pastoral team. If you are in immediate danger, please also contact emergency services or a crisis line right away.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          data.merged ? "Update Added" : "Request Sent",
          data.merged
            ? "This has been added to your existing request — our team has been notified."
            : "Our pastoral team has been notified and will follow up with you soon.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Pastoral Care"
        subtitle="We're here for you"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.label}>What kind of support do you need?</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tell us more</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Share as much or as little as you're comfortable with..."
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Submit anonymously</Text>
            <Text style={styles.switchSub}>
              Your name and phone number won't be attached to this request.
            </Text>
          </View>
          <Switch value={anonymous} onValueChange={setAnonymous} />
        </View>

        <Text style={styles.disclaimer}>
          If you are in immediate danger or having thoughts of harming yourself,
          please contact emergency services or a crisis line right away — this
          form is not a substitute for emergency help.
        </Text>

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Send Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "700", marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#EEE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: { backgroundColor: "#4B3F72" },
  chipText: { color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  textarea: {
    minHeight: 120,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#F5F5F5",
    padding: 14,
    borderRadius: 12,
  },
  switchLabel: { fontWeight: "700" },
  switchSub: { color: "#777", fontSize: 12, marginTop: 2 },
  disclaimer: {
    fontSize: 12,
    color: "#888",
    marginTop: 16,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitText: { color: "#fff", fontWeight: "700" },
});