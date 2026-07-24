// screens/DuplicateReviewScreen.js
//
// Shown after a bulk upload flags possible duplicates. For each flagged
// row, the admin picks: merge it into the existing matched member, or
// confirm it's really a separate person and create it anyway.
//
// Expects route.params: { organizationId, entityId, duplicates }
// where duplicates: [{ row: {name, phone, email, ...}, matches: [{id, name, phone, lifecycleStatus, ...}] }]

import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, SafeAreaView, StatusBar, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { forceCreateMember, mergeIntoExistingMember } from "../utils/memberIntake";

export default function DuplicateReviewScreen({ navigation, route }) {
  const { organizationId, entityId, duplicates: initialDuplicates } = route.params || {};
  const [items, setItems] = useState(
    (initialDuplicates || []).map((d, i) => ({ ...d, key: String(i), resolved: false, busy: false }))
  );

  const setItem = (key, patch) => {
    setItems(prev => prev.map(it => (it.key === key ? { ...it, ...patch } : it)));
  };

  const handleMerge = async (item) => {
    setItem(item.key, { busy: true });
    try {
      const best = item.matches[0];
      await mergeIntoExistingMember({
        organizationId, entityId, existingMemberId: best.id, row: item.row,
      });
      setItem(item.key, { busy: false, resolved: true, resolution: "merged" });
    } catch (e) {
      setItem(item.key, { busy: false });
      Alert.alert("Error", e.message);
    }
  };

  const handleCreateAnyway = async (item) => {
    setItem(item.key, { busy: true });
    try {
      await forceCreateMember({ organizationId, entityId, row: item.row });
      setItem(item.key, { busy: false, resolved: true, resolution: "created" });
    } catch (e) {
      setItem(item.key, { busy: false });
      Alert.alert("Error", e.message);
    }
  };

  const remaining = items.filter(it => !it.resolved).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
      <AppHeader
        title="Review Duplicates"
        subtitle={remaining > 0 ? `${remaining} left to review` : "All resolved"}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        style={styles.body}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        data={items}
        keyExtractor={it => it.key}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No duplicates to review</Text>
          </View>
        }
        renderItem={({ item }) => {
          const best = item.matches[0];
          return (
            <View style={[styles.card, item.resolved && styles.cardResolved]}>
              <View style={styles.colRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.colLabel}>Incoming</Text>
                  <Text style={styles.name}>{item.row.name}</Text>
                  <Text style={styles.meta}>{item.row.phone || "—"}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#ccc" style={{ marginHorizontal: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.colLabel}>Existing match</Text>
                  <Text style={styles.name}>{best.name}</Text>
                  <Text style={styles.meta}>
  {best.phone || "—"} · {(best.lifecycleStatus || "member").replace("_", " ")}
</Text>

<Text style={styles.matchReason}>
  Matched on: {(best.matchedOn || "unknown").toUpperCase()}
</Text>
                </View>
              </View>

              {item.resolved ? (
                <View style={styles.resolvedTag}>
                  <Ionicons
                    name={item.resolution === "merged" ? "git-merge-outline" : "person-add-outline"}
                    size={14} color="#00B894"
                  />
                  <Text style={styles.resolvedText}>
                    {item.resolution === "merged" ? "Merged into existing record" : "Created as new record"}
                  </Text>
                </View>
              ) : item.busy ? (
                <ActivityIndicator color="#4B3F72" style={{ marginTop: 10 }} />
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#0984E3" }]} onPress={() => handleMerge(item)}>
                    <Ionicons name="git-merge-outline" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Merge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#4B3F72" }]} onPress={() => handleCreateAnyway(item)}>
                    <Ionicons name="person-add-outline" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Not a match — add anyway</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  body: { flex: 1, backgroundColor: "#f4f6fb" },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 13, color: "#aaa", marginTop: 10 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  cardResolved: { opacity: 0.6 },
  colRow: { flexDirection: "row", alignItems: "flex-start" },
  colLabel: { fontSize: 10, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginBottom: 3 },
  name: { fontSize: 14, fontWeight: "700", color: "#222" },
  meta: { fontSize: 11, color: "#888", marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, padding: 10, borderRadius: 10 },
  actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  resolvedTag: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  resolvedText: { fontSize: 12, color: "#00B894", fontWeight: "600" },
  matchReason: {
  fontSize: 11,
  color: "#0984E3",
  fontWeight: "700",
  marginTop: 3,
},
});