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
  Alert,
  ScrollView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { Ionicons } from "@expo/vector-icons";
import { SESSIONS } from "../constants/sessions";
import DateTimePicker from "@react-native-community/datetimepicker";


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
  const [showDatePicker, setShowDatePicker] = useState(false);
const [showExpiryPicker, setShowExpiryPicker] = useState(false);

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
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >


          <Text style={styles.title}>
            {initialData?.id ? "Edit Preacher" : "New Preacher"}
          </Text>

          {/* ✅ IMAGE */}
          <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
           {photo && photo !== "" ? (
  <Image
    source={{ uri: photo }}
    style={styles.image}
  />
) : (
              <View style={styles.placeholder}>
                <Ionicons name="camera-outline" size={20} color="#666" />
               <Text
  style={{
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600"
  }}
>
  {uploading
    ? "Uploading..."
    : "Tap to Upload Photo"}
</Text>

              </View>
            )}
          </TouchableOpacity>

        <View style={styles.row}>

  <View style={styles.half}>
    <Text style={styles.label}>Name</Text>
    <TextInput
      placeholder="Rev. Anomah"
      style={styles.input}
      value={name}
      onChangeText={setName}
    />
  </View>

  <View style={styles.half}>
    <Text style={styles.label}>Topic</Text>
    <TextInput
      placeholder="Prayer"
      style={styles.input}
      value={topic}
      onChangeText={setTopic}
    />
  </View>

</View>


        

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


          <Text style={styles.label}>Biography (Optional)</Text>

<TextInput
  placeholder="Short profile, ministry background, church affiliation..."
  style={[styles.input, { height: 50}]}
  multiline
  value={bio}
  onChangeText={setBio}
/>

        <View style={styles.row}>

  <View style={styles.half}>
    <Text style={styles.label}>Service Date</Text>

    <TouchableOpacity
      style={styles.input}
      onPress={() => setShowDatePicker(true)}
    >
      <Text>
        {date
          ? new Date(date).toLocaleDateString()
          : "Select Date"}
      </Text>
    </TouchableOpacity>
  </View>

  <View style={styles.half}>
    <Text style={styles.label}>Expiry Date</Text>

    <TouchableOpacity
      style={styles.input}
      onPress={() => setShowExpiryPicker(true)}
    >
      <Text>
        {expiry
          ? new Date(expiry).toLocaleDateString()
          : "Select Date"}
      </Text>
    </TouchableOpacity>
  </View>

</View>

{showDatePicker && (
  <DateTimePicker
    value={date ? new Date(date) : new Date()}
    mode="date"
    display="default"
    onChange={(event, selectedDate) => {
      setShowDatePicker(false);

      if (selectedDate) {
        setDate(selectedDate.toISOString());
      }
    }}
  />
)}

{showExpiryPicker && (
  <DateTimePicker
    value={expiry ? new Date(expiry) : new Date()}
    mode="date"
    display="default"
    onChange={(event, selectedDate) => {
      setShowExpiryPicker(false);

      if (selectedDate) {
        setExpiry(selectedDate.toISOString());
      }
    }}
  />
)}
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
        </ScrollView>
</View>
</View>
</Modal>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({
  overlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "center",
  alignItems: "center",
},

 box: {
  width: "92%",
  alignSelf: "center",

  backgroundColor: "#fff",

  borderRadius: 20,

  paddingHorizontal: 20,
  paddingTop: 16,
  paddingBottom: 20,

  maxHeight: "88%",

  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 8,
},



  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },

  input: {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginBottom: 8,
},

imageBox: {
  height: 100,
  borderRadius: 16,
  marginBottom: 12,
  overflow: "hidden",
  backgroundColor: "#f3f4f6",

  borderWidth: 1,
  borderColor: "#e5e7eb",

  justifyContent: "center",
  alignItems: "center",
},

image: {
  width: "100%",
  height: "100%",
  resizeMode: "cover",
},

placeholder: {
  flex: 1,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#f3f4f6",
},


  label: {
  fontSize: 12,
  fontWeight: "700",
  color: "#777",
  marginBottom: 4,
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
  paddingVertical: 12,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 4,
},

delete: {
  backgroundColor: "#e74c3c",
  paddingVertical: 12,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 6,
},

  cancel: {
    textAlign: "center",
    marginTop: 10,
    color: "#777"
  },

  white: {
    color: "#fff",
    fontWeight: "700"
  },
  row: {
  flexDirection: "row",
  gap: 10,
},

half: {
  flex: 1,
},

});