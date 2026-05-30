import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  StyleSheet
} from "react-native";

import * as ImagePicker from "expo-image-picker";

/* ✅ FIREBASE */
import { db, storage } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminUploadFlyer() {

  const [image, setImage] = useState(null);
  const [expiry, setExpiry] = useState("");
  const [title, setTitle] = useState("");

  /* ✅ PICK IMAGE */
  const pickImage = async () => {

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  /* ✅ UPLOAD TO FIREBASE STORAGE */
  const uploadImage = async () => {

    if (!image) return null;

    const response = await fetch(image);
    const blob = await response.blob();

    const storageRef = ref(storage, `flyers/${Date.now()}.jpg`);

    await uploadBytes(storageRef, blob);

    const url = await getDownloadURL(storageRef);

    return url;
  };

  /* ✅ SAVE TO FIRESTORE */
  const uploadFlyer = async () => {

    if (!image || !expiry || !title) {
      Alert.alert("All fields required");
      return;
    }

    try {

      const imageUrl = await uploadImage();

      await addDoc(collection(db, "flyers"), {
        imageUrl: imageUrl,
        expiry: expiry,
        title: title,
        createdAt: new Date()
      });

      Alert.alert("✅ Flyer uploaded successfully");

      setImage(null);
      setExpiry("");
      setTitle("");

    } catch (error) {
      console.log(error);
      Alert.alert("Upload failed");
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Upload Flyer</Text>

      <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
        <Text>Select Flyer Image</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image }} style={styles.preview} />
      )}

      <TextInput
        placeholder="Event title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        placeholder="Expiry date (YYYY-MM-DD)"
        value={expiry}
        onChangeText={setExpiry}
        style={styles.input}
      />

      <TouchableOpacity style={styles.uploadBtn} onPress={uploadFlyer}>
        <Text style={{ color: "#fff" }}>Upload Flyer</Text>
      </TouchableOpacity>

    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f6fb"
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20
  },

  pickBtn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10
  },

  preview: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 10
  },

  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },

  uploadBtn: {
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 10,
    alignItems: "center"
  }

});