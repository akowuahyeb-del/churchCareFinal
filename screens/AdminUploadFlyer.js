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

export default function AdminUploadFlyer({ navigation }) {

  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [expiry, setExpiry] = useState("");

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync();
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const uploadImage = async () => {
    const response = await fetch(image);
    const blob = await response.blob();

    const storageRef = ref(storage, `flyers/${Date.now()}`);
    await uploadBytes(storageRef, blob);

    return await getDownloadURL(storageRef);
  };

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
      Alert.alert("Upload failed");
    }
  };

  const cancelUpload = () => {
    setImage(null);
    setTitle("");
    setExpiry("");
    Alert.alert("Cancelled");
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>Upload Flyer</Text>

      {/* ✅ IMAGE */}
      <TouchableOpacity style={styles.btn} onPress={pickImage}>
        <Text>Select Image</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image }} style={styles.image} />
      )}

      {/* ✅ INPUTS */}
      <TextInput
        placeholder="Title"
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

      {/* ✅ BUTTONS */}
      <TouchableOpacity style={styles.uploadBtn} onPress={uploadFlyer}>
        <Text style={styles.btnText}>Upload</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={cancelUpload}>
        <Text>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text>⬅ Back</Text>
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
    borderRadius: 8,
    marginBottom: 10
  },

  image: {
    width: "100%",
    height: 200,
    marginBottom: 10
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8
  },

  uploadBtn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    alignItems: "center",
    borderRadius: 10
  },

  btnText: {
    color: "#fff"
  },

  cancelBtn: {
    marginTop: 10,
    alignItems: "center"
  },

  backBtn: {
    marginTop: 15,
    alignItems: "center"
  }
});