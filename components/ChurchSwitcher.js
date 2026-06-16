import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function ChurchSwitcher() {
  const [churchId, setChurchId] = useState(null);
  const [churches, setChurches] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    loadActiveChurch();
    loadChurches();
  }, []);

  const loadActiveChurch = async () => {
    const id = await AsyncStorage.getItem("churchId");
    setChurchId(id);
  };

  const loadChurches = async () => {
    const snap = await getDocs(collection(db, "churches"));
    setChurches(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })));
  };

  const switchChurch = async (id) => {
    await AsyncStorage.setItem("churchId", id);
    setChurchId(id);
    setVisible(false);

    // 🔥 reload app state (simple soft reset)
    console.log("✅ Switched to church:", id);
  };

  const current = churches.find(c => c.id === churchId);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text style={styles.title}>
          {current?.name || "Select Church"} ▼
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>

            <Text style={styles.heading}>Switch Church</Text>

            {churches.map(ch => (
              <TouchableOpacity
                key={ch.id}
                style={styles.item}
                onPress={() => switchChurch(ch.id)}
              >
                <Text style={[
                  styles.itemText,
                  churchId === ch.id && { fontWeight: "800" }
                ]}>
                  {ch.name}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end"
  },

  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },

  heading: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },

  item: {
    paddingVertical: 12
  },

  itemText: {
    fontSize: 14
  },

  cancel: {
    textAlign: "center",
    marginTop: 10,
    color: "red"
  }
});
