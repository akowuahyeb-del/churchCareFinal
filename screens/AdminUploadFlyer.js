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
import { db, storage } from "../firebase";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminUploadFlyer() {

  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);

  /* ✅ PICK IMAGE */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  /* ✅ TAKE PHOTO */
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Camera permission required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  /* ✅ UPLOAD IMAGE */
  const uploadImage = async () => {
    const response = await fetch(image);
    const blob = await response.blob();

    const storageRef = ref(storage, `flyers/${Date.now()}.jpg`);

    await uploadBytes(storageRef, blob);

    return await getDownloadURL(storageRef);
  };

  /* ✅ VALIDATE DATE */
  const isValidDate = (date) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  };

  /* ✅ UPLOAD FLYER */
  const uploadFlyer = async () => {

    if (!image) {
      Alert.alert("Please select an image");
      return;
    }

    if (!title) {
      Alert.alert("Please enter title");
      return;
    }

    if (!expiry || !isValidDate(expiry)) {
      Alert.alert("Enter expiry in format YYYY-MM-DD");
      return;
    }

    try {
      setLoading(true);

      const imageUrl = await uploadImage();

      await addDoc(collection(db, "flyers"), {
        imageUrl,
        title,
        expiry,
        createdAt: new Date()
      });

      Alert.alert("✅ Flyer Uploaded!");

      /* ✅ RESET */
      setImage(null);
      setTitle("");
      setExpiry("");

    } catch (err) {
      console.log(err);
      Alert.alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.header}>Upload Flyer</Text>

      {/* ✅ IMAGE BUTTONS */}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text>Select Image from Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={takePhoto}>
        <Text>Take Photo</Text>
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

      {/* ✅ UPLOAD BUTTON FIXED */}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={uploadFlyer}
      >
        <Text style={styles.uploadText}>
          {loading ? "Uploading..." : "Upload Flyer"}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 20
  },

  header: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20
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

  uploadButton: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10
  },

  uploadText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  }

});