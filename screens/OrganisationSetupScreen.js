// screens/OrganisationSetupScreen.js
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
import {
  ORGANIZATION_TEMPLATES, getTemplate, getLevelById,
  getParentLevel, getChildLevel, isBottomLevel
} from "../constants/organizationTemplates";

export default function OrganisationSetupScreen() {
  const navigation = useNavigation();
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;
  const isSuperAdmin = true;

  const [templateId, setTemplateId] = useState("presbyterian");
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [nodeModal, setNodeModal]     = useState(false);
  const [editingNode, setEditingNode] = useState(null); // null = new
  const [nodeName, setNodeName]       = useState("");
  const [nodeLevelId, setNodeLevelId] = useState("");
  const [nodeParentId, setNodeParentId] = useState("");
  const [nodeEntityId, setNodeEntityId] = useState("");
  const [linkSelf, setLinkSelf]       = useState(false);

  const [templateModal, setTemplateModal] = useState(false);
  const [seedModal, setSeedModal]         = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  const loadStructure = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      // Load template setting
      const structSnap = await getDoc(
        doc(db, "organizations", organizationId, "settings", "structure")
      );
      if (structSnap.exists()) setTemplateId(structSnap.data().templateId || "presbyterian");

      // Load all nodes
      const nodesSnap = await getDocs(
        collection(db, "organizations", organizationId, "nodes")
      );
      setNodes(nodesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("❌ Load structure error:", e);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { loadStructure(); }, [loadStructure]);

  const template = getTemplate(templateId);

  // ── SAVE TEMPLATE CHOICE ──
  const saveTemplate = async (tid) => {
    if (!organizationId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "organizations", organizationId, "settings", "structure"),
        { templateId: tid, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setTemplateId(tid);
      setTemplateModal(false);
      Alert.alert("✅ Saved", `Structure set to ${getTemplate(tid).name}`);
    } catch (e) {
      Alert.alert("Error", "Could not save template.");
    } finally {
      setSaving(false);
    }
  };

  // ── OPEN NODE MODAL ──
  const openAddNode = (levelId = "", parentId = "") => {
    setEditingNode(null);
    setNodeName("");
    setNodeLevelId(levelId);
    setNodeParentId(parentId);
    setNodeEntityId("");
    setLinkSelf(false);
    setNodeModal(true);
  };

  const openEditNode = (node) => {
    setEditingNode(node);
    setNodeName(node.name);
    setNodeLevelId(node.levelId);
    setNodeParentId(node.parentNodeId || "");
    setNodeEntityId(node.entityId || "");
    setLinkSelf(!!node.entityId);
    setNodeModal(true);
  };

  // ── SAVE NODE ──
  const saveNode = async () => {
    if (!nodeName.trim()) {
      Alert.alert("Required", "Please enter a name for this node.");
      return;
    }
    if (!nodeLevelId) {
      Alert.alert("Required", "Please select the level for this node.");
      return;
    }
    if (!organizationId) return;

    setSaving(true);
    try {
      const payload = {
        name: nodeName.trim(),
        levelId: nodeLevelId,
        parentNodeId: nodeParentId || null,
        entityId: linkSelf ? (nodeEntityId || entityId) : null,
        status: "active",
        updatedAt: new Date().toISOString(),
      };

      if (editingNode) {
        await updateDoc(
          doc(db, "organizations", organizationId, "nodes", editingNode.id),
          payload
        );
      } else {
        payload.createdAt = new Date().toISOString();
        await addDoc(
          collection(db, "organizations", organizationId, "nodes"),
          payload
        );
      }

      setNodeModal(false);
      await loadStructure();
    } catch (e) {
      Alert.alert("Error", "Could not save node.");
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE NODE ──
  const deleteNode = async (node) => {
    // Check if it has children
    const hasChildren = nodes.some(n => n.parentNodeId === node.id);
    if (hasChildren) {
      Alert.alert(
        "Cannot Delete",
        `${node.name} has child nodes. Remove or reassign them first.`
      );
      return;
    }

    Alert.alert(
      `Delete "${node.name}"?`,
      "This removes the node from the hierarchy. It does not delete the entity or any of its data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, "organizations", organizationId, "nodes", node.id)
              );
              await loadStructure();
            } catch (e) {
              Alert.alert("Error", "Could not delete node.");
            }
          }
        }
      ]
    );
  };

  // ── SEED FULL SAMPLE STRUCTURE ──
  // ✅ Creates one node per level of the active template, automatically
  // linking the bottom level (Congregation) to the current entityId.
  // Admins can then edit names and add real siblings.
  const seedSampleStructure = async () => {
    if (!organizationId) return;
    if (nodes.length > 0) {
      Alert.alert(
        "Already has nodes",
        "This organization already has hierarchy nodes. Adding sample nodes may create duplicates. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Anyway", onPress: () => doSeed() }
        ]
      );
      return;
    }
    doSeed();
  };

  const doSeed = async () => {
    setSaving(true);
    setSeedModal(false);
    try {
      const batch = writeBatch(db);
      const refs = [];

      // Create one node per level, top to bottom
      for (let i = 0; i < template.levels.length; i++) {
        const level = template.levels[i];
        const isBottom = i === template.levels.length - 1;
        const ref = doc(collection(db, "organizations", organizationId, "nodes"));
        refs.push({ ref, rank: level.rank, levelId: level.id, label: level.label });

        batch.set(ref, {
          name: isBottom
            ? (activeEntity?.name || `My ${level.label}`)
            : `My ${level.label}`,
          levelId: level.id,
          parentNodeId: null, // filled in below
          entityId: isBottom ? entityId : null, // ✅ links current entity to bottom level
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Wire up parentNodeId top-down
      await batch.commit();

      // Reload then patch parent IDs — can't forward-reference IDs in a single batch
      const fresh = await getDocs(
        collection(db, "organizations", organizationId, "nodes")
      );
      const freshNodes = fresh.docs.map(d => ({ id: d.id, ...d.data() }));
      freshNodes.sort((a, b) => {
        const la = getLevelById(templateId, a.levelId);
        const lb = getLevelById(templateId, b.levelId);
        return (la?.rank || 0) - (lb?.rank || 0);
      });

      // Patch each node's parentNodeId to the node one rank above it
      const patchBatch = writeBatch(db);
      for (let i = 1; i < freshNodes.length; i++) {
        patchBatch.update(
          doc(db, "organizations", organizationId, "nodes", freshNodes[i].id),
          { parentNodeId: freshNodes[i - 1].id }
        );
      }
      await patchBatch.commit();

      await loadStructure();
      Alert.alert(
        "✅ Structure Created",
        `Sample ${template.name} hierarchy seeded. Edit node names below to match your real organization.`
      );
    } catch (e) {
      console.log("❌ Seed error:", e);
      Alert.alert("Error", "Could not seed structure.");
    } finally {
      setSaving(false);
    }
  };

  // ── BUILD TREE FOR DISPLAY ──
  // Nodes sorted by level rank, grouped under their parents
  const getRootNodes = () => nodes.filter(n => !n.parentNodeId);
  const getChildren = (parentId) => nodes.filter(n => n.parentNodeId === parentId);

  const thisEntityNode = nodes.find(n => n.entityId === entityId);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Hierarchy Setup"
        subtitle="Build your organization's structure"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#4B3F72" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>

          {/* ── CURRENT ENTITY LINK STATUS ── */}
          <View style={[styles.linkBanner, { backgroundColor: thisEntityNode ? "#e8f8f0" : "#fff3e0" }]}>
            <Ionicons
              name={thisEntityNode ? "checkmark-circle" : "alert-circle-outline"}
              size={18}
              color={thisEntityNode ? "#27ae60" : "#e67e22"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.linkBannerTitle, { color: thisEntityNode ? "#27ae60" : "#e67e22" }]}>
                {thisEntityNode
                  ? `This app is linked to: ${thisEntityNode.name}`
                  : "This app is not yet linked to any hierarchy node"}
              </Text>
              <Text style={styles.linkBannerSub}>
                {thisEntityNode
                  ? `Level: ${getLevelById(templateId, thisEntityNode.levelId)?.label || "—"}`
                  : "Add a node below and link it to this entity to activate hierarchy intelligence."}
              </Text>
            </View>
          </View>

          {/* ── TEMPLATE ROW ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Governance Template</Text>
            <TouchableOpacity style={styles.changeBtn} onPress={() => setTemplateModal(true)}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#4B3F72" }]}>
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templateDesc}>{template.description}</Text>
            <View style={styles.levelChips}>
              {template.levels.map((l, i) => (
                <View key={l.id} style={styles.levelChipRow}>
                  <View style={[styles.levelChip, { backgroundColor: l.color + "20" }]}>
                    <Ionicons name={l.icon} size={11} color={l.color} />
                    <Text style={[styles.levelChipText, { color: l.color }]}>{l.label}</Text>
                  </View>
                  {i < template.levels.length - 1 && (
                    <Ionicons name="arrow-forward" size={12} color="#ccc" style={{ marginHorizontal: 4 }} />
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* ── NODE TREE ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Hierarchy Nodes ({nodes.length})
            </Text>
            <TouchableOpacity
              style={styles.addRootBtn}
              onPress={() => openAddNode(template.levels[0].id, "")}
            >
              <Ionicons name="add" size={14} color="#4B3F72" />
              <Text style={styles.addRootBtnText}>Add Root</Text>
            </TouchableOpacity>
          </View>

          {nodes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="git-branch-outline" size={40} color="#ddd" />
              <Text style={styles.emptyTitle}>No nodes yet</Text>
              <Text style={styles.emptySubText}>
                Start by seeding a sample structure, or add the top-level node manually.
              </Text>
              <TouchableOpacity style={styles.seedBtn} onPress={() => setSeedModal(true)}>
                <Ionicons name="flash-outline" size={14} color="#fff" />
                <Text style={styles.seedBtnText}>Seed Sample Structure</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Recursive tree render */}
              {getRootNodes().map(root => (
                <NodeTree
                  key={root.id}
                  node={root}
                  depth={0}
                  templateId={templateId}
                  template={template}
                  getChildren={getChildren}
                  currentEntityId={entityId}
                  onEdit={openEditNode}
                  onDelete={deleteNode}
                  onAddChild={(parentId, childLevelId) => openAddNode(childLevelId, parentId)}
                />
              ))}

              <TouchableOpacity style={styles.seedSecondaryBtn} onPress={() => setSeedModal(true)}>
                <Ionicons name="flash-outline" size={13} color="#4B3F72" />
                <Text style={styles.seedSecondaryBtnText}>Re-seed Sample Structure</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      )}

      {/* ══════════ TEMPLATE PICKER MODAL ══════════ */}
      <Modal visible={templateModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Governance Template</Text>

            {Object.values(ORGANIZATION_TEMPLATES).map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.templateOption, templateId === t.id && styles.templateOptionActive]}
                onPress={() => saveTemplate(t.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateOptionName, templateId === t.id && { color: "#4B3F72" }]}>
                    {t.name}
                  </Text>
                  <Text style={styles.templateOptionDesc}>{t.description}</Text>
                </View>
                {templateId === t.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#4B3F72" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTemplateModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ SEED CONFIRMATION MODAL ══════════ */}
      <Modal visible={seedModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name="flash" size={36} color="#4B3F72" style={{ alignSelf: "center", marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Seed Sample Structure</Text>
            <Text style={styles.modalSub}>
              This will create one node per level of the <Text style={{ fontWeight: "800" }}>{template.name}</Text> structure:
            </Text>
            {template.levels.map((l, i) => (
              <View key={l.id} style={styles.seedLevelRow}>
                <View style={[styles.seedLevelDot, { backgroundColor: l.color }]} />
                <Text style={styles.seedLevelText}>
                  {l.label}
                  {i === template.levels.length - 1 ? ` → linked to "${activeEntity?.name || "this entity"}"` : ""}
                </Text>
              </View>
            ))}
            <Text style={[styles.modalSub, { marginTop: 12 }]}>
              You can rename each node and add real siblings afterward.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={seedSampleStructure} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.white}>Seed Now</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSeedModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ ADD / EDIT NODE MODAL ══════════ */}
      <Modal visible={nodeModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingNode ? `Edit: ${editingNode.name}` : "Add Node"}
            </Text>

            {/* NAME */}
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={nodeName}
              onChangeText={setNodeName}
              placeholder="e.g. Accra Presbytery, Tema District, Prince of Peace"
              autoFocus
            />

            {/* LEVEL */}
            <Text style={styles.fieldLabel}>Level *</Text>
            <View style={styles.levelPicker}>
              {template.levels.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.levelPickerChip, nodeLevelId === l.id && { backgroundColor: l.color, borderColor: l.color }]}
                  onPress={() => {
                    setNodeLevelId(l.id);
                    // auto-clear parent if this is now top level
                    if (l.rank === 1) setNodeParentId("");
                  }}
                >
                  <Text style={[styles.levelPickerChipText, nodeLevelId === l.id && { color: "#fff" }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* PARENT — show only if not top-level */}
            {nodeLevelId && getLevelById(templateId, nodeLevelId)?.rank > 1 && (
              <>
                <Text style={styles.fieldLabel}>Parent Node *</Text>
                {nodes
                  .filter(n => {
                    const parentLevel = getParentLevel(templateId, nodeLevelId);
                    return n.levelId === parentLevel?.id && n.id !== editingNode?.id;
                  })
                  .length === 0 ? (
                  <Text style={styles.noParentsWarning}>
                    No {getParentLevel(templateId, nodeLevelId)?.label} nodes exist yet.
                    Add one first, or seed the full structure.
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                    {nodes
                      .filter(n => {
                        const parentLevel = getParentLevel(templateId, nodeLevelId);
                        return n.levelId === parentLevel?.id && n.id !== editingNode?.id;
                      })
                      .map(n => (
                        <TouchableOpacity
                          key={n.id}
                          style={[styles.parentOption, nodeParentId === n.id && styles.parentOptionActive]}
                          onPress={() => setNodeParentId(n.id)}
                        >
                          <Text style={[styles.parentOptionText, nodeParentId === n.id && { color: "#4B3F72", fontWeight: "700" }]}>
                            {n.name}
                          </Text>
                          {nodeParentId === n.id && <Ionicons name="checkmark" size={14} color="#4B3F72" />}
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                )}
              </>
            )}

            {/* LINK TO THIS ENTITY */}
            <TouchableOpacity style={styles.linkToggleRow} onPress={() => setLinkSelf(p => !p)}>
              <Ionicons name={linkSelf ? "checkbox" : "square-outline"} size={20} color={linkSelf ? "#4B3F72" : "#999"} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkToggleText}>
                  Link this node to the currently active entity
                </Text>
                <Text style={styles.linkToggleSub}>
                  "{activeEntity?.name || entityId}" — enables hierarchy intelligence for this app
                </Text>
              </View>
            </TouchableOpacity>

            {linkSelf && (
              <>
                <Text style={styles.fieldLabel}>Entity ID (auto-filled)</Text>
                <TextInput
                  style={[styles.input, { color: "#888" }]}
                  value={nodeEntityId || entityId || ""}
                  onChangeText={setNodeEntityId}
                  placeholder="Entity ID"
                />
              </>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]} onPress={saveNode} disabled={saving}>
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

/* ─────────────────────────────────────────────────────────
   Recursive tree row — renders a node and all its children
   indented, with edit/delete/add-child actions
───────────────────────────────────────────────────────── */
function NodeTree({ node, depth, templateId, template, getChildren, currentEntityId, onEdit, onDelete, onAddChild }) {
  const [expanded, setExpanded] = useState(true);
  const level = getLevelById(templateId, node.levelId);
  const children = getChildren(node.id);
  const childLevel = getChildLevel(templateId, node.levelId);
  const isLinked = node.entityId === currentEntityId;

  return (
    <View style={[styles.treeNode, { marginLeft: depth * 16 }]}>
      <View style={[styles.treeRow, { borderLeftColor: level?.color || "#ccc" }]}>
        {/* EXPAND/COLLAPSE */}
        {children.length > 0 ? (
          <TouchableOpacity onPress={() => setExpanded(p => !p)}>
            <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={16} color="#aaa" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 16 }} />
        )}

        {/* LEVEL ICON */}
        <View style={[styles.treeIcon, { backgroundColor: (level?.color || "#ccc") + "20" }]}>
          <Ionicons name={level?.icon || "ellipse-outline"} size={14} color={level?.color || "#ccc"} />
        </View>

        {/* NAME + BADGES */}
        <View style={{ flex: 1 }}>
          <View style={styles.treeNameRow}>
            <Text style={styles.treeName}>{node.name}</Text>
            {isLinked && (
              <View style={styles.linkedBadge}>
                <Ionicons name="link" size={9} color="#4B3F72" />
                <Text style={styles.linkedBadgeText}>This App</Text>
              </View>
            )}
          </View>
          <Text style={styles.treeLevelLabel}>
            {level?.label || node.levelId}
            {node.status === "inactive" ? " · Inactive" : ""}
          </Text>
        </View>

        {/* ACTIONS */}
        <View style={styles.treeActions}>
          {childLevel && (
            <TouchableOpacity
              style={styles.treeActionBtn}
              onPress={() => onAddChild(node.id, childLevel.id)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#27ae60" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.treeActionBtn} onPress={() => onEdit(node)}>
            <Ionicons name="pencil-outline" size={16} color="#4B3F72" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.treeActionBtn} onPress={() => onDelete(node)}>
            <Ionicons name="trash-outline" size={16} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      {/* CHILDREN */}
      {expanded && children.map(child => (
        <NodeTree
          key={child.id}
          node={child}
          depth={depth + 1}
          templateId={templateId}
          template={template}
          getChildren={getChildren}
          currentEntityId={currentEntityId}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: 14, paddingBottom: 80 },

  linkBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, padding: 14, marginBottom: 12 },
  linkBannerTitle: { fontSize: 13, fontWeight: "700" },
  linkBannerSub: { fontSize: 11, color: "#888", marginTop: 2 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#555", textTransform: "uppercase" },
  changeBtn: { backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  changeBtnText: { fontSize: 11, color: "#4B3F72", fontWeight: "700" },
  addRootBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addRootBtnText: { fontSize: 11, color: "#4B3F72", fontWeight: "700" },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, elevation: 1 },
  templateName: { fontSize: 15, fontWeight: "800", color: "#222" },
  templateDesc: { fontSize: 12, color: "#888", marginTop: 3, marginBottom: 10 },
  levelChips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  levelChipRow: { flexDirection: "row", alignItems: "center" },
  levelChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  levelChipText: { fontSize: 10, fontWeight: "700" },

  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 30, alignItems: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#888", marginTop: 12 },
  emptySubText: { fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 4, marginBottom: 16 },
  seedBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  seedBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  seedSecondaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", borderWidth: 1.5, borderColor: "#4B3F72", borderRadius: 10, padding: 10, marginTop: 6 },
  seedSecondaryBtnText: { color: "#4B3F72", fontWeight: "700", fontSize: 12 },

  treeNode: { marginBottom: 2 },
  treeRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 10, padding: 10, borderLeftWidth: 3, marginBottom: 2, elevation: 1 },
  treeIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  treeNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  treeName: { fontSize: 13, fontWeight: "700", color: "#222" },
  treeLevelLabel: { fontSize: 10, color: "#aaa", marginTop: 1 },
  linkedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EEF0FA", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  linkedBadgeText: { fontSize: 9, color: "#4B3F72", fontWeight: "800" },
  treeActions: { flexDirection: "row", gap: 4 },
  treeActionBtn: { padding: 4 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" },
  modalBox: { backgroundColor: "#fff", margin: 20, borderRadius: 16, padding: 20, maxHeight: "85%" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#222", marginBottom: 14, textAlign: "center" },
  modalSub: { fontSize: 12, color: "#888", lineHeight: 17, marginBottom: 8 },

  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 6 },

  levelPicker: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  levelPickerChip: { borderWidth: 1.5, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  levelPickerChipText: { fontSize: 12, color: "#555", fontWeight: "600" },

  noParentsWarning: { fontSize: 12, color: "#e67e22", padding: 10, backgroundColor: "#fff3e0", borderRadius: 8, marginBottom: 6 },

  parentOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 8, backgroundColor: "#f8f8f8", marginBottom: 4 },
  parentOptionActive: { backgroundColor: "#EEF0FA" },
  parentOptionText: { fontSize: 13, color: "#555" },

  linkToggleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, backgroundColor: "#f8f8f8", borderRadius: 10, marginTop: 12, marginBottom: 6 },
  linkToggleText: { fontSize: 13, color: "#333", fontWeight: "600" },
  linkToggleSub: { fontSize: 11, color: "#aaa", marginTop: 2 },

  templateOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#eee", marginBottom: 8 },
  templateOptionActive: { borderColor: "#4B3F72", backgroundColor: "#EEF0FA" },
  templateOptionName: { fontSize: 13, fontWeight: "700", color: "#333" },
  templateOptionDesc: { fontSize: 11, color: "#aaa", marginTop: 2 },

  seedLevelRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  seedLevelDot: { width: 8, height: 8, borderRadius: 4 },
  seedLevelText: { fontSize: 12, color: "#333" },

  modalBtnRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  modalSaveBtn: { flex: 1, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  modalCancelBtn: { flex: 1, backgroundColor: "#aaa", padding: 12, borderRadius: 10, alignItems: "center" },
  cancelBtn: { alignItems: "center", padding: 12 },
  cancelBtnText: { color: "#888", fontWeight: "600" },
  white: { color: "#fff", fontWeight: "700" },
});