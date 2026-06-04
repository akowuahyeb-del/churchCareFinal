import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, TextInput, Image, Alert
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function HistoryScreen() {

  const navigation = useNavigation();

  const tabs = [
    { name: "Overview", icon: "home", color: "#6C5CE7" },
    { name: "Founders", icon: "people", color: "#0984E3" },
    { name: "Milestones", icon: "flag", color: "#00B894" },
    { name: "Vision", icon: "eye", color: "#E17055" },
    { name: "Past Agents", icon: "person", color: "#4B3F72" }
  ];

  const [activeTab, setActiveTab] = useState("Overview");
  const [modalVisible, setModalVisible] = useState(false);

  const [history, setHistory] = useState({
    Overview: { text: "Founded in 2010", image: null },
    Founders: { text: "Rev. Mensah", image: null },
    Milestones: { text: "Major milestones", image: null },
    Vision: { text: "Church vision", image: null }
  });

  const [currentText, setCurrentText] = useState("");
  const [currentImage, setCurrentImage] = useState(null);

  const [agents, setAgents] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  const [form, setForm] = useState({
    name: "",
    years: "",
    transfer: "",
    contribution: "",
    photo: null
  });

  const openModal = () => {
    if (activeTab !== "Past Agents") {
      setCurrentText(history[activeTab].text);
      setCurrentImage(history[activeTab].image);
    }
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync();
    if (!result.canceled) {
      const uri = result.assets[0].uri;

      if (activeTab === "Past Agents") {
        setForm({ ...form, photo: uri });
      } else {
        setCurrentImage(uri);
      }
    }
  };

  const saveData = () => {
    if (activeTab === "Past Agents") {
      if (!form.name) return;

      if (editingIndex !== null) {
        const updated = [...agents];
        updated[editingIndex] = form;
        setAgents(updated);
      } else {
        setAgents([...agents, form]);
      }

      setForm({ name: "", years: "", transfer: "", contribution: "", photo: null });
      setEditingIndex(null);

    } else {
      setHistory(prev => ({
        ...prev,
        [activeTab]: { text: currentText, image: currentImage }
      }));
    }

    setModalVisible(false);
  };

  const deleteSection = () => {
    Alert.alert("Confirm Delete", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setHistory(prev => ({
            ...prev,
            [activeTab]: { text: "", image: null }
          }));
        }
      }
    ]);
  };

  const deleteAgent = (i) => {
    Alert.alert("Delete Agent", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setAgents(prev => prev.filter((_, index) => index !== i));
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.headerRow}>
        <Ionicons name="arrow-back" size={22} onPress={() => navigation.goBack()} />
        <Text style={styles.header}>Church History</Text>
      </View>

      {/* TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.name}
            onPress={() => setActiveTab(tab.name)}
            style={[
              styles.tab,
              activeTab === tab.name && { backgroundColor: tab.color }
            ]}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.name ? "#fff" : "#555"} />
            <Text style={[
              styles.tabText,
              activeTab === tab.name && styles.activeText
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CONTENT */}
      <ScrollView style={styles.contentArea}>

        {activeTab !== "Past Agents" && (
          <View style={styles.card}>

            {history[activeTab].image && (
              <Image source={{ uri: history[activeTab].image }} style={styles.photo} />
            )}

            <Text>{history[activeTab].text}</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.btn} onPress={openModal}>
                <Text style={styles.btnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteBtn} onPress={deleteSection}>
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}

        {/* ✅ TIMELINE FIXED */}
        {activeTab === "Past Agents" && (
          <>
            <TouchableOpacity style={styles.btn} onPress={() => {
              setEditingIndex(null);
              openModal();
            }}>
              <Text style={styles.btnText}>Add Agent</Text>
            </TouchableOpacity>

            {agents.map((a, i) => (
              <View key={i} style={styles.timelineRow}>

                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot} />
                  {i !== agents.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineCard}>

                  {a.photo && (
                    <Image source={{ uri: a.photo }} style={styles.photo} />
                  )}

                  <Text style={styles.title}>{a.name}</Text>
                  <Text>Years: {a.years}</Text>
                  <Text>Transfer: {a.transfer}</Text>
                  <Text>Contribution: {a.contribution}</Text>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.btn} onPress={() => {
                      setForm(a);
                      setEditingIndex(i);
                      setModalVisible(true);
                    }}>
                      <Text style={styles.btnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteAgent(i)}>
                      <Text style={styles.btnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                </View>

              </View>
            ))}
          </>
        )}

      </ScrollView>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>

          {activeTab === "Past Agents" ? (
            <>
              <TextInput style={styles.input} placeholder="Name"
                value={form.name} onChangeText={t => setForm({ ...form, name: t })}
              />

              <TextInput style={styles.input} placeholder="Years"
                value={form.years} onChangeText={t => setForm({ ...form, years: t })}
              />

              <TextInput style={styles.input} placeholder="Transfer"
                value={form.transfer} onChangeText={t => setForm({ ...form, transfer: t })}
              />

              <TextInput style={styles.input} placeholder="Contribution"
                value={form.contribution} onChangeText={t => setForm({ ...form, contribution: t })}
              />
            </>
          ) : (
            <TextInput style={styles.input} multiline
              value={currentText} onChangeText={setCurrentText}
            />
          )}

          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
            <Text style={styles.btnText}>Upload Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={saveData}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
            <Text>Cancel</Text>
          </TouchableOpacity>

        </View>
      </Modal>

    </View>
  );
}

/* ✅ STYLES (ONLY ONE BLOCK ✅) */
const styles = StyleSheet.create({

  container: { flex: 1, padding: 15, backgroundColor: "#f4f6fb" },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  header: { fontSize: 18, fontWeight: "700", marginLeft: 10 },

  tabsContainer: { flexDirection: "row", marginBottom: 14 },

  tab: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#eee",
    marginRight: 8
  },

  tabText: { marginLeft: 5, fontSize: 12 },
  activeText: { color: "#fff", fontWeight: "600" },

  contentArea: { marginTop: 6 },

  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 10 },

  photo: { width: "100%", height: 120, borderRadius: 10, marginBottom: 8 },

  title: { fontWeight: "700" },

  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },

  btn: { backgroundColor: "#4B3F72", padding: 8, borderRadius: 6 },

  deleteBtn: { backgroundColor: "#D63031", padding: 8, borderRadius: 6 },

  btnText: { color: "#fff" },

  modalContainer: { flex: 1, padding: 20 },

  input: { backgroundColor: "#f1f1f1", padding: 10, borderRadius: 8, marginBottom: 10 },

  uploadBtn: { backgroundColor: "#0984E3", padding: 10, borderRadius: 8, marginBottom: 10, alignItems: "center" },

  saveBtn: { backgroundColor: "#1BA97F", padding: 10, borderRadius: 8, alignItems: "center" },

  cancelBtn: { marginTop: 10, alignItems: "center" },

  /* ✅ TIMELINE */
  timelineRow: { flexDirection: "row", marginBottom: 20 },
  timelineLeft: { width: 30, alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4B3F72", marginTop: 6 },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#ccc", marginTop: 2 },

  timelineCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginLeft: 8
  }

});
