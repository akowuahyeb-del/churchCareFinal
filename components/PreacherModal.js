// components/PreacherModal.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { Ionicons } from "@expo/vector-icons";
import { SESSIONS } from "../constants/sessions";

export default function PreacherModal({
  visible,
  onClose,
  onSave,
  initialData
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [date, setDate] = useState(null);
  const [expiry, setExpiry] = useState(null);

  // ✅ FIXED: was useState("null") — a literal string, not null.
  // That meant session?.id checks below never failed gracefully,
  // and a brand-new preacher silently "had" a session named "null".
  const [session, setSession] = useState(null);

  // ✅ LOAD EDIT DATA (and reset cleanly every time the modal opens)
  useEffect(() => {
    if (!visible) return;
    setName(initialData?.name || "");
    setTopic(initialData?.topic || "");
    setBio(initialData?.bio || "");
    setPhoto(initialData?.photo || null);
    setDate(initialData?.date || null);
    setExpiry(initialData?.expiry || null);
    setSession(initialData?.session || null);
  }, [initialData, visible]);

  // ✅ QUICK DATE PICKER
  const pickDate = (type) => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    Alert.alert("Select Date", "Quick options", [
      {
        text: "Today",
        onPress: () => {
          type === "date"
            ? setDate(now.toISOString())
            : setExpiry(now.toISOString());
        }
      },
      {
        text: "Tomorrow",
        onPress: () => {
          type === "date"
            ? setDate(tomorrow.toISOString())
            : setExpiry(tomorrow.toISOString());
        }
      },
      {
        text: "Clear",
        onPress: () => {
          type === "date" ? setDate(null) : setExpiry(null);
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  // ✅ IMAGE UPLOAD
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

  // ✅ SAVE HANDLER
  const handleSave = () => {
    if (!name.trim() || !topic.trim()) {
      Alert.alert("Required", "Name and topic are required");
      return;
    }

    // ✅ A preacher with no session can never be matched to a program item —
    // so a session is now mandatory, same as name/topic.
    if (!session?.id) {
      Alert.alert("Required", "Please select which session this preacher belongs to");
      return;
    }

    onSave({
      id: initialData?.id || Date.now().toString(),
      name,
      topic,
      bio,
      photo,
      date,
      expiry,
      session // ✅ {id, name} — same shape Program items use to link back
    });

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>
            {initialData?.id ? "Edit Preacher" : "New Preacher"}
          </Text>

          {/* ✅ IMAGE */}
          <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="camera-outline" size={20} color="#666" />
                <Text style={{ fontSize: 11, marginTop: 4 }}>
                  {uploading ? "Uploading..." : "Upload Photo"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ✅ NAME */}
          <TextInput
            placeholder="Preacher Name"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          {/* ✅ TOPIC */}
          <TextInput
            placeholder="Sermon Topic"
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
          />

          {/* ✅ SESSION — now reads from the shared SESSIONS list */}
          <Text style={styles.label}>Session</Text>

          <View style={styles.sessionRow}>
            {SESSIONS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.sessionChip,
                  session?.id === s.id && styles.sessionChipActive
                ]}
                onPress={() => setSession(s)}
              >
                <Text
                  style={[
                    styles.sessionText,
                    session?.id === s.id && styles.sessionTextActive
                  ]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {session && (
            <Text style={{ fontSize: 12, color: "#4B3F72", marginBottom: 8 }}>
              This preacher will appear under: {session.name}
            </Text>
          )}

          {/* ✅ BIO */}
          <TextInput
            placeholder="Bio"
            style={[styles.input, { height: 80 }]}
            multiline
            value={bio}
            onChangeText={setBio}
          />

          {/* ✅ DATE */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => pickDate("date")}
          >
            <Text>
              {date ? new Date(date).toLocaleDateString() : "Set Service Date"}
            </Text>
          </TouchableOpacity>

          {/* ✅ EXPIRY */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => pickDate("expiry")}
          >
            <Text>
              {expiry ? new Date(expiry).toLocaleDateString() : "Set Expiry"}
            </Text>
          </TouchableOpacity>

          {/* ✅ SAVE */}
          <TouchableOpacity style={styles.save} onPress={handleSave}>
            <Text style={styles.white}>Save</Text>
          </TouchableOpacity>

          {/* ✅ DELETE */}
          {initialData?.id && (
            <TouchableOpacity
              style={styles.delete}
              onPress={() => {
                onSave({ id: initialData.id, delete: true });
                onClose();
              }}
            >
              <Text style={styles.white}>Delete</Text>
            </TouchableOpacity>
          )}

          {/* ✅ CANCEL */}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#0006", justifyContent: "center" },

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
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#eee"
  },

  image: {
    width: "100%",
    height: "100%"
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#777",
    marginBottom: 5
  },

  sessionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10
  },

  sessionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#eee"
  },

  sessionChipActive: {
    backgroundColor: "#4B3F72"
  },

  sessionText: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600"
  },

  sessionTextActive: {
    color: "#fff"
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