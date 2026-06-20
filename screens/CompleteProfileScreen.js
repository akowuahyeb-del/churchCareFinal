import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function CompleteProfileScreen({ navigation }) {

  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await AsyncStorage.getItem("currentUser");

        if (!data) {
          Alert.alert("Error", "User not found. Please log in again.");
          return;
        }

        const parsed = JSON.parse(data);

        setUser(parsed);
        setName(parsed.name || "");
        setPhone(parsed.phone || "");

      } catch (err) {
        console.log("❌ LOAD USER ERROR:", err);
      }
    };

    loadUser();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required", "Please fill all fields");
      return;
    }

    try {
      const data = await AsyncStorage.getItem("currentUser");

      // ✅ SAFE GUARD
      if (!data) {
        Alert.alert("Error", "User not found. Please log in again.");
        return;
      }

      const currentUser = JSON.parse(data);

      if (!currentUser?.uid) {
        Alert.alert("Error", "Invalid user session. Please log in again.");
        return;
      }

      const uid = currentUser.uid;

      // ✅ UPDATE FIRESTORE
      await updateDoc(doc(db, "users", uid), {
        name,
        phone
      });

      // ✅ UPDATE LOCAL STORAGE
      const updatedUser = {
        ...currentUser,
        name,
        phone
      };

      await AsyncStorage.setItem(
        "currentUser",
        JSON.stringify(updatedUser)
      );

      Alert.alert(
        "Success ✅",
        "Profile updated successfully",
        [
          {
            text: "OK",
            onPress: () => navigation.replace("CreateChurch")
          }
        ]
      );

    } catch (e) {
      console.log("❌ PROFILE SAVE ERROR:", e);
      Alert.alert("Error", e.message);
    }
  };

  
return (
  <View style={styles.container}>

    {/* ✅ BACK BUTTON (ADD HERE) */}
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Text style={{ color: "#4B3F72", marginBottom: 20 }}>
        ← Back
      </Text>
    </TouchableOpacity>

    <Text style={styles.title}>Complete Profile</Text>

    <Text style={styles.subtitle}>
      Tell us a bit about you before continuing
    </Text>


      <Text style={styles.title}>Complete Profile</Text>

      <Text style={styles.subtitle}>
        Tell us a bit about you before continuing
      </Text>

      {/* ✅ LABEL + INPUT */}
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        placeholder="Enter your full name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      {/* ✅ LABEL + INPUT */}
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        placeholder="Enter phone number"
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f7f8fb"
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    color: "#222"
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginBottom: 20
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginBottom: 4,
    marginTop: 10
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10
  },

  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  }
});