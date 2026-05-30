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

  /* ✅ PICK IMAGE (BASE64 ENABLED) */
  const pickImage = async () => {

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.5,
      base64: true
    });

    if (!result.canceled) {
      const base64 = "data:image/jpeg;base64," + result.assets[0].base64;
      setImage(base64);
    }
  };

  /* ✅ TAKE PHOTO (CAMERA + BASE64) */
  const takePhoto = async () => {

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Camera permission required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true
    });

    if (!result.canceled) {
      const base64 = "data:image/jpeg;base64," + result.assets[0].base64;
      setImage(base64);
    }
  };

  /* ✅ SAVE FLYER (REAL IMAGE) */
  const uploadFlyer = async () => {

    if (!image) {
      Alert.alert("Please select or take a photo");
      return;
    }

    if (!title) {
      Alert.alert("Enter event title");
      return;
    }

    if (!expiry) {
      Alert.alert("Enter expiry date");
      return;
    }

    try {

      await addDoc(collection(db, "flyers"), {
        imageUrl: image, // ✅ REAL IMAGE SAVED
        title,
        expiry,
        createdAt: new Date()
      });

      Alert.alert("✅ Flyer saved successfully");

      setImage(null);
      setTitle("");
      setExpiry("");

    } catch (err) {
      console.log(err);
      Alert.alert("Error saving flyer");
    }
  };

  const cancelUpload = () => {
    setImage(null);
    setTitle("");
    setExpiry("");
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.header}>Upload Flyer</Text>

      {/* ✅ IMAGE OPTIONS */}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text>📁 Select Image from Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={takePhoto}>
        <Text>📷 Take Photo</Text>
      </TouchableOpacity>

      {/* ✅ IMAGE PREVIEW */}
      {image && (
        <Image source={{ uri: image }} style={styles.preview} />
      )}

      {/* ✅ TITLE */}
      <TextInput
        placeholder="Event Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      {/* ✅ EXPIRY */}
      <TextInput
        placeholder="Expiry (YYYY-MM-DD)"
        value={expiry}
        onChangeText={setExpiry}
        style={styles.input}
      />

      {/* ✅ SAVE BUTTON */}
      <TouchableOpacity style={styles.uploadBtn} onPress={uploadFlyer}>
        <Text style={styles.btnText}>Save Flyer</Text>
      </TouchableOpacity>

      {/* ✅ CANCEL */}
      <TouchableOpacity style={styles.cancelBtn} onPress={cancelUpload}>
        <Text>Clear</Text>
      </TouchableOpacity>

      {/* ✅ BACK */}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>⬅ Back</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* ✅ PROFESSIONAL UI STYLES */
const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f6fb"
  },

  header: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15
  },

  button: {
    backgroundColor: "#ddd",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center"
  },

  preview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 15
  },

  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10
  },

  uploadBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10
  },

  btnText: {
    color: "#fff",
    fontWeight: "600"
  },

  cancelBtn: {
    alignItems: "center",
    marginBottom: 10
  },

  back: {
    textAlign: "center",
    color: "#555"
  }

});