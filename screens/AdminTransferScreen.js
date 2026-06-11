import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import {
  collection, getDocs, doc, updateDoc
} from "firebase/firestore";

export default function AdminTransferScreen() {

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

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
      // ✅ move member
      await updateDoc(doc(db, "members", req.memberId), {
        churchId: req.toChurchId
      });

      // ✅ update request
      await updateDoc(doc(db, "transfer_requests", req.id), {
        status: "approved"
      });

      Alert.alert("✅ Approved", `${req.memberName} moved successfully`);

      loadRequests();
    } catch (e) {
      console.log(e);
    }
  };

  const rejectTransfer = async (req) => {
    try {
      await updateDoc(doc(db, "transfer_requests", req.id), {
        status: "rejected"
      });

      Alert.alert("Rejected", "Transfer request denied");

      loadRequests();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>Transfer Requests</Text>

      {requests.length === 0 && (
        <Text style={styles.empty}>No pending requests</Text>
      )}

      {requests.map(req => (
        <View key={req.id} style={styles.card}>

          <Text style={styles.name}>{req.memberName}</Text>

          <Text style={styles.meta}>
            From: {req.fromChurchId}
          </Text>

          <Text style={styles.meta}>
            To: {req.toChurchId}
          </Text>

          <Text style={styles.reason}>
            Reason: {req.reason}
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
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    color: "#4B3F72"
  },

  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 20
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },

  name: { fontSize: 15, fontWeight: "700" },

  meta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2
  },

  reason: {
    fontSize: 12,
    marginTop: 6,
    color: "#333"
  },

  actions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10
  },

  approveBtn: {
    flexDirection: "row",
    backgroundColor: "#27ae60",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    gap: 6
  },

  rejectBtn: {
    flexDirection: "row",
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    gap: 6
  },

  btnText: {
    color: "#fff",
    fontWeight: "700"
  }
});
