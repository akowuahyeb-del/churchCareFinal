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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  /* ✅ UPLOAD IMAGE TO FIREBASE STORAGE */
  const uploadImage = async () => {

    const response = await fetch(image);
    const blob = await response.blob();

    const storageRef = ref(storage, `flyers/${Date.now()}.jpg`);

    await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  };

  /* ✅ UPLOAD FLYER */
  const uploadFlyer = async () => {

    if (!image || !title || !expiry) {
      Alert.alert("Please complete all fields");
      return;
    }

    setLoading(true);

    try {

      const imageUrl = await uploadImage();

      await addDoc(collection(db, "flyers"), {
        imageUrl: imageUrl,
        title: title,
        expiry: expiry,
        createdAt: new Date()
      });

      Alert.alert("✅ Flyer uploaded successfully");

      /* ✅ RESET FORM */
      setImage(null);
      setTitle("");
      setExpiry("");

    } catch (error) {
      console.log(error);
      Alert.alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.header}>Upload Flyer (Admin)</Text>

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

      {/* ✅ TITLE INPUT */}
      <TextInput
        placeholder="Event Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      {/* ✅ EXPIRY INPUT */}
      <TextInput
        placeholder="Expiry Date (YYYY-MM-DD)"
        value={expiry}
        onChangeText={setExpiry}
        style={styles.input}
      />

      {/* ✅ UPLOAD BUTTON */}
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
    padding: 20,
    backgroundColor: "#f4f6fb"
  },

  header: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20
  },

  button: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center"
  },

  preview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },

  uploadButton: {
    backgroundColor: "#4B3F72",
    padding: 15,
    borderRadius: 10,
    alignItems: "center"
  },

  uploadText: {
    color: "#fff",
    fontWeight: "600"
  }

});