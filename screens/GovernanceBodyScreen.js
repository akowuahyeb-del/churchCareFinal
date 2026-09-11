import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function GovernanceBodyScreen({ navigation }) {
  const [bodies, setBodies] = useState([]);
  const [
  search,
  setSearch,
] = useState("");
  const [
  viewMode,
  setViewMode,
] = useState("active");

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

   setBodies(
  bodiesData
    .filter((b) =>
      viewMode === "active"
        ? b.active !== false
        : b.active === false
    )
    .map((b) => ({
      ...b,
      memberCount:
        counts[b.id] || 0,
    }))
);
    } catch (error) {
      console.log("loadBodies", error);
    }
  }, [viewMode]);


  useEffect(() => {
    loadBodies();
  }, [loadBodies]);
  const toggleBodyStatus = async (
  body,
  active
) => {

  try {

    const stored =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    if (!stored) return;

    const entity =
      JSON.parse(stored);

    await updateDoc(
  doc(
    db,
    "organizations",
    entity.organizationId,
    "governanceBodies",
    body.id
  ),
  {
    active,

    archivedAt:
      !active
        ? new Date().toISOString()
        : null,
  }
);

    await loadBodies();

   Alert.alert(
  "Success",
  active
    ? "Governance body restored."
    : "Governance body archived."
);

  } catch (error) {

    Alert.alert(
      "Error",
      error.message
    );

  }

};

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Governance Bodies"
        subtitle="Manage church governance"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TextInput
  style={styles.search}
  placeholder="Search governance bodies"
  placeholderTextColor="#888"
  value={search}
  onChangeText={setSearch}
/>

        <View
  style={styles.filterRow}
>

  <TouchableOpacity
    style={[
      styles.filterChip,
      viewMode === "active" &&
        styles.filterChipSelected,
    ]}
    onPress={() =>
      setViewMode("active")
    }
  >
    <Text>
      Active
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.filterChip,
      viewMode === "archived" &&
        styles.filterChipSelected,
    ]}
    onPress={() =>
      setViewMode("archived")
    }
  >
    <Text>
      Archived
    </Text>
  </TouchableOpacity>

</View>

        {bodies.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.name}>No Governance Bodies</Text>
            <Text style={styles.value}>Create your first governance body.</Text>
          </View>
        ) : (
          bodies
  .filter((body) =>
    body.name
      ?.toLowerCase()
      .includes(
        search.toLowerCase()
      )
  )
  .map((body) => (
            <View key={body.id} style={styles.card}>
              <Text style={styles.name}>{body.name}</Text>

              <Text style={styles.label}>Leadership Role</Text>
              <Text style={styles.value}>{body.leadershipRole}</Text>

              <Text style={styles.label}>
  Membership
</Text>

<Text style={styles.value}>
  {body.memberCount}
  {body.membershipMode === "fixed"
    ? ` / ${body.maxMembers}`
    : " (Unlimited)"}
</Text>

<Text style={styles.label}>
  Approval Threshold
</Text>

<Text style={styles.value}>
  Membership:
  {" "}
  {body.membershipApprovalThreshold || 1}
</Text>

<Text style={styles.value}>
  Leadership:
  {" "}
  {body.leadershipApprovalThreshold || 1}
</Text>


              <Text style={styles.label}>
  Status
</Text>

<Text style={styles.value}>
  {body.active
    ? "Active"
    : "Archived"}
</Text>

<Text
  style={{
    marginTop: 12,
    fontWeight: "700",
  }}
>
  Quick Actions
</Text>

             <TouchableOpacity
  style={styles.btn}
  onPress={() =>
    navigation.navigate(
      "GovernanceBodyDetail",
      {
        governanceBody: body,
      }
    )
  }
>
  <Text style={styles.btnText}>
    Open
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.editBtn}
  onPress={() =>
    navigation.navigate(
      "GovernanceBodySetup",
      {
        governanceBody: body,
      }
    )
  }
>
  <Text style={styles.btnText}>
    Edit
  </Text>
  
</TouchableOpacity>
<TouchableOpacity
  style={
    body.active
      ? styles.deactivateBtn
      : styles.reactivateBtn
  }
  onPress={() =>
    toggleBodyStatus(
      body,
      !body.active
    )
  }
>
  <Text style={styles.btnText}>
  {body.active
    ? "Archive"
    : "Restore"}
</Text>
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
  btnText: {
  color: "#FFF",
  fontWeight: "700",
},

editBtn: {
  marginTop: 10,
  backgroundColor: "#2563EB",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
},

deactivateBtn: {
  marginTop: 10,
  backgroundColor: "#B00020",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
},

reactivateBtn: {
  marginTop: 10,
  backgroundColor: "#2E7D32",
  padding: 12,
  borderRadius: 10,
  alignItems: "center",
},
filterRow: {
  flexDirection: "row",
  marginBottom: 16,
},

filterChip: {
  backgroundColor: "#EEE",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  marginRight: 8,
},

filterChipSelected: {
  backgroundColor: "#DDE3FF",
},
search: {
  backgroundColor: "#FFF",
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
},
});