import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView
} from "react-native";

import * as ImagePicker from "expo-image-picker";

/* ✅ FIREBASE */
import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export default function AdminUploadFlyer({ navigation }) {

  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [expiry, setExpiry] = useState("");

  /* ✅ PICK IMAGE (OPTIMISED) */
  const pickImage = async () => {

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.3,              // ✅ reduce size (VERY IMPORTANT)
      base64: true,
      allowsEditing: true,       // ✅ crop support
      aspect: [4, 3]
    });

    if (!result.canceled) {
      const base64 = "data:image/jpeg;base64," + result.assets[0].base64;
      setImage(base64);
    }
  };

  /* ✅ TAKE PHOTO (OPTIMISED) */
  const takePhoto = async () => {

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Enable camera permission");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.3,              // ✅ compress camera photo
      base64: true,
      allowsEditing: true
    });

    if (!result.canceled) {
      const base64 = "data:image/jpeg;base64," + result.assets[0].base64;
      setImage(base64);
    }
  };

  /* ✅ SAVE */
  const uploadFlyer = async () => {

    if (!image || !title || !expiry) {
      Alert.alert("Fill all fields");
      return;
    }

    try {

      await addDoc(collection(db, "flyers"), {
        imageUrl: image,
        title,
        expiry,
        createdAt: new Date()
      });

      Alert.alert("✅ Flyer optimised and saved");

      setImage(null);
      setTitle("");
      setExpiry("");

    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.header}>Upload Flyer</Text>

      <TouchableOpacity style={styles.btn} onPress={pickImage}>
        <Text>📁 Select Image</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={takePhoto}>
        <Text>📷 Take Photo</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image }} style={styles.preview} />
      )}

      <TextInput
        placeholder="Event Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        placeholder="Expiry (YYYY-MM-DD)"
        value={expiry}
        onChangeText={setExpiry}
        style={styles.input}
      />

      <TouchableOpacity style={styles.uploadBtn} onPress={uploadFlyer}>
        <Text style={styles.whiteText}>Save Flyer</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f6fb" },

  header: { fontSize: 18, fontWeight: "600", marginBottom: 15 },

  btn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center"
  },

  preview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 10
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },

  uploadBtn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    alignItems: "center",
    borderRadius: 10
  },

  whiteText: {
    color: "#fff",
    fontWeight: "600"
  }
});