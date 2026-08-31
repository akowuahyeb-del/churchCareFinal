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


import {
  addVisitor,
} from "../utils/visitorIntake";


export default function QRRegistrationScreen({
  navigation,
  route,
}) {

  console.log(
    "QR REGISTRATION ROUTE:",
    route?.params
  );

  const { organizationId, entityId } =
    route.params || {};

const [form, setForm] = useState({
  name: "",
  phone: "",
  suburb: "",
  address: "",
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
if (!form.suburb?.trim()) {
  Alert.alert(
    "Required",
    "Please enter your suburb or area."
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

    const result = await addVisitor({
  organizationId,
  entityId,

  name: form.name.trim(),

  phone: form.phone.trim(),

  suburb: form.suburb.trim(),

  address:
    form.address?.trim() || "",

  email:
    form.email?.trim() || "",

  source: "qr_registration",
});
    if (
      !result.created &&
      result.duplicate
    ) {

     Alert.alert(
  "Already Registered",
  `${result.visitor?.name || "This visitor"} already exists in the visitor register.`
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
  Suburb / Area *
</Text>

<TextInput
  style={styles.input}
  value={form.suburb}
  onChangeText={(text) =>
    setForm((prev) => ({
      ...prev,
      suburb: text,
    }))
  }
/>

<Text style={styles.label}>
  Address
</Text>

<TextInput
  style={styles.input}
  value={form.address}
  onChangeText={(text) =>
    setForm((prev) => ({
      ...prev,
      address: text,
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
