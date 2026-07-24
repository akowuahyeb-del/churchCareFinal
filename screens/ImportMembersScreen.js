import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import {
  MEMBER_LIFECYCLE,
  MEMBER_SOURCES,
} from "../constants/memberLifecycle";

export default function ImportMembersScreen({ navigation, route }) {

  const { entityId, organizationId } = route.params || {};

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ PICK CSV FILE
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "text/csv"
    });

    if (result.canceled) return;

    const file = result.assets[0];

    try {
      const response = await fetch(file.uri);
      const text = await response.text();

      parseCSV(text);

    } catch (e) {
      Alert.alert("Error", "Failed to read file");
    }
  };

  // ✅ SIMPLE CSV PARSER
  const parseCSV = (text) => {
    const lines = text.split("\n");

    const headers = lines[0].split(",").map(h => h.trim());

    const data = lines.slice(1).map(line => {
      const values = line.split(",");

      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i]?.trim();
      });

      return obj;
    });

    setRows(data);
  };

  // ✅ UPLOAD TO FIRESTORE
  const uploadMembers = async () => {
  if (!entityId || !organizationId) {
    Alert.alert("Error", "No active church selected");
    return;
  }

  if (!rows.length) {
    Alert.alert("No data", "Upload a file first");
    return;
  }

  setLoading(true);

  try {
    for (let row of rows) {
      await addDoc(
        collection(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "members"
        ),
        {
          name: row.name || "",
          phone: row.phone || "",
          ministry: row.ministry || "",
          status: row.status || "Regular",

          entityId,
          organizationId,

          lifecycleStatus:
            MEMBER_LIFECYCLE.MEMBER,

          source:
            MEMBER_SOURCES.BULK_UPLOAD,

          lastStageChangeAt:
            new Date().toISOString(),

          lastChangedByUid:
            null,

          statusHistory: [
            {
              status:
                MEMBER_LIFECYCLE.MEMBER,

              changedAt:
                new Date().toISOString(),

              changedByUid:
                null,

              note:
                "Imported via CSV"
            }
          ],

          createdAt:
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString()
        }
      );
    }

    Alert.alert(
      "✅ Success",
      "Members imported successfully"
    );

    navigation.goBack();

  } catch (e) {
    Alert.alert(
      "Error",
      e.message
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Import Members (CSV)</Text>

      {/* ✅ PICK FILE */}
      <TouchableOpacity style={styles.btn} onPress={pickFile}>
        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
        <Text style={styles.white}> Choose CSV File</Text>
      </TouchableOpacity>

      {/* ✅ PREVIEW */}
      <FlatList
        data={rows}
        keyExtractor={(item, idx) => idx.toString()}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.phone}</Text>
          </View>
        )}
      />

      {/* ✅ UPLOAD BUTTON */}
      <TouchableOpacity
        style={[styles.btn, { marginTop: 20 }]}
        onPress={uploadMembers}
      >
        <Ionicons name="checkmark" size={18} color="#fff" />
        <Text style={styles.white}>
          {loading ? "Uploading..." : "Import Members"}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12
  },

  btn: {
    flexDirection: "row",
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },

  white: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "600"
  },

  row: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },

  name: {
    fontWeight: "700",
    fontSize: 14
  },

  meta: {
    fontSize: 12,
    color: "#666"
  }
});