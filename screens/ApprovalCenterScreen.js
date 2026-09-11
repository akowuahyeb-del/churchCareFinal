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
  TextInput,
} from "react-native";


import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

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

 const [approvalItems, setApprovalItems] =
  useState([]);
    const [
  selectedCategory,
  setSelectedCategory,
] = useState(null);
const [
  search,
  setSearch,
] = useState("");

const [
  statusFilter,
  setStatusFilter,
] = useState("pending");


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
  if (!organizationId) {
    return;
  }

  loadPendingApprovals();
}, [
  organizationId,
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
  snap.docs.map((d) => {

    console.log(
      "APPROVAL ITEM",
      JSON.stringify(
        d.data(),
        null,
        2
      )
    );

    return {
      id: d.id,
      ...d.data(),
    };
  });

console.log(
  "ALL APPROVALS",
  results.length
);

setApprovalItems(results);

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
    key: "transfer",
    label: "Transfers",
  },

];
 
const renderItem = ({ item }) => {

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate(
          "ApprovalRequestDetail",
          {
            request: item,
          }
        )
      }
    >
      <Text style={styles.name}>
        {item.memberName || "Unknown Member"}
      </Text>

      <Text style={styles.action}>
  {item.nominationType || "Governance Request"}
</Text>

      <Text style={styles.count}>
        {item.governanceBodyName}
      </Text>

      <Text style={styles.link}>
        View Request →
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
  approvalItems.filter(
    (item) =>
      (item.type || "").toLowerCase() ===
      category.key.toLowerCase() &&
      item.status === statusFilter
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
  {
    approvalItems.filter(
      (item) =>
        (item.type || "").toLowerCase() ===
          category.key.toLowerCase() &&
        item.status === "pending"
    ).length
  }
  {" "}
  Pending
</Text>

        </TouchableOpacity>

      );

    })}

  </ScrollView>

) : (

  

  <View style={{ flex: 1 }}>

  <TextInput
    style={styles.search}
    placeholder="Search requests..."
    placeholderTextColor="#888"
    value={search}
    onChangeText={setSearch}
  />

  <View style={styles.filterRow}>

    <TouchableOpacity
      style={[
        styles.filterChip,
        statusFilter === "pending" &&
        styles.filterChipSelected,
      ]}
      onPress={() =>
        setStatusFilter("pending")
      }
    >
      <Text>Pending</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.filterChip,
        statusFilter === "approved" &&
        styles.filterChipSelected,
      ]}
      onPress={() =>
        setStatusFilter("approved")
      }
    >
      <Text>Approved</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.filterChip,
        statusFilter === "rejected" &&
        styles.filterChipSelected,
      ]}
      onPress={() =>
        setStatusFilter("rejected")
      }
    >
      <Text>Rejected</Text>
    </TouchableOpacity>

  </View>

  <Text>
  Category: {selectedCategory}
</Text>

<Text>
  Status: {statusFilter}
</Text>

<Text>
  Matching:
  {
    approvalItems
      .filter(
        (item) =>
          item.type === selectedCategory
      )
      .filter(
        (item) =>
          item.status === statusFilter
      ).length
  }
</Text>

  <FlatList
    data={approvalItems
      .filter(
        (item) =>
          item.type === selectedCategory
      )
      .filter(
        (item) =>
          item.status === statusFilter
      )
      .filter(
        (item) =>
          (
            item.memberName || ""
          )
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
      )
    }
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
          No matching requests
        </Text>
      </View>
    }
  />
</View>
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
  search: {
  backgroundColor: "#FFF",
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
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
});