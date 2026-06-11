import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import {
  collection, getDocs, doc, updateDoc
} from "firebase/firestore";

const CHURCHES = [
  { id: "church_1", name: "Main Branch" },
  { id: "church_2", name: "East Branch" },
  { id: "church_3", name: "Youth Church" },
];

export default function AdminTransferScreen() {

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const getChurchName = (id) => {
    return CHURCHES.find(c => c.id === id)?.name || id;
  };

  const loadRequests = async () => {
    try {
      const snap = await getDocs(collection(db, "transfer_requests"));

      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setRequests(data.filter(r => r.status === "pending"));
    } catch (e) {
      console.log(e);
    }
  };

  const approveTransfer = async (req) => {
    try {
      // ✅ Move member
      await updateDoc(doc(db, "members", req.memberId), {
        churchId: req.toChurchId
      });

      // ✅ Update request
      await updateDoc(doc(db, "transfer_requests", req.id), {
        status: "approved"
      });

      Alert.alert("Approved ✅", `${req.memberName} moved successfully`);

      loadRequests();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to approve");
    }
  };

  const rejectTransfer = async (req) => {
    try {
      await updateDoc(doc(db, "transfer_requests", req.id), {
        status: "rejected"
      });

      Alert.alert("Rejected", "Transfer denied");

      loadRequests();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      <Text style={styles.title}>Transfer Requests</Text>

      {requests.length === 0 && (
        <Text style={styles.empty}>No pending requests</Text>
      )}

      {requests.map(req => (
        <View key={req.id} style={styles.card}>

          <Text style={styles.name}>{req.memberName}</Text>

          <Text style={styles.meta}>
            From: {getChurchName(req.fromChurchId)}
          </Text>

          <Text style={styles.meta}>
            To: {getChurchName(req.toChurchId)}
          </Text>

          <Text style={styles.reason}>
            {req.reason}
          </Text>

          <View style={styles.actions}>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => approveTransfer(req)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => rejectTransfer(req)}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>

          </View>

        </View>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 12 },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    color: "#4B3F72"
  },

  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "#999"
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222"
  },

  meta: {
    fontSize: 12,
    color: "#777",
    marginTop: 3
  },

  reason: {
    fontSize: 12,
    color: "#444",
    marginTop: 6
  },

  actions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8
  },

  approveBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#27ae60",
    padding: 10,
    borderRadius: 8,
    gap: 6
  },

  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 8,
    gap: 6
  },

  btnText: {
    color: "#fff",
    fontWeight: "700"
  }
});
