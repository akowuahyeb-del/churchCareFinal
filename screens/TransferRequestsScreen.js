import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import {
  collection, getDocs, query, where, updateDoc, doc
} from "firebase/firestore";

export default function TransferRequestsScreen({ route }) {
  const { churchId } = route.params || {};

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const q = query(
        collection(db, "transfer_requests"),
        where("fromChurchId", "==", churchId),
        where("status", "==", "pending")
      );

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setRequests(data);
    } catch (e) {
      console.log(e);
    }
  };

  const approveRequest = async (req) => {
    try {
      await updateDoc(doc(db, "members", req.memberId), {
        churchId: req.toChurchId
      });

      await updateDoc(doc(db, "transfer_requests", req.id), {
        status: "approved"
      });

      Alert.alert("✅ Approved");
      loadRequests();
    } catch (e) {
      Alert.alert("Error");
    }
  };

  const rejectRequest = async (req) => {
    try {
      await updateDoc(doc(db, "transfer_requests", req.id), {
        status: "rejected"
      });

      Alert.alert("Rejected");
      loadRequests();
    } catch (e) {
      Alert.alert("Error");
    }
  };

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 12 }}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 40 }}>
          No pending requests
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.memberName}</Text>

          <Text style={styles.meta}>
            {item.fromChurchId} → {item.toChurchId}
          </Text>

          <Text style={styles.reason}>
            {item.reason}
          </Text>

          <View style={styles.actions}>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => approveRequest(item)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => rejectRequest(item)}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>

          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  reason: {
    fontSize: 13,
    marginTop: 6,
    color: "#555",
  },
  actions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#27ae60",
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
});