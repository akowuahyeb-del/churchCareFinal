// screens/ApprovalCenterScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function ApprovalCenterScreen({
  navigation,
  route,
}) {
  const viewerMemberId =
    route?.params?.viewerMemberId || null;

  const [activeEntity, setActiveEntity] =
    useState(null);

  const [pendingItems, setPendingItems] =
    useState([]);
    const [
  selectedCategory,
  setSelectedCategory,
] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const organizationId =
    activeEntity?.organizationId;

  const entityId =
    activeEntity?.entityId;

  /* ──────────────────────────
     ACTIVE ENTITY
  ────────────────────────── */
  useEffect(() => {
    AsyncStorage.getItem("activeEntity")
      .then((data) => {
        if (!data) return;

        try {
          setActiveEntity(
            JSON.parse(data)
          );
        } catch (_) {}
      });
  }, []);

  /* ──────────────────────────
     LOAD APPROVALS
  ────────────────────────── */
  useEffect(() => {
    if (!organizationId || !entityId) {
      return;
    }

    loadPendingApprovals();
  }, [
    organizationId,
    entityId,
  ]);

  const loadPendingApprovals =
    async () => {
      setLoading(true);

      try {
       const snap =
  await getDocs(
    collection(
      db,
      "organizations",
      organizationId,
      "approvalRequests"
    )
  );
const results =
  snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    .filter(
      (r) => r.status === "pending"
    );

setPendingItems(results);

        setPendingItems(results);
      } catch (e) {
        console.log(
          "❌ approval centre:",
          e
        );
      } finally {
        setLoading(false);
      }
    };
const categories = [

  {
    key: "governance",
    label: "Governance",
  },

  {
    key: "disciplinary",
    label: "Disciplinary",
  },

  {
    key: "finance",
    label: "Finance",
  },

  {
    key: "transfers",
    label: "Transfers",
  },

];
 
  const renderItem = ({ item }) => {

  return (
    <TouchableOpacity
  style={styles.card}
  onPress={() =>
    console.log(
      "OPEN REQUEST",
      item
    )
  }
>
      <Text style={styles.name}>
        {item.memberName || "Unknown Member"}
      </Text>

     <Text style={styles.action}>
  {item.type === "governance"
    ? item.nominationType === "leadership"
      ? "Leadership Nomination"
      : "Membership Nomination"
    : item.type}
</Text>

     <Text style={styles.count}>
  {item.governanceBodyName || "Unknown Body"}
</Text>

      <Text style={styles.link}>
        Pending Approval
      </Text>
    </TouchableOpacity>
  );
};

if (loading) {
  return (
    <View style={styles.center}>
      <ActivityIndicator
        size="large"
        color="#4B3F72"
      />
    </View>
  );
}

  return (
    <View style={styles.container}>
  <AppHeader
    title="Approval Centre"
    subtitle="Pending disciplinary approvals"
    onBack={() => navigation.goBack()}
  />

  {!selectedCategory ? (

  <ScrollView
    contentContainerStyle={{
      padding: 16,
      paddingBottom: 100,
    }}
  >

    <Text
      style={{
        fontSize: 14,
        fontWeight: "700",
        color: "#4B3F72",
        marginBottom: 16,
      }}
    >
      Approval Categories
    </Text>

    {categories.map((category) => {

  const count =
    pendingItems.filter(
      (item) =>
        item.type === category.key
    ).length;

  return (

    <TouchableOpacity
      key={category.key}
      style={styles.card}
      onPress={() =>
        setSelectedCategory(
          category.key
        )
      }
    >

          <Text style={styles.name}>
            {category.label}
          </Text>

          <Text style={styles.count}>
            {count} Pending
          </Text>

        </TouchableOpacity>

      );

    })}

  </ScrollView>

) : (

  <FlatList
    data={pendingItems.filter(
      (item) =>
        item.type === selectedCategory
    )}
    keyExtractor={(item) => item.id}
    renderItem={renderItem}
    contentContainerStyle={{
      padding: 16,
      paddingBottom: 100,
    }}
    ListHeaderComponent={
      <TouchableOpacity
        onPress={() =>
          setSelectedCategory(null)
        }
        style={{
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: "#4B3F72",
            fontWeight: "700",
          }}
        >
          ← Back to Categories
        </Text>
      </TouchableOpacity>
    }
    ListEmptyComponent={
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No pending requests
        </Text>
      </View>
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4B3F72",
  },

  subHeader: {
    color: "#777",
    marginBottom: 20,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  approvalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  action: {
    color: "#e67e22",
    fontWeight: "700",
  },

  count: {
    color: "#888",
  },

  link: {
    marginTop: 10,
    color: "#4B3F72",
    fontWeight: "700",
  },

  empty: {
    paddingTop: 60,
    alignItems: "center",
  },

  emptyText: {
    color: "#999",
    fontSize: 14,
  },
});