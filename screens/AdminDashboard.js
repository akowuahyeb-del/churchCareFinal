import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Modal, TextInput
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import { db, storage } from "../firebase";
import {
  collection, addDoc, deleteDoc, doc,
  updateDoc, onSnapshot
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const churchId = "church1"; // ✅ multi-church base

export default function AdminDashboard() {

  const [events, setEvents] = useState([]);
  const [flyers, setFlyers] = useState([]);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  /* ✅ LOAD DATA */
  useEffect(() => {

    const ev = onSnapshot(collection(db, "events"), snap =>
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const fl = onSnapshot(collection(db, "flyers"), snap =>
      setFlyers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { ev(); fl(); };

  }, []);

  /* ✅ IMAGE UPLOAD */
  const uploadImage = async () => {

    const result = await ImagePicker.launchImageLibraryAsync();
    if (result.canceled) return null;

    const response = await fetch(result.assets[0].uri);
    const blob = await response.blob();

    const imageRef = ref(storage, "uploads/" + Date.now());
    await uploadBytes(imageRef, blob);

    return await getDownloadURL(imageRef);
  };

  /* ✅ ADD FLYER */
  const addFlyer = async () => {
    const url = await uploadImage();

    await addDoc(collection(db, "flyers"), {
      image: url,
      churchId,
      expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  };

  /* ✅ SAVE EVENT */
  const saveEvent = async () => {

    if (editing) {
      await updateDoc(doc(db, "events", editing.id), {
        title,
        date,
        churchId
      });
    } else {
      await addDoc(collection(db, "events"), {
        title,
        date,
        churchId,
        expireAt: date
      });
    }

    setModal(false);
    setEditing(null);
    setTitle("");
  };

  return (
    <ScrollView style={{ padding: 15 }}>

      {/* ✅ FLYERS */}
      <Text style={styles.title}>Flyer Manager</Text>

      <TouchableOpacity style={styles.btn} onPress={addFlyer}>
        <Text style={styles.btnText}>Upload Flyer</Text>
      </TouchableOpacity>

      {flyers.map(f => (
        <View key={f.id} style={styles.card}>
          <Image source={{ uri: f.image }} style={{ height: 120 }} />
          <TouchableOpacity onPress={() =>
            deleteDoc(doc(db, "flyers", f.id))
          }>
            <Text style={{ color: "red" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* ✅ EVENTS */}
      <Text style={styles.title}>Events Manager</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => setModal(true)}
      >
        <Text style={styles.btnText}>Add Event</Text>
      </TouchableOpacity>

      {events.map(e => (
        <View key={e.id} style={styles.card}>
          <Text>{e.title}</Text>
          <Text>{new Date(e.date?.seconds * 1000).toLocaleString()}</Text>

          <TouchableOpacity onPress={() => {
            setEditing(e);
            setTitle(e.title);
            setModal(true);
          }}>
            <Text style={{ color: "blue" }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() =>
            deleteDoc(doc(db, "events", e.id))
          }>
            <Text style={{ color: "red" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* ✅ MODAL */}
      <Modal visible={modal} animationType="slide">
        <View style={{ padding: 20 }}>

          <TextInput
            placeholder="Event Title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <Text>{date.toLocaleString()}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="datetime"
              onChange={(e, d) => {
                setShowPicker(false);
                if (d) setDate(d);
              }}
            />
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={saveEvent}>
            <Text style={{ color: "#fff" }}>Save</Text>
          </TouchableOpacity>

        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", fontSize: 18, marginBottom: 10 },
  btn: { backgroundColor: "#4B3F72", padding: 10, borderRadius: 8, marginBottom: 10 },
  btnText: { color: "#fff", textAlign: "center" },
  card: { backgroundColor: "#fff", padding: 10, marginBottom: 10, borderRadius: 8 },
  input: { backgroundColor: "#eee", padding: 10, marginBottom: 10 },
  saveBtn: { backgroundColor: "#1BA97F", padding: 12, borderRadius: 8 }
});