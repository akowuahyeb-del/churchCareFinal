// screens/OrganisationManageScreen.js
// ✅ RENAMED from OrganisationSetupScreen — this is now purely a
// MANAGEMENT screen for nodes that already exist after approval.
// The setup wizard (template picker + seed) has moved into
// CreateChurchScreen and ApprovalScreen respectively.
//
// What was removed:
//   - Template picker (now in CreateChurch Step 2)
//   - "Seed Sample Structure" as primary action (now auto-runs on approval)
//   - "Change template" button (changing template post-approval is a
//     support action, not self-service — it would invalidate nodes)
//
// What remains:
//   - Add/rename/delete individual nodes
//   - Add sibling congregations under an existing district
//   - Re-link a node to a different entity
//   - Emergency re-seed if nodes were accidentally deleted

import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, doc, getDoc, getDocs, addDoc,
  updateDoc, deleteDoc, setDoc, query, where, writeBatch
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";
import { getTemplate, getLevelById, getParentLevel, getChildLevel } from "../constants/organizationTemplates";

export default function OrganisationManageScreen() {
  const navigation = useNavigation();
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId = activeEntity?.entityId;

  const [templateId, setTemplateId] = useState("presbyterian");
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nodeModal, setNodeModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeName, setNodeName] = useState("");
  const [nodeLevelId, setNodeLevelId] = useState("");
  const [nodeParentId, setNodeParentId] = useState("");
  const [linkSelf, setLinkSelf] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  const loadStructure = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const structSnap = await getDoc(doc(db, "organizations", organizationId, "settings", "structure"));
      if (structSnap.exists()) setTemplateId(structSnap.data().templateId || "presbyterian");
      const nodesSnap = await getDocs(collection(db, "organizations", organizationId, "nodes"));
      setNodes(nodesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("❌ loadStructure:", e);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { loadStructure(); }, [loadStructure]);

  const template = getTemplate(templateId);
  const thisEntityNode = nodes.find(n => n.entityId === entityId);

  const openAddNode = (levelId = "", parentId = "") => {
    setEditingNode(null);
    setNodeName("");
    setNodeLevelId(levelId);
    setNodeParentId(parentId);
    setLinkSelf(false);
    setNodeModal(true);
  };

  const openEditNode = (node) => {
    setEditingNode(node);
    setNodeName(node.name);
    setNodeLevelId(node.levelId);
    setNodeParentId(node.parentNodeId || "");
    setLinkSelf(!!node.entityId);
    setNodeModal(true);
  };

  const saveNode = async () => {
    if (!nodeName.trim() || !nodeLevelId) return;
    setSaving(true);
    try {
      const payload = {
        name: nodeName.trim(),
        levelId: nodeLevelId,
        parentNodeId: nodeParentId || null,
        entityId: linkSelf ? entityId : (editingNode?.entityId || null),
        status: "active",
        updatedAt: new Date().toISOString(),
      };
      if (editingNode) {
        await updateDoc(doc(db, "organizations", organizationId, "nodes", editingNode.id), payload);
      } else {
        await addDoc(collection(db, "organizations", organizationId, "nodes"), {
          ...payload, createdAt: new Date().toISOString()
        });
      }
      setNodeModal(false);
      await loadStructure();
    } catch (e) {
      Alert.alert("Error", "Could not save node.");
    } finally {
      setSaving(false);
    }
  };

  const deleteNode = async (node) => {
    if (nodes.some(n => n.parentNodeId === node.id)) {
      Alert.alert("Cannot Delete", `${node.name} has child nodes. Remove them first.`);
      return;
    }
    Alert.alert(`Delete "${node.name}"?`, "Removes from hierarchy. Entity data is untouched.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteDoc(doc(db, "organizations", organizationId, "nodes", node.id));
        await loadStructure();
      }}
    ]);
  };

  const getRootNodes = () => nodes.filter(n => !n.parentNodeId);
  const getChildren  = (pid) => nodes.filter(n => n.parentNodeId === pid);

  return (
    <View style={styles.container}>
      <AppHeader title="Manage Hierarchy" subtitle={template.name} showBack onBack={() => navigation.goBack()} />

      {loading ? (
        <ActivityIndicator color="#4B3F72" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>

          {/* Link status */}
          <View style={[styles.linkBanner, { backgroundColor: thisEntityNode ? "#e8f8f0" : "#fff3e0" }]}>
            <Ionicons name={thisEntityNode ? "checkmark-circle" : "alert-circle-outline"} size={16} color={thisEntityNode ? "#27ae60" : "#e67e22"} />
            <Text style={[styles.linkBannerText, { color: thisEntityNode ? "#27ae60" : "#e67e22" }]}>
              {thisEntityNode ? `Linked as: ${thisEntityNode.name} (${getLevelById(templateId, thisEntityNode.levelId)?.label})` : "This entity is not yet linked to a hierarchy node"}
            </Text>
          </View>

          {/* Template info (read-only) */}
          <View style={styles.templateInfo}>
            <Ionicons name="git-branch-outline" size={13} color="#4B3F72" />
            <Text style={styles.templateInfoText}>{template.name}</Text>
            <Text style={styles.templateInfoNote}>(set at registration)</Text>
          </View>

          {/* Nodes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nodes ({nodes.length})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => openAddNode(template.levels[0].id)}>
              <Ionicons name="add" size={14} color="#4B3F72" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {nodes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="git-branch-outline" size={36} color="#ddd" />
              <Text style={styles.emptyText}>No hierarchy nodes found.</Text>
              <Text style={styles.emptySubText}>
                Nodes are normally created automatically at approval. If something went wrong, contact a developer.
              </Text>
            </View>
          ) : (
            getRootNodes().map(root => (
              <NodeTree
                key={root.id}
                node={root}
                depth={0}
                templateId={templateId}
                getChildren={getChildren}
                currentEntityId={entityId}
                onEdit={openEditNode}
                onDelete={deleteNode}
                onAddChild={(pid, lid) => openAddNode(lid, pid)}
              />
            ))
          )}

        </ScrollView>
      )}

      {/* NODE MODAL */}
      <Modal visible={nodeModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingNode ? "Edit Node" : "Add Node"}</Text>

            <TextInput style={styles.input} value={nodeName} onChangeText={setNodeName}
              placeholder="Node name" autoFocus />

            <Text style={styles.fieldLabel}>Level</Text>
            <View style={styles.chipRow}>
              {template.levels.map(l => (
                <TouchableOpacity key={l.id}
                  style={[styles.chip, nodeLevelId === l.id && { backgroundColor: l.color }]}
                  onPress={() => setNodeLevelId(l.id)}>
                  <Text style={[styles.chipText, nodeLevelId === l.id && { color: "#fff" }]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {nodeLevelId && getLevelById(templateId, nodeLevelId)?.rank > 1 && (
              <>
                <Text style={styles.fieldLabel}>Parent</Text>
                {nodes
                  .filter(n => n.levelId === getParentLevel(templateId, nodeLevelId)?.id)
                  .map(n => (
                    <TouchableOpacity key={n.id}
                      style={[styles.parentOption, nodeParentId === n.id && styles.parentOptionActive]}
                      onPress={() => setNodeParentId(n.id)}>
                      <Text style={styles.parentOptionText}>{n.name}</Text>
                      {nodeParentId === n.id && <Ionicons name="checkmark" size={14} color="#4B3F72" />}
                    </TouchableOpacity>
                  ))}
              </>
            )}

            <TouchableOpacity style={styles.linkToggle} onPress={() => setLinkSelf(p => !p)}>
              <Ionicons name={linkSelf ? "checkbox" : "square-outline"} size={20} color={linkSelf ? "#4B3F72" : "#999"} />
              <Text style={styles.linkToggleText}>Link this node to the current entity ("{activeEntity?.name}")</Text>
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveNode} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.white}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setNodeModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NodeTree({ node, depth, templateId, getChildren, currentEntityId, onEdit, onDelete, onAddChild }) {
  const [expanded, setExpanded] = useState(true);
  const level = getLevelById(templateId, node.levelId);
  const children = getChildren(node.id);
  const childLevel = getChildLevel(templateId, node.levelId);
  const isLinked = node.entityId === currentEntityId;

  return (
    <View style={{ marginLeft: depth * 14 }}>
      <View style={[styles.treeRow, { borderLeftColor: level?.color || "#ccc" }]}>
        {children.length > 0 ? (
          <TouchableOpacity onPress={() => setExpanded(p => !p)}>
            <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={14} color="#aaa" />
          </TouchableOpacity>
        ) : <View style={{ width: 14 }} />}

        <View style={[styles.treeIcon, { backgroundColor: (level?.color || "#ccc") + "20" }]}>
          <Ionicons name={level?.icon || "ellipse-outline"} size={12} color={level?.color || "#ccc"} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={styles.treeName}>{node.name}</Text>
            {isLinked && <View style={styles.linkedBadge}><Text style={styles.linkedBadgeText}>This App</Text></View>}
          </View>
          <Text style={styles.treeLevel}>{level?.label}</Text>
        </View>

        {childLevel && (
          <TouchableOpacity onPress={() => onAddChild(node.id, childLevel.id)}>
            <Ionicons name="add-circle-outline" size={18} color="#27ae60" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onEdit(node)}>
          <Ionicons name="pencil-outline" size={16} color="#4B3F72" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(node)}>
          <Ionicons name="trash-outline" size={16} color="#e74c3c" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {expanded && children.map(c => (
        <NodeTree key={c.id} node={c} depth={depth + 1} templateId={templateId}
          getChildren={getChildren} currentEntityId={currentEntityId}
          onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { padding: 14, paddingBottom: 60 },
  linkBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12, marginBottom: 10 },
  linkBannerText: { fontSize: 12, fontWeight: "700" },
  templateInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  templateInfoText: { fontSize: 12, fontWeight: "700", color: "#4B3F72" },
  templateInfoNote: { fontSize: 11, color: "#aaa" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#555", textTransform: "uppercase" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { fontSize: 11, color: "#4B3F72", fontWeight: "700" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, fontWeight: "700", color: "#888", marginTop: 10 },
  emptySubText: { fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 4 },
  treeRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 10, padding: 10, borderLeftWidth: 3, marginBottom: 3, elevation: 1 },
  treeIcon: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  treeName: { fontSize: 13, fontWeight: "700", color: "#222" },
  treeLevel: { fontSize: 10, color: "#aaa", marginTop: 1 },
  linkedBadge: { backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  linkedBadgeText: { fontSize: 9, color: "#4B3F72", fontWeight: "800" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" },
  modalBox: { backgroundColor: "#fff", margin: 20, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 15, fontWeight: "800", marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f0f0f0" },
  chipText: { fontSize: 12, color: "#555", fontWeight: "600" },
  parentOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 8, backgroundColor: "#f8f8f8", marginBottom: 4 },
  parentOptionActive: { backgroundColor: "#EEF0FA" },
  parentOptionText: { fontSize: 13, color: "#555" },
  linkToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "#f8f8f8", borderRadius: 10, marginTop: 10 },
  linkToggleText: { flex: 1, fontSize: 12, color: "#333" },
  modalBtnRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  modalSaveBtn: { flex: 1, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  modalCancelBtn: { flex: 1, backgroundColor: "#aaa", padding: 12, borderRadius: 10, alignItems: "center" },
  white: { color: "#fff", fontWeight: "700" },
});