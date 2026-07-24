import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";


import { addMemberManually } from "../utils/memberIntake";

import {
  MEMBER_LIFECYCLE,
} from "../constants/memberLifecycle";

export default function QRRegistrationScreen({
  navigation,
  route,
}) {
  const { organizationId, entityId } =
    route.params || {};

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const handleRegister = async () => {
  try {

    if (!form.name?.trim()) {
      Alert.alert(
        "Required",
        "Please enter your name"
      );
      return;
    }

    if (!form.phone?.trim()) {
      Alert.alert(
        "Required",
        "Please enter your phone number"
      );
      return;
    }

    const organizationId =
      route?.params?.org;

    const entityId =
      route?.params?.entity;

    if (!organizationId || !entityId) {
      Alert.alert(
        "Invalid QR Code",
        "Church information could not be found."
      );
      return;
    }

    const result = await addMemberManually({
      organizationId,
      entityId,

      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email?.trim() || "",

      source: "qr_registration",

      lifecycleStatus:
        MEMBER_LIFECYCLE.VISITOR,
    });

    if (
      !result.created &&
      result.duplicate
    ) {

      const match =
        result.matches?.[0];

      Alert.alert(
        "Already Registered",
        match?.name
          ? `${match.name} already exists in the church records.`
          : "A member or visitor with this phone number already exists."
      );

      return;
    }

    Alert.alert(
      "Registration Successful",
      "Thank you for registering. A church administrator will contact you shortly.",
      [
        {
          text: "OK",
          onPress: () =>
            navigation.goBack(),
        },
      ]
    );

  } catch (e) {

    console.log(
      "QR REGISTRATION ERROR:",
      e
    );

    Alert.alert(
      "Registration Failed",
      e?.message ||
        "Something went wrong. Please try again."
    );
  }
};

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Visitor Registration"
        subtitle="Register through Church QR"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.label}>
            Full Name *
          </Text>

          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                name: text,
              }))
            }
          />

          <Text style={styles.label}>
            Phone *
          </Text>

          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                phone: text,
              }))
            }
          />

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                email: text,
              }))
            }
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleRegister}
        >
          <Text style={styles.submitText}>
            Register
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#4B3F72",
  },

  container: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },

label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },

  submitBtn: {
    backgroundColor: "#4B3F72",
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
