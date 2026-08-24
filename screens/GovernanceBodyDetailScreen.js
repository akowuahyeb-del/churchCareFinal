import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function GovernanceBodyDetailScreen({ navigation, route }) {
  const [memberCount, setMemberCount] = useState(0);
  const [leaderName, setLeaderName] = useState("Not Assigned");

  const governanceBody = route?.params?.governanceBody || {
    name: "Session",
    leadershipRole: "Senior Presbyter",
    memberLabel: "Session Members",
    exOfficioLabel: "Agents",
  };

  const loadDetails = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("activeEntity");
      if (!stored) return;
      const entity = JSON.parse(stored);

      const snap = await getDocs(
        collection(db, "organizations", entity.organizationId, "governanceMemberships")
      );

      let activeCount = 0;
      let currentLeader = null;

      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.governanceBodyId !== governanceBody.id) return;

        const category = data.category || "member"; // legacy-doc fallback

        // FIX: only count active ordinary members, not former ones.
        if (data.status === "active" && category === "member") {
          activeCount++;
        }
        // FIX: pull the actual active leadership holder instead of a
        // hardcoded "Not Assigned" label.
        if (data.status === "active" && category === "leadership") {
          currentLeader = data;
        }
      });

      setMemberCount(activeCount);
      setLeaderName(currentLeader?.memberName || "Not Assigned");
    } catch (error) {
      console.log("loadDetails", error);
    }
  }, [governanceBody]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={governanceBody.name}
        subtitle="Governance Body"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Leadership Role */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>LEADERSHIP ROLE</Text>
          <Text style={styles.mainName}>{leaderName}</Text>
          <Text style={styles.roleText}>{governanceBody.leadershipRole}</Text>

          {/* FIX: wired to the new role-assignment screen */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate("GovernanceRoleManagement", { governanceBody })
            }
          >
            <Text style={styles.actionText}>
              {leaderName === "Not Assigned" ? "Assign" : "Replace"} {governanceBody.leadershipRole}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Members */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {(governanceBody.memberLabel || "Members").toUpperCase()}
          </Text>
          <Text style={styles.countText}>{memberCount} Members</Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate("GovernanceBodyMembers", {
                governanceBody,
                category: "member",
              })
            }
          >
            <Text style={styles.actionText}>Manage {governanceBody.memberLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Ex-Officio Members */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {(governanceBody.exOfficioLabel || "Ex-Officio Members").toUpperCase()}
          </Text>
          <Text style={styles.infoText}>Members of the body by virtue of office.</Text>

          {/* FIX: wired to the same member-management screen, tagged
              as ex_officio so it doesn't mix with ordinary members */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate("GovernanceBodyMembers", {
                governanceBody,
                category: "ex_officio",
              })
            }
          >
            <Text style={styles.actionText}>Manage {governanceBody.exOfficioLabel}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionLabel: { fontSize: 12, color: "#666", fontWeight: "700", marginBottom: 8 },
  mainName: { fontSize: 20, fontWeight: "700" },
  roleText: { color: "#4B3F72", marginTop: 4 },
  countText: { fontSize: 16, fontWeight: "600" },
  infoText: { color: "#666" },
  actionBtn: { marginTop: 12, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  actionText: { color: "#FFF", fontWeight: "700" },
});