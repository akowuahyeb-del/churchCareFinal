import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function PreacherModal({
  visible,
  onClose,
  onSave,
  initialData
}) {
  // ✅ STATE
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [date, setDate] = useState(null);
  const [expiry, setExpiry] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState(null);

  // ✅ LOAD DATA WHEN EDITING
  useEffect(() => {
    setName(initialData?.name || "");
    setTopic(initialData?.topic || "");
    setBio(initialData?.bio || "");
    setPhoto(initialData?.photo || null);
    setDate(initialData?.date || null);
    setExpiry(initialData?.expiry || null);
  }, [initialData]);

  // ✅ IMAGE PICK
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8
    });

    if (result.canceled) return;

    setUploading(true);

    try {
      const uri = result.assets[0].uri;

      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });

      const storageRef = ref(storage, `preachers/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);

      const url = await getDownloadURL(storageRef);
      setPhoto(url);

    } catch (err) {
      console.log("Upload error:", err);
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
            placeholder="Preacher Name"
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

          {/* ✅ SERVICE DATE */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              setPickerType("date");
              setShowPicker(true);
            }}
          >
            <Text>
              {date
                ? new Date(date).toLocaleString()
                : "Set Service Date"}
            </Text>
          </TouchableOpacity>

          {/* ✅ EXPIRY */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              setPickerType("expiry");
              setShowPicker(true);
            }}
          >
            <Text>
              {expiry
                ? new Date(expiry).toLocaleString()
                : "Set Expiry"}
            </Text>
          </TouchableOpacity>

          {/* ✅ DATE PICKER */}
          {showPicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowPicker(false);
                if (!selectedDate) return;

                if (pickerType === "date") {
                  setDate(selectedDate.toISOString());
                }

                if (pickerType === "expiry") {
                  setExpiry(selectedDate.toISOString());
                }
              }}
            />
          )}

          {/* ✅ SAVE */}
          <TouchableOpacity
            style={styles.save}
            onPress={() => {
              onSave({
                name,
                topic,
                bio,
                photo,
                date,
                expiry
              });
              onClose();
            }}
          >
            <Text style={styles.white}>Save</Text>
          </TouchableOpacity>

          {/* ✅ DELETE */}
          <TouchableOpacity
            style={styles.delete}
            onPress={() => {
              onSave({ delete: true });
              onClose();
            }}
          >
            <Text style={styles.white}>Delete</Text>
          </TouchableOpacity>

          {/* ✅ CANCEL */}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
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
    height: 90,
    backgroundColor: "#eee",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
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
  },

  delete: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8
  },

  cancel: {
    textAlign: "center",
    marginTop: 10,
    color: "#777"
  },

  white: {
    color: "#fff",
    fontWeight: "700"
  }
});