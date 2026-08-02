// screens/ApprovalCenterScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
              "entities",
              entityId,
              "members"
            )
          );

        const results =
          snap.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            }))
            .filter((m) => {
              const pending =
                m.pendingApprovals || {};

              return (
                Object.keys(
                  pending
                ).length > 0
              );
            });

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

  const renderItem = ({ item }) => {
    const pending =
      item.pendingApprovals || {};

    const actions =
      Object.keys(pending);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate(
            "MemberProfile",
            {
              memberId: item.id,
              viewerMemberId,
              initialTab: "status",
            }
          )
        }
      >
        <Text style={styles.name}>
          {item.name || "Unnamed Member"}
        </Text>

        {actions.map((action) => (
          <View
            key={action}
            style={styles.approvalRow}
          >
            <Text style={styles.action}>
              {action}
            </Text>

            <Text style={styles.count}>
              {
                pending[action]
                  ?.length || 0
              } approvals
            </Text>
          </View>
        ))}

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

  <FlatList
  data={pendingItems}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  }}
  ListHeaderComponent={
    <View
      style={{
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: "#4B3F72",
        }}
      >
        Pending Approvals ({pendingItems.length})
      </Text>
    </View>
  }
  ListEmptyComponent={
    <View style={styles.empty}>
      <Text style={styles.emptyText}>
        ✅ No pending approvals
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: "#999",
          textAlign: "center",
        }}
      >
        All disciplinary requests have been resolved.
      </Text>
    </View>
  }
/>
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