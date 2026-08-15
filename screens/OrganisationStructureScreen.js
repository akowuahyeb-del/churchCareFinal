import React, { useEffect, useState } from "react";
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import AppHeader from "../components/AppHeader";
import { useOrganizationHierarchy } from "../hooks/useOrganizationHierarchy";
import { getTemplate, getLevelById } from "../constants/organizationTemplates";

export default function OrganisationStructureScreen() {
  const navigation = useNavigation();
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId = activeEntity?.entityId;

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  const {
    structure, template, currentNode, currentLevel,
    parentLevel, childLevel,
    ancestors, descendants, siblings,
    aggregates, breadcrumb,
    loading, isConfigured, isTopLevel, isBottomLevel,
  } = useOrganizationHierarchy(organizationId, entityId);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#4B3F72" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Organisation Structure"
        subtitle={template?.name || "Governance & hierarchy"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.body}>

        {/* ── TEMPLATE BADGE ── */}
        <View style={styles.templateBadge}>
          <Ionicons name="git-branch-outline" size={14} color="#4B3F72" />
          <Text style={styles.templateBadgeText}>{template?.name}</Text>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Active</Text>
        </View>

        {/* ── HIERARCHY CHAIN VISUALIZATION ── */}
        <HierarchyChainCard template={template} currentLevel={currentLevel} />

        {/* ── BREADCRUMB — WHERE YOU ARE IN THE CHAIN ── */}
        {isConfigured && breadcrumb.length > 0 && (
          <BreadcrumbCard breadcrumb={breadcrumb} />
        )}

        {/* ── CURRENT NODE ── */}
        <CurrentNodeCard
          currentNode={currentNode}
          currentLevel={currentLevel}
          parentLevel={parentLevel}
          childLevel={childLevel}
          ancestors={ancestors}
          isConfigured={isConfigured}
        />


       {descendants?.length > 0 && (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>
      Churches  Under This {currentLevel?.label}
    </Text>

    {descendants.map(node => (
      <View
        key={node.id}
        style={styles.siblingRow}
      >
        <View
          style={[
            styles.siblingDot,
            {
              backgroundColor:
                childLevel?.color || "#4B3F72",
            },
          ]}
        />

        <Text style={styles.siblingName}>
          {node.name}
        </Text>
      </View>
    ))}
  </View>
)}



        {/* ── INTELLIGENCE: AGGREGATED STATS ── */}
        {isConfigured && aggregates && (
          <AggregatesCard
            aggregates={aggregates}
            currentLevel={currentLevel}
            isTopLevel={isTopLevel}
            isBottomLevel={isBottomLevel}
          />
        )}

        {/* ── SIBLINGS ── */}
        {siblings.length > 0 && (
          <SiblingsCard
            siblings={siblings}
            currentLevel={currentLevel}
            template={template}
          />
        )}



        {/* ── VISIBILITY SCOPE ── */}
        {isConfigured && currentLevel && (
          <VisibilityScopeCard
            currentLevel={currentLevel}
            isTopLevel={isTopLevel}
          />
        )}

        {/* ── NOT CONFIGURED ── */}
{!isConfigured && (
  <>
    <View style={styles.notConfiguredCard}>
      <Ionicons
        name="alert-circle-outline"
        size={36}
        color="#e67e22"
      />

      <Text style={styles.notConfiguredTitle}>
        Node Not Configured
      </Text>

      <Text style={styles.notConfiguredSub}>
        This entity hasn't been placed in the hierarchy yet.
        Ask a National Assembly admin to add it.
      </Text>
    </View>

    <TouchableOpacity
      style={{
        backgroundColor: "#4B3F72",
        borderRadius: 10,
        padding: 12,
        alignItems: "center",
        marginBottom: 12,
      }}
      onPress={() =>
        navigation.navigate("OrganisationSetup")
      }
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "700",
        }}
      >
        Set Up Hierarchy
      </Text>
    </TouchableOpacity>
  </>
)}

      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   HIERARCHY CHAIN — shows the full structure with current level
   highlighted
────────────────────────────────────────────────────────────── */
function HierarchyChainCard({ template, currentLevel }) {
  if (!template) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Governance Structure</Text>
      {template.levels.map((level, idx) => {
        const isCurrent = currentLevel?.id === level.id;
        return (
          <View key={level.id}>
            <View style={[styles.chainRow, isCurrent && { backgroundColor: level.color + "12", borderRadius: 10 }]}>
              <View style={[styles.chainIcon, { backgroundColor: level.color + "20" }]}>
                <Ionicons name={level.icon} size={16} color={level.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chainLabel, { color: isCurrent ? level.color : "#222" }, isCurrent && { fontWeight: "900" }]}>
                  {level.label}
                </Text>
                <Text style={styles.chainDesc}>{level.description}</Text>
              </View>
              {isCurrent && (
                <View style={[styles.youBadge, { backgroundColor: level.color }]}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            {idx < template.levels.length - 1 && (
              <View style={styles.chainArrow}>
                <Ionicons name="arrow-down" size={14} color="#ccc" />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   BREADCRUMB — National Assembly > Presbytery > District > [You]
────────────────────────────────────────────────────────────── */
function BreadcrumbCard({ breadcrumb }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Position in the Chain</Text>
      <View style={styles.breadcrumbRow}>
        {breadcrumb.map((node, idx) => (
          <View key={node.id} style={styles.breadcrumbItem}>
            {idx > 0 && <Ionicons name="chevron-forward" size={12} color="#ccc" style={{ marginHorizontal: 4 }} />}
            <View style={[styles.breadcrumbNode, node.isCurrent && { backgroundColor: node.level?.color + "20" }]}>
              {node.level && <Ionicons name={node.level.icon} size={10} color={node.level.color} />}
              <Text style={[styles.breadcrumbText, node.isCurrent && { color: node.level?.color, fontWeight: "800" }]}>
                {node.name}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   CURRENT NODE — the entity's real position + relationships
────────────────────────────────────────────────────────────── */
function CurrentNodeCard({ currentNode, currentLevel, parentLevel, childLevel, ancestors, isConfigured }) {
  if (!isConfigured) return null;

  const immediateParent = ancestors[ancestors.length - 1];

  return (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: currentLevel?.color || "#4B3F72" }]}>
      <Text style={styles.cardTitle}>Current Node</Text>

      <View style={styles.nodeRow}>
        <View style={[styles.nodeIcon, { backgroundColor: (currentLevel?.color || "#4B3F72") + "20" }]}>
          <Ionicons name={currentLevel?.icon || "home-outline"} size={20} color={currentLevel?.color || "#4B3F72"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nodeName, { color: currentLevel?.color || "#4B3F72" }]}>{currentNode?.name}</Text>
          <Text style={styles.nodeLevel}>{currentLevel?.label} · Active</Text>
        </View>
      </View>

      <View style={styles.relRow}>
        <View style={styles.relItem}>
          <Text style={styles.relLabel}>Reports To</Text>
          <Text style={styles.relValue}>
            {immediateParent ? `${immediateParent.name} (${parentLevel?.label || "—"})` : "Top Level — No Parent"}
          </Text>
        </View>
        {childLevel && (
          <View style={styles.relItem}>
            <Text style={styles.relLabel}>Oversees</Text>
            <Text style={styles.relValue}>{childLevel.plural}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   AGGREGATES — the actual intelligence.
   A District sees the combined members/attendance/finance of
   ALL its Congregations, not just its own entity.
────────────────────────────────────────────────────────────── */
function AggregatesCard({ aggregates, currentLevel, isTopLevel, isBottomLevel }) {
  const scope = isBottomLevel ? "This congregation" : `All ${aggregates.entityCount} entities below`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>
          {isBottomLevel ? "Congregation Stats" : "Aggregated Stats"}
        </Text>
        <View style={styles.scopeBadge}>
          <Ionicons name="layers-outline" size={11} color="#4B3F72" />
          <Text style={styles.scopeBadgeText}>{scope}</Text>
        </View>
      </View>

      {!isBottomLevel && (
        <View style={styles.aggregateInfoBanner}>
          <Ionicons name="information-circle-outline" size={13} color="#4B3F72" />
          <Text style={styles.aggregateInfoText}>
            As a <Text style={{ fontWeight: "800" }}>{currentLevel?.label}</Text>, you see rolled-up totals
            across all {aggregates.descendantCount} {aggregates.descendantCount === 1 ? "node" : "nodes"} below you.
          </Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        <StatPill icon="people-outline"   color="#4B3F72" label="Members"   value={aggregates.totalMembers.toLocaleString()} />
        <StatPill icon="calendar-outline" color="#0984E3" label="Sessions"  value={aggregates.totalSessions.toLocaleString()} />
        <StatPill icon="trending-up-outline" color="#27ae60" label="Avg Rate" value={aggregates.avgAttendanceRate !== null ? `${aggregates.avgAttendanceRate}%` : "—"} />
        <StatPill icon="wallet-outline"   color="#E17055" label="Total Given" value={`GH₵${aggregates.totalGiven.toLocaleString()}`} />
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   SIBLINGS — other nodes at the same level under the same parent
────────────────────────────────────────────────────────────── */
function SiblingsCard({ siblings, currentLevel, template }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        Other {currentLevel?.plural || "Nodes"} Under Same {template?.levels.find(l => l.rank === (currentLevel?.rank || 1) - 1)?.label || "Parent"}
      </Text>
      {siblings.map(s => (
        <View key={s.id} style={styles.siblingRow}>
          <View style={[styles.siblingDot, { backgroundColor: currentLevel?.color || "#aaa" }]} />
          <Text style={styles.siblingName}>{s.name}</Text>
          <Text style={[styles.siblingStatus, { color: s.status === "active" ? "#27ae60" : "#aaa" }]}>
            {s.status || "active"}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────
   VISIBILITY SCOPE — what this node can and cannot see
────────────────────────────────────────────────────────────── */
function VisibilityScopeCard({ currentLevel, isTopLevel }) {
  const visible = currentLevel?.visibility || [];
  const ALL = ["members", "attendance", "finance", "events", "reports", "roles"];
  const hidden = ALL.filter(f => !visible.includes(f));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Data Visibility</Text>
      <Text style={styles.scopeDesc}>
        {isTopLevel
          ? "As the top-level node, you have full visibility across the entire organization."
          : `As a ${currentLevel?.label}, your view is scoped to your ${currentLevel?.label?.toLowerCase()} and everything below it.`}
      </Text>

      <Text style={styles.visLabel}>Can Access</Text>
      {visible.map(f => (
        <View key={f} style={styles.visRow}>
          <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
          <Text style={styles.visText}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
        </View>
      ))}

      {hidden.length > 0 && (
        <>
          <Text style={[styles.visLabel, { marginTop: 10 }]}>Not Available at This Level</Text>
          {hidden.map(f => (
            <View key={f} style={styles.visRow}>
              <Ionicons name="lock-closed-outline" size={14} color="#ccc" />
              <Text style={[styles.visText, { color: "#ccc" }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

/* ── SMALL REUSABLES ── */
function StatPill({ icon, color, label, value }) {
  return (
    <View style={[styles.statPill, { borderColor: color + "30" }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { padding: 14, paddingBottom: 60 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 13, fontWeight: "800", color: "#333", marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },

  templateBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF0FA", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start", marginBottom: 12 },
  templateBadgeText: { fontSize: 12, color: "#4B3F72", fontWeight: "700" },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#27ae60", marginLeft: 4 },
  activeText: { fontSize: 11, color: "#27ae60", fontWeight: "700" },

  chainRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 6 },
  chainIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  chainLabel: { fontSize: 13, fontWeight: "700", color: "#222" },
  chainDesc: { fontSize: 11, color: "#999", marginTop: 1 },
  chainArrow: { alignItems: "center", marginVertical: 2 },
  youBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  youBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  breadcrumbRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  breadcrumbItem: { flexDirection: "row", alignItems: "center" },
  breadcrumbNode: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  breadcrumbText: { fontSize: 11, color: "#888", fontWeight: "600" },

  nodeRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  nodeIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nodeName: { fontSize: 16, fontWeight: "800" },
  nodeLevel: { fontSize: 11, color: "#888", marginTop: 2 },
  relRow: { gap: 8 },
  relItem: { backgroundColor: "#f8f8f8", borderRadius: 10, padding: 10 },
  relLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", textTransform: "uppercase" },
  relValue: { fontSize: 13, color: "#333", fontWeight: "600", marginTop: 2 },

  aggregateInfoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 10, marginBottom: 12 },
  aggregateInfoText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 17 },
  scopeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EEF0FA", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  scopeBadgeText: { fontSize: 10, color: "#4B3F72", fontWeight: "700" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statPill: { width: "47%", borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontWeight: "900" },
  statLabel: { fontSize: 10, color: "#aaa", fontWeight: "600" },

  siblingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  siblingDot: { width: 8, height: 8, borderRadius: 4 },
  siblingName: { flex: 1, fontSize: 13, color: "#333", fontWeight: "600" },
  siblingStatus: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

  scopeDesc: { fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 17 },
  visLabel: { fontSize: 10, fontWeight: "800", color: "#aaa", textTransform: "uppercase", marginBottom: 6 },
  visRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  visText: { fontSize: 13, color: "#333", fontWeight: "600" },

  notConfiguredCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center", gap: 8 },
  notConfiguredTitle: { fontSize: 15, fontWeight: "800", color: "#e67e22" },
  notConfiguredSub: { fontSize: 12, color: "#aaa", textAlign: "center", lineHeight: 18 },
});