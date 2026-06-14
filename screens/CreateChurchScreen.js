import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export default function CreateChurchScreen({ navigation }) {

  const [churchName, setChurchName] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [gps, setGps] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // ✅ temporary userId (replace later with real auth)
  const userId = "admin_001";

  // ✅ load saved churchId safely
  useEffect(() => {
    const loadData = async () => {
      const test = await AsyncStorage.getItem("churchId");
      console.log("Loaded churchId:", test);
    };

    loadData();
  }, []);

  const handleCreateChurch = async () => {
    if (!churchName.trim() || !country.trim() || !phone.trim()) {
  Alert.alert("Required", "Church name, country and phone are required");
  return;
}

const phoneRegex = /^\+\d{8,15}$/;

// ✅ SMART PHONE VALIDATION
const phoneNumber = parsePhoneNumberFromString(phone);

if (!phoneNumber || !phoneNumber.isValid()) {
  Alert.alert(
    "Invalid Phone",
    "Enter a valid phone with country code (e.g. +233551234567)"
  );
  return;
}

const formattedPhone = phoneNumber.formatInternational();


    try {
      // ✅ STEP 1: Create church
      const docRef = await addDoc(collection(db, "churches"), {
        name: churchName,
        country,
        region,
        district,
        gps,
        phone: phone,
        email,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      });

      const churchId = docRef.id;

      // ✅ STEP 2: Save locally
      await AsyncStorage.setItem("churchId", churchId);

      // ✅ STEP 3: Link user to church
      await setDoc(doc(db, "users", userId), {
        id: userId,
        role: "admin",
        churchId: churchId,
        createdAt: new Date().toISOString(),
      });

      console.log("✅ ChurchId linked to user:", churchId);

      Alert.alert(
        "✅ Church Created",
        `${churchName} registered successfully`
      );

      navigation.goBack();

    } catch (error) {
      console.log("❌ Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      <Text style={styles.title}>🏛️ Register Church</Text>

      <TextInput
        placeholder="Church Name"
        value={churchName}
        onChangeText={setChurchName}
        style={styles.input}
      />

      <TextInput
        placeholder="Country"
        value={country}
        onChangeText={setCountry}
        style={styles.input}
      />

      <TextInput
        placeholder="Region"
        value={region}
        onChangeText={setRegion}
        style={styles.input}
      />

      <TextInput
        placeholder="District"
        value={district}
        onChangeText={setDistrict}
        style={styles.input}
      />

      <TextInput
        placeholder="GPS / Zip Code"
        value={gps}
        onChangeText={setGps}
        style={styles.input}
      />

      <TextInput
  placeholder="Phone (e.g. +233XXXXXXXXX)"
  value={phone}
  onChangeText={setPhone}
  style={styles.input}
  keyboardType="phone-pad"
/>

      <TextInput
        placeholder="Email (optional)"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TouchableOpacity style={styles.btn} onPress={handleCreateChurch}>
        <Text style={styles.btnText}>Create Church</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancel}>Cancel</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    color: "#222",
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 13,
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  cancel: {
    marginTop: 14,
    textAlign: "center",
    color: "#e74c3c",
    fontSize: 13,
  },
});