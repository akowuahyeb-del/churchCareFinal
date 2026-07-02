import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function PendingChurchesScreen({ navigation }) {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadChurches = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "organizations"),
        where("approvalStatus", "==", "pending")
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setChurches(data);
    } catch (err) {
      console.log("Load pending churches error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChurches();
  }, []);

  const approveChurch = async (church) => {
    try {
      await updateDoc(
        doc(db, "organizations", church.id),
        {
          status: "active",
          approvalStatus: "approved",
          approvedAt: new Date().toISOString(),
        }
      );

      Alert.alert("Approved", `${church.name} approved`);
      loadChurches();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const rejectChurch = async (church) => {
    try {
      await updateDoc(
        doc(db, "organizations", church.id),
        {
          status: "rejected",
          approvalStatus: "rejected",
          rejectedAt: new Date().toISOString(),
        }
      );

      Alert.alert("Rejected", `${church.name} rejected`);
      loadChurches();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const renderChurch = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>

      <Text style={styles.meta}>
        Denomination: {item.denomination || "Not provided"}
      </Text>

      <Text style={styles.meta}>
        Status: {item.approvalStatus}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.approveBtn]}
          onPress={() => approveChurch(item)}
        >
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn]}
          onPress={() => rejectChurch(item)}
        >
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Pending Churches"
        subtitle="Review registrations"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4B3F72"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={churches}
          keyExtractor={(item) => item.id}
          renderItem={renderChurch}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No pending churches
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  meta: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  actions: {
    flexDirection: "row",
    marginTop: 12,
  },

  btn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  approveBtn: {
    backgroundColor: "#27AE60",
    marginRight: 6,
  },

  rejectBtn: {
    backgroundColor: "#E74C3C",
    marginLeft: 6,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
  },

  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#888",
  },
});