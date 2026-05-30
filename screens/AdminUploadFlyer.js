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
  const [showOptions, setShowOptions] = useState(false);

  /* ✅ OPEN SELECT OPTIONS */
  const openPickerOptions = () => {
    setShowOptions(true);
  };

  /* ✅ PICK FROM GALLERY */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7
    });

    setShowOptions(false);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  /* ✅ TAKE PHOTO (FIXED PERMISSION) */
  const takePhoto = async () => {

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission Required", "Enable camera access to take photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7
    });

    setShowOptions(false);

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
  const validDate = /^\d{4}-\d{2}-\d{2}$/;

  /* ✅ UPLOAD FLYER */
  const uploadFlyer = async () => {

    if (!image) {
      Alert.alert("Select a flyer image");
      return;
    }

    if (!title) {
      Alert.alert("Enter event title");
      return;
    }

    if (!expiry || !validDate.test(expiry)) {
      Alert.alert("Use format YYYY-MM-DD");
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

      Alert.alert("✅ Flyer uploaded!");

      setImage(null);
      setTitle("");
      setExpiry("");

    } catch (err) {
      console.log(err);
      Alert.alert("Upload failed");
    }
  };

  const cancelUpload = () => {
    setImage(null);
    setTitle("");
    setExpiry("");
  };

  return (
    <ScrollView style={styles.container}>

      {/* ✅ HEADER */}
      <Text style={styles.header}>Upload Flyer</Text>

      {/* ✅ IMAGE SELECT BUTTON */}
      <TouchableOpacity style={styles.primaryBtn} onPress={openPickerOptions}>
        <Text style={styles.whiteText}>Select / Take Photo</Text>
      </TouchableOpacity>

      {/* ✅ OPTIONS PANEL */}
      {showOptions && (
        <View style={styles.optionsBox}>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.option}>📁 Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={takePhoto}>
            <Text style={styles.option}>📷 Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowOptions(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ IMAGE PREVIEW */}
      {image && (
        <Image source={{ uri: image }} style={styles.preview} />
      )}

      {/* ✅ INPUTS */}
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

      {/* ✅ UPLOAD */}
      <TouchableOpacity style={styles.primaryBtn} onPress={uploadFlyer}>
        <Text style={styles.whiteText}>Upload Flyer</Text>
      </TouchableOpacity>

      {/* ✅ CANCEL */}
      <TouchableOpacity style={styles.secondaryBtn} onPress={cancelUpload}>
        <Text>Clear</Text>
      </TouchableOpacity>

      {/* ✅ BACK */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text>⬅ Back</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* ✅ PROFESSIONAL STYLES */
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

  primaryBtn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10
  },

  normalBtn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center"
  },

  secondaryBtn: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5
  },

  whiteText: {
    color: "#fff",
    fontWeight: "600"
  },

  backBtn: {
    marginTop: 15,
    alignItems: "center"
  },

  preview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 10
  },

  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10
  },

  optionsBox: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2
  },

  option: {
    marginBottom: 8
  },

  cancelText: {
    color: "#999",
    marginTop: 5
  }

});