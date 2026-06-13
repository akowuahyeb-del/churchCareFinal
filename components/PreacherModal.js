import React, { useState } from "react";
import {
  View, Text, Modal, TextInput,
  TouchableOpacity, Image, StyleSheet
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
const [preacherModal, setPreacherModal] = useState(false);
const [editingPreacher, setEditingPreacher] = useState(null);

export default function PreacherModal({
  visible,
  onClose,
  onSave,
  initialData
}) {

  const [name, setName] = useState(initialData?.name || "");
  const [topic, setTopic] = useState(initialData?.topic || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [photo, setPhoto] = useState(initialData?.photo || null);
  const [uploading, setUploading] = useState(false);
  const [preacherModal, setPreacherModal] = useState(false);
const [editingPreacher, setEditingPreacher] = useState(null);

  // ✅ IMAGE PICKER
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8
    });

    if (result.canceled) return;

    setUploading(true);

    try {
      const uri = result.assets[0].uri;

      const blob = await new Promise((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => res(xhr.response);
        xhr.onerror = () => rej();
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });

      const refStorage = ref(storage, `preachers/${Date.now()}.jpg`);
      await uploadBytes(refStorage, blob);

      const url = await getDownloadURL(refStorage);
      setPhoto(url);

    } catch (err) {
      console.log(err);
    }

    setUploading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">

      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>Preacher</Text>

          {/* ✅ IMAGE */}
          <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.image} />
            ) : (
              <Text>{uploading ? "Uploading..." : "Upload Photo"}</Text>
            )}
          </TouchableOpacity>

          {/* ✅ INPUTS */}
          <TextInput
            placeholder="Name"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            placeholder="Sermon Topic"
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
          />

          <TextInput
            placeholder="Bio"
            style={[styles.input, { height: 80 }]}
            multiline
            value={bio}
            onChangeText={setBio}
          />

          {/* ✅ ACTIONS */}
          <TouchableOpacity
            style={styles.save}
            onPress={() => {
              onSave({ name, topic, bio, photo });
              onClose();
            }}
          >
            <Text style={{ color: "#fff" }}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={{ textAlign: "center", marginTop: 10 }}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center"
  },

  box: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 16,
    borderRadius: 16
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },

  imageBox: {
    height: 80,
    backgroundColor: "#eee",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10
  },

  save: {
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 10,
    alignItems: "center"
  }
});