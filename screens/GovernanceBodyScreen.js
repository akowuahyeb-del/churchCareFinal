import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function GovernanceBodyScreen({ navigation }) {
  const [bodies, setBodies] = useState([]);

  const loadBodies = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("activeEntity");
      if (!stored) return;
      const entity = JSON.parse(stored);

      const bodiesSnap = await getDocs(
        collection(db, "organizations", entity.organizationId, "governanceBodies")
      );
      const bodiesData = bodiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // FIX: memberCount was never stored on the governanceBodies doc.
      // Pull it from governanceMemberships in one query instead of N
      // per-body queries, counting only active, category:"member" records.
      const membershipsSnap = await getDocs(
        collection(db, "organizations", entity.organizationId, "governanceMemberships")
      );

      const counts = {};
      membershipsSnap.docs.forEach((d) => {
        const data = d.data();
        const category = data.category || "member"; // legacy-doc fallback
        if (data.status === "active" && category === "member") {
          counts[data.governanceBodyId] = (counts[data.governanceBodyId] || 0) + 1;
        }
      });

      setBodies(bodiesData.map((b) => ({ ...b, memberCount: counts[b.id] || 0 })));
    } catch (error) {
      console.log("loadBodies", error);
    }
  }, []);

  useEffect(() => {
    loadBodies();
  }, [loadBodies]);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Governance Bodies"
        subtitle="Manage church governance"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {bodies.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.name}>No Governance Bodies</Text>
            <Text style={styles.value}>Create your first governance body.</Text>
          </View>
        ) : (
          bodies.map((body) => (
            <View key={body.id} style={styles.card}>
              <Text style={styles.name}>{body.name}</Text>

              <Text style={styles.label}>Leadership Role</Text>
              <Text style={styles.value}>{body.leadershipRole}</Text>

              <Text style={styles.label}>Members</Text>
              <Text style={styles.value}>{body.memberCount}</Text>

              <TouchableOpacity
                style={styles.btn}
                onPress={() =>
                  navigation.navigate("GovernanceBodyDetail", { governanceBody: body })
                }
              >
                <Text style={styles.btnText}>Open</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate("GovernanceBodySetup")}
        >
          <Text style={styles.btnText}>Create Governance Body</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  name: { fontSize: 20, fontWeight: "700" },
  label: { marginTop: 10, fontSize: 12, color: "#666", fontWeight: "700" },
  value: { marginTop: 2 },
  btn: { marginTop: 16, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  createBtn: { backgroundColor: "#4B3F72", padding: 16, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "700" },
});