// screens/ApprovalScreen.js — developer review with auto-seed on approval
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, getDocs, doc, updateDoc, setDoc,
  query, where, writeBatch, getDoc
} from "firebase/firestore";
import { getTemplate, getLevelById } from "../constants/organizationTemplates";

export default function ApprovalScreen() {
  const navigation = useNavigation();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "organizations"), where("status", "==", "pending"))
      );
      setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("❌ loadPending:", e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ THE KEY INTEGRATION POINT:
  // When a church is approved, the templateId stored at creation time
  // is read and used to auto-seed the full hierarchy — no manual
  // "Seed Structure" step needed by the admin.
  const approveChurch = async (org) => {
    setProcessing(org.id);
    try {
      // 1. Activate the organization
      await updateDoc(doc(db, "organizations", org.id), {
        status: "active",
        approvedAt: new Date().toISOString(),
      });

      // 2. Find and activate the entity
      const entitiesSnap = await getDocs(
        collection(db, "organizations", org.id, "entities")
      );
      const entityDoc = entitiesSnap.docs[0];
      if (!entityDoc) throw new Error("No entity found");

      const entityId = entityDoc.id;
      await updateDoc(
        doc(db, "organizations", org.id, "entities", entityId),
        { status: "active", approvedAt: new Date().toISOString() }
      );

      // 3. ✅ AUTO-SEED HIERARCHY — reads templateId from the org doc
      // (set at CreateChurch Step 2). This replaces the manual
      // "Seed Sample Structure" button in OrganisationSetupScreen.
      const templateId = org.templateId || "presbyterian";
      const template = getTemplate(templateId);

      // Activate the structure settings doc
      await setDoc(
        doc(db, "organizations", org.id, "settings", "structure"),
        {
          templateId,
          status: "active",
          organizationId: org.id,
          entityId,
          activatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Create one node per level, top to bottom
      const nodeRefs = [];
      const nodesRef = collection(db, "organizations", org.id, "nodes");
      const batch1 = writeBatch(db);

      for (let i = 0; i < template.levels.length; i++) {
        const level = template.levels[i];
        const isBottom = i === template.levels.length - 1;
        const nodeRef = doc(nodesRef);
        nodeRefs.push({ ref: nodeRef, rank: level.rank, levelId: level.id });

        batch1.set(nodeRef, {
          name: isBottom ? org.name : `${org.denomination} ${level.label}`,
          levelId: level.id,
          parentNodeId: null, // patched below
          entityId: isBottom ? entityId : null, // ✅ links the congregation entity
          organizationId: org.id,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      await batch1.commit();

      // Patch parentNodeId top-down
      const batch2 = writeBatch(db);
      for (let i = 1; i < nodeRefs.length; i++) {
        batch2.update(nodeRefs[i].ref, { parentNodeId: nodeRefs[i - 1].ref.id });
      }
      await batch2.commit();

      await loadPending();
      Alert.alert(
        "✅ Approved",
        `${org.name} is now active. A full ${template.name} hierarchy has been created automatically.`
      );

    } catch (e) {
      console.log("❌ approveChurch error:", e);
      Alert.alert("Error", "Approval failed: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const rejectChurch = (org) => {
    Alert.alert(
      `Reject "${org.name}"?`,
      "This will mark the registration as rejected. The submitter will need to reapply.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "organizations", org.id), {
                status: "rejected",
                rejectedAt: new Date().toISOString(),
              });
              await loadPending();
            } catch (e) {
              Alert.alert("Error", "Could not reject.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{pending.length}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#4B3F72" size="large" style={{ marginTop: 40 }} />
      ) : pending.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>All caught up — no pending approvals</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {pending.map(org => {
            const template = getTemplate(org.templateId);
            const isProcessing = processing === org.id;

            return (
              <View key={org.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{org.name}</Text>
                    <Text style={styles.cardSub}>{org.denomination} · {org.location}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>

                {/* ✅ Shows the template they chose at registration */}
                <View style={styles.templatePreview}>
                  <Ionicons name="git-branch-outline" size={12} color="#4B3F72" />
                  <Text style={styles.templatePreviewText}>{template.name}</Text>
                </View>

                <View style={styles.templateLevelRow}>
                  {template.levels.map((l, i) => (
                    <View key={l.id} style={styles.templateLevelItem}>
                      <View style={[styles.levelDot, { backgroundColor: l.color }]} />
                      <Text style={styles.levelDotLabel}>{l.label}</Text>
                      {i < template.levels.length - 1 && (
                        <Ionicons name="arrow-forward" size={10} color="#ccc" />
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.cardDetails}>
                  {org.contactName && <Text style={styles.detailText}>👤 {org.contactName}</Text>}
                  {org.contactPhone && <Text style={styles.detailText}>📞 {org.contactPhone}</Text>}
                  {org.contactEmail && <Text style={styles.detailText}>✉️ {org.contactEmail}</Text>}
                  <Text style={styles.detailText}>📅 Submitted {org.createdAt?.slice(0, 10) || "—"}</Text>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={12} color="#0984E3" />
                  <Text style={styles.infoBoxText}>
                    Approving will activate this church and auto-create a{" "}
                    <Text style={{ fontWeight: "800" }}>{template.name}</Text> hierarchy
                    ({template.levels.length} levels, {template.levels.length} nodes).
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.approveBtn, isProcessing && { opacity: 0.6 }]}
                    onPress={() => approveChurch(org)}
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve & Activate</Text>
                        </>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectChurch(org)}>
                    <Ionicons name="close-circle" size={16} color="#fff" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  header: { backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700", flex: 1 },
  countBadge: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#bbb", marginTop: 12, fontSize: 13 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: "800", color: "#222" },
  cardSub: { fontSize: 12, color: "#888", marginTop: 2 },
  pendingBadge: { backgroundColor: "#FFF3CD", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 10, fontWeight: "800", color: "#856404" },

  templatePreview: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  templatePreviewText: { fontSize: 12, color: "#4B3F72", fontWeight: "700" },
  templateLevelRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 12 },
  templateLevelItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  levelDot: { width: 6, height: 6, borderRadius: 3 },
  levelDotLabel: { fontSize: 10, color: "#666" },

  cardDetails: { backgroundColor: "#f8f8f8", borderRadius: 10, padding: 10, gap: 4, marginBottom: 10 },
  detailText: { fontSize: 12, color: "#555" },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#E8F4FD", borderRadius: 8, padding: 10, marginBottom: 12 },
  infoBoxText: { flex: 1, fontSize: 11, color: "#0984E3", lineHeight: 16 },

  cardActions: { flexDirection: "row", gap: 8 },
  approveBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#27ae60", borderRadius: 10, padding: 12 },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#e74c3c", borderRadius: 10, padding: 12 },
  rejectBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});