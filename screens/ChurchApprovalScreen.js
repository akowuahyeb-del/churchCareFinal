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

export default function ChurchApprovalScreen() {
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

const validateRegistration = async (org) => {
  const {
    templateId,
    levelId,
    name,
    location,
    denomination,
  } = org;

  if (!templateId) {
    throw new Error("Missing governance template.");
  }

  if (!levelId) {
    throw new Error("Missing registration level.");
  }

  if (!name?.trim()) {
    throw new Error("Organisation name is required.");
  }

  switch (levelId) {
    case "national_assembly": {
  const existingNational = await getDocs(
    query(
      collection(db, "governanceNodes"),
      where("status", "==", "active"),
      where("templateId", "==", templateId),
      where("levelId", "==", "national")
    )
  );

  if (!existingNational.empty) {
    throw new Error(
      `A National body for ${denomination} already exists and is locked.`
    );
  }

  break;
}

    case "presbytery": {
  const existingPresbyteries = await getDocs(
    query(
      collection(db, "governanceNodes"),
      where("status", "==", "active"),
      where("templateId", "==", templateId),
      where("levelId", "==", "presbytery")
    )
  );

  const duplicate = existingPresbyteries.docs.find((d) => {
    const data = d.data();

    return (
      data.name?.trim().toLowerCase() ===
      name?.trim().toLowerCase()
    );
  });

  if (duplicate) {
    throw new Error(
      `Presbytery "${name}" already exists. Presbytery names must be unique.`
    );
  }

  break;
}

    case "district": {
  const existingDistricts = await getDocs(
    query(
      collection(db, "governanceNodes"),
      where("status", "==", "active"),
      where("templateId", "==", templateId),
      where("levelId", "==", "district")
    )
  );

  const duplicate = existingDistricts.docs.find((d) => {
    const data = d.data();

    return (
      data.name?.trim().toLowerCase() ===
      name?.trim().toLowerCase()
    );
  });

  if (duplicate) {
    throw new Error(
      `District "${name}" already exists. District names must be unique.`
    );
  }

  break;
}

   case "congregation": {
  const existingCongregations = await getDocs(
    query(
      collection(db, "governanceNodes"),
      where("status", "==", "active"),
      where("templateId", "==", templateId),
      where("levelId", "==", "congregation")
    )
  );

  const duplicate = existingCongregations.docs.find((d) => {
    const data = d.data();

    return (
      data.name?.trim().toLowerCase() ===
        name?.trim().toLowerCase() &&
      data.location?.trim().toLowerCase() ===
        location?.trim().toLowerCase()
    );
  });

  if (duplicate) {
    throw new Error(
      `A congregation named "${name}" already exists in "${location}".`
    );
  }

  break;
}

    default:
      throw new Error(
        `Unsupported registration level: ${levelId}`
      );
  }

  return true;
};


  // ✅ THE KEY INTEGRATION POINT:
  // When a church is approved, the templateId stored at creation time
  // is read and used to auto-seed the full hierarchy — no manual
  // "Seed Structure" step needed by the admin.
 const approveChurch = async (org) => {
  setProcessing(org.id);

  try {
    await validateRegistration(org);
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

const level = template.levels.find(
  l => l.id === org.levelId
);

if (!level) {
  throw new Error(
    `Unknown registration level: ${org.levelId}`
  );
}

const nodeRef = doc(
  collection(
    db,
    "governanceNodes"
  )
);

await setDoc(nodeRef, {
  name: org.name,

  levelId: level.id,

  organizationId: org.id,

  entityId:
    level.id === "congregation"
      ? entityId
      : null,

  parentNodeId: null,

  pendingLink: level.id !== "national",

  isLocked: level.id === "national",

  templateId: org.templateId,

  status: "active",

  createdAt: new Date().toISOString(),

  updatedAt: new Date().toISOString(),
});

// Save governance node reference on the organisation
await updateDoc(
  doc(db, "organizations", org.id),
  {
    governanceNodeId: nodeRef.id,
  }
);


if (level.id === "presbytery") {
  const nationalSnap = await getDocs(
    query(
      collection(db, "governanceNodes"),
      where("templateId", "==", org.templateId),
      where(
  "levelId",
  "==",
  "national_assembly"
),
      where("status", "==", "active")
    )
  );

  if (!nationalSnap.empty) {
    const nationalNode = nationalSnap.docs[0];

    await updateDoc(nodeRef, {
      parentNodeId: nationalNode.id,
      pendingLink: false,
      linkedAt: new Date().toISOString(),
    });
  }
}


if (level.id === "district") {
  const presbyterySnap = await getDocs(
  query(
    collection(db, "governanceNodes"),
    where("templateId", "==", org.templateId),
    where("levelId", "==", "presbytery"),
    where("status", "==", "active")
  )
);

  const suggestedParents = presbyterySnap.docs.map(doc => ({
    nodeId: doc.id,
    name: doc.data().name,
  }));

  await updateDoc(nodeRef, {
    suggestedParents,
  });
}


if (level.id === "congregation") {
 const districtSnap = await getDocs(
  query(
    collection(db, "governanceNodes"),
    where("templateId", "==", org.templateId),
    where("levelId", "==", "district"),
    where("status", "==", "active")
  )
);

  const suggestedParents = districtSnap.docs.map(d => ({
    nodeId: d.id,
    name: d.data().name,
    levelId: d.data().levelId,
  }));

  await updateDoc(nodeRef, {
    suggestedParents,
  });
}

// ✅ Notify applicant
if (org.submittedByUid) {
  await setDoc(
    doc(
      collection(
        db,
        "users",
        org.submittedByUid,
        "notifications"
      )
    ),
    {
      type: "church_approved",

      title: "Registration Approved",

      message: `${org.name} has been approved and activated.`,

      organizationId: org.id,

      read: false,

      createdAt: new Date().toISOString(),
    }
  );
}

// ✅ Notify applicant of approval
if (org.submittedByUid) {
  await setDoc(
    doc(
      collection(
        db,
        "users",
        org.submittedByUid,
        "notifications"
      )
    ),
    {
      type: "church_approved",
      title: "Church Registration Approved",
      message: `${org.name} has been approved and activated.`,

      organizationId: org.id,
      governanceNodeId: nodeRef.id,

      read: false,

      createdAt: new Date().toISOString(),
    }
  );
}

      await loadPending();
      Alert.alert(
  "✅ Approved",
  `${org.name} is now active. A ${level.label} governance node has been created successfully.`
);

    } catch (e) {
      console.log("❌ approveChurch error:", e);
      Alert.alert(
  "Validation Failed",
  e.message,
  [{ text: "OK" }]
);
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
  <Ionicons
    name="git-branch-outline"
    size={12}
    color="#4B3F72"
  />
  <Text style={styles.templatePreviewText}>
    {template.name}
  </Text>
</View>

<Text
  style={{
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  }}
>
  Registration Level:{" "}
  <Text style={{ fontWeight: "700" }}>
    {getLevelById(
      org.templateId,
      org.levelId
    )?.label || org.levelId || "Not supplied"}
  </Text>
</Text>

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
  Approving will activate this church and create a single{" "}
  <Text style={{ fontWeight: "800" }}>
    {getLevelById(
      org.templateId,
      org.levelId
    )?.label || org.levelId}
  </Text>{" "}
  governance node.
  Parent linking can be completed later.
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