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
      const data = await AsyncStorage.getItem("currentUser");
      if (data) {
        const parsed = JSON.parse(data);
        setUser(parsed);
        setName(parsed.name || "");
        setPhone(parsed.phone || "");
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
      const currentUser = JSON.parse(
        await AsyncStorage.getItem("currentUser")
      );

      const uid = currentUser.uid; // ✅ IMPORTANT

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

      Alert.alert("Success", "Profile updated");

      // ✅ MOVE USER TO NEXT STEP
      navigation.replace("CreateChurch");

    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Complete Profile</Text>

      <Text style={styles.subtitle}>
        Tell us a bit about you before continuing
      </Text>

      <TextInput
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Phone number"
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