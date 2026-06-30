import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc
} from "firebase/firestore";

export default function ApprovalScreen({ route, navigation }) {
  const { organizationId, entityId, viewerName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (!organizationId || !entityId) return;

    const ref = collection(
      db,
      "organizations",
      organizationId,
      "entities",
      entityId,
      "contributions"
    );

    const q = query(ref, where("status", "==", "pending"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPending(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const approveDonation = async (item) => {
    try {
      await updateDoc(
        doc(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "contributions",
          item.id
        ),
        {
          status: "acknowledged",
          acknowledgedByName: viewerName || "Admin",
          acknowledgedAt: new Date().toISOString().slice(0, 10),
        }
      );

      Alert.alert("✅ Approved", "Donation acknowledged successfully");

    } catch (e) {
      Alert.alert("Error", "Could not approve donation");
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.headerRow}>
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={22} color="#fff" />
  </TouchableOpacity>

  <Text style={styles.title}>Pending Donations</Text>
</View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : pending.length === 0 ? (
        <View style={styles.empty}>
          <Text>No pending donations 🎉</Text>
        </View>
      ) : (
        <ScrollView style={{ padding: 16 }}>

          {pending.map(item => (
            <View key={item.id} style={styles.card}>

              <View style={styles.row}>
                <Text style={styles.amount}>
                  GH₵ {item.amount}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Pending</Text>
                </View>
              </View>

              <Text style={styles.meta}>
                {item.memberName} · {item.type}
              </Text>

              <Text style={styles.meta}>
                {item.methodLabel}
                {item.momoProvider ? ` · ${item.momoProvider}` : ""}
              </Text>

              {item.reference && (
                <Text style={styles.meta}>
                  Ref: {item.reference}
                </Text>
              )}

              <Text style={styles.recorded}>
                Recorded by {item.recordedBy || "—"}
              </Text>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => approveDonation(item)}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>

            </View>
          ))}

        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  header: {
    backgroundColor: "#4B3F72",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },

  empty: {
    alignItems: "center",
    marginTop: 50
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#e67e22"
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  amount: {
    fontSize: 18,
    fontWeight: "900"
  },

  badge: {
    backgroundColor: "#fff3e0",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#e67e22"
  },

  meta: {
    fontSize: 12,
    color: "#666",
    marginTop: 6
  },

  recorded: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 4
  },

  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#27ae60",
    borderRadius: 10,
    padding: 12,
    marginTop: 12
  },
headerRow: {
  backgroundColor: "#4B3F72",
  paddingTop: 50,
  paddingBottom: 16,
  paddingHorizontal: 16,
  flexDirection: "row",
  alignItems: "center",
  gap: 12
},
  approveText: {
    color: "#fff",
    fontWeight: "700"
  }
});