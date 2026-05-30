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

import { db, storage } from "../firebase";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminUploadFlyer() {

  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [expiry, setExpiry] = useState("");

  /* ✅ PICK IMAGE */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync();
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

  /* ✅ SAVE */
  const uploadFlyer = async () => {

    if (!image || !title || !expiry) {
      Alert.alert("Fill all fields");
      return;
    }

    try {

      const url = await uploadImage();

      await addDoc(collection(db, "flyers"), {
        imageUrl: url,
        title,
        expiry,
        createdAt: new Date()
      });

      Alert.alert("✅ Uploaded");

      setImage(null);
      setTitle("");
      setExpiry("");

    } catch (err) {
      console.log(err);
      Alert.alert("Upload failed");
    }
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>Upload Flyer</Text>

      <TouchableOpacity style={styles.btn} onPress={pickImage}>
        <Text>Select Image</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.image} />}

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
        <Text style={{ color: "#fff" }}>Upload Flyer</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 18, marginBottom: 15 },

  btn: {
    backgroundColor: "#ddd",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8
  },

  image: {
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

  uploadBtn: {
    backgroundColor: "#4B3F72",
    padding: 15,
    alignItems: "center",
    borderRadius: 10
  }
});
``