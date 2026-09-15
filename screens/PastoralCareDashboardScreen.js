import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";

import {
  buildAttendanceIntelligenceSummary,
} from "../utils/attendanceIntelligence";

import AppHeader from "../components/AppHeader";

const CATEGORY_LABELS = {
  prayer: "Prayer",
  counselling: "Counselling",
  bereavement: "Bereavement",
  financial: "Financial",
  general: "General",
};

const URGENCY_COLORS = {
  crisis: "#E74C3C",
  urgent: "#E67E22",
  normal: "#4B3F72",
};

export default function PastoralCareDashboardScreen({ navigation }) {
  const [tab, setTab] = useState("mine"); // mine | team | unassigned
  const [tickets, setTickets] = useState([]);
  const [followUpCount, setFollowUpCount] = useState(0);
const [atRiskCount, setAtRiskCount] = useState(0);
const [escalatedCount, setEscalatedCount] = useState(0);
const [deceasedCount, setDeceasedCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState(null);
  const [members, setMembers] = useState([]);


  const [followUpMembers, setFollowUpMembers] = useState([]);
const [atRiskMembers, setAtRiskMembers] = useState([]);
const [inactiveCandidateMembers, setInactiveCandidateMembers] = useState([]);

  const currentUid = getAuth().currentUser?.uid;

  const loadTickets = useCallback(async () => {
    const stored = await AsyncStorage.getItem("activeEntity");
    if (!stored) return;
    const ent = JSON.parse(stored);
    setEntity(ent);

    setLoading(true);
    try {
      const ref = collection(
        db,
        "organizations",
        ent.organizationId,
        "entities",
        ent.entityId,
        "pastoralRequests"
      );
     const snap = await getDocs(ref);

const all = snap.docs.map((d) => ({
  id: d.id,
  ...d.data(),
}));

// LOAD MEMBERS
const membersRef = collection(
  db,
  "organizations",
  ent.organizationId,
  "entities",
  ent.entityId,
  "members"
);

const membersSnap = await getDocs(
  membersRef
);

const allMembers =
  membersSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

setMembers(allMembers);

const summary =
  await buildAttendanceIntelligenceSummary({
    organizationId:
      ent.organizationId,
    entityId:
      ent.entityId,
    members: allMembers,
    track: "sunday",
  });

setFollowUpCount(
  summary.followUpCount
);

setAtRiskCount(
  summary.atRiskCount
);

setFollowUpMembers(
  summary.followUpMembers
);

setAtRiskMembers(
  summary.atRiskMembers
);

setInactiveCandidateMembers(
  summary.inactiveCandidateMembers
);


console.log(
  "FOLLOW-UP MEMBERS",
  summary.followUpMembers
);

console.log(
  "AT-RISK MEMBERS",
  summary.atRiskMembers
);

console.log(
  "INACTIVE CANDIDATES",
  summary.inactiveCandidateMembers
);


setDeceasedCount(
  allMembers.filter(
    (m) =>
      String(
        m.status || ""
      ).toLowerCase() === "deceased"
  ).length
);

// NOTE: this is a client-side convenience filter...
let visible;
      if (tab === "mine") {

  visible = all.filter((t) => {

    if (
      t.visibility === "confidential"
    ) {
      return (
        t.confidentialRecipients || []
      ).includes(currentUid);
    }

    return (
      t.assignedToUid === currentUid
    );

  });

} else if (tab === "unassigned") {

  visible = all.filter((t) => {

    if (
      t.visibility === "confidential"
    ) {
      return false;
    }

    return !t.assignedToUid;

  });

} else {

  visible = all.filter((t) => {

    if (
      t.visibility === "confidential"
    ) {
      return (
        t.confidentialRecipients || []
      ).includes(currentUid);
    }

    return (
      !t.sensitive ||
      t.assignedToUid === currentUid
    );

  });

}


      visible.sort((a, b) => {
        const urgencyRank = { crisis: 0, urgent: 1, normal: 2 };
        const rankDiff =
          (urgencyRank[a.urgency] ?? 2) - (urgencyRank[b.urgency] ?? 2);
        if (rankDiff !== 0) return rankDiff;
        return (b.lastActivityAt || "").localeCompare(a.lastActivityAt || "");
      });

      const openTickets = visible.filter(
  (t) =>
    t.status !== "resolved" &&
    t.status !== "closed"
);

setTickets(openTickets);

setEscalatedCount(
  openTickets.filter(
    (t) => t.escalated === true
  ).length
);
    } catch (e) {
      console.log("loadTickets", e);
    } finally {
      setLoading(false);
    }
  }, [tab, currentUid]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Pastoral Care"
        subtitle="Ticket queue"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.tabRow}>
        {[
          { key: "mine", label: "My Tickets" },
          { key: "team", label: "Team" },
          { key: "unassigned", label: "Unassigned" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

<View style={styles.intelligenceRow}>

  <View style={styles.intelligenceCard}>
    <Text style={styles.intelligenceNumber}>
      {followUpCount}
    </Text>
    <Text style={styles.intelligenceLabel}>
      Follow-Up
    </Text>
  </View>

  <View style={styles.intelligenceCard}>
    <Text style={styles.intelligenceNumber}>
  {atRiskCount}
</Text>
   <Text style={styles.intelligenceLabel}>
  At Risk
</Text>
  </View>

  <View style={styles.intelligenceCard}>
  <Text style={styles.intelligenceNumber}>
    {escalatedCount}
  </Text>

  <Text style={styles.intelligenceLabel}>
  Escalated Cases
</Text>
</View>

  <View style={styles.intelligenceCard}>
    <Text style={styles.intelligenceNumber}>
      {deceasedCount}
    </Text>
    <Text style={styles.intelligenceLabel}>
      Deceased
    </Text>
  </View>

</View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadTickets}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No open tickets here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("PastoralTicketDetail", {
                requestId: item.id,
                organizationId: entity.organizationId,
                entityId: entity.entityId,
              })
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.categoryLabel}>
                {CATEGORY_LABELS[item.category] || item.category}
              </Text>
              <View
                style={[
                  styles.urgencyPill,
                  { backgroundColor: URGENCY_COLORS[item.urgency] || "#999" },
                ]}
              >
                <Text style={styles.urgencyPillText}>
                  {(item.urgency || "normal").toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.memberName}>
              {item.anonymous ? "Anonymous" : item.memberName || "Unknown"}
            </Text>

            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.cardFooter}>
  <View>

    <Text style={styles.statusText}>
      {item.status}
    </Text>

    {item.escalated && (
      <Text
        style={{
          color: "#E67E22",
          fontWeight: "700",
          marginTop: 4,
          fontSize: 11,
        }}
      >
        ⚠ Escalated
      </Text>
    )}

  </View>

  {item.assignedToName && (
    <Text style={styles.assignedText}>
      → {item.assignedToName}
    </Text>
  )}
</View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { color: "#777", fontWeight: "600", fontSize: 12 },
  tabTextActive: { color: "#4B3F72" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  emptyText: { color: "#999" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryLabel: { fontWeight: "700", fontSize: 13, color: "#4B3F72" },
  urgencyPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  urgencyPillText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  memberName: { fontWeight: "700", marginTop: 6 },
  description: { color: "#666", marginTop: 4, fontSize: 13 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  statusText: { fontSize: 11, color: "#999", textTransform: "capitalize" },
  assignedText: { fontSize: 11, color: "#4B3F72", fontWeight: "600" },
  intelligenceRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: "#F8F9FC",
},

intelligenceCard: {
  flex: 1,
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  paddingVertical: 12,
  marginHorizontal: 4,
  alignItems: "center",
},

intelligenceNumber: {
  fontSize: 18,
  fontWeight: "700",
  color: "#4B3F72",
},

intelligenceLabel: {
  fontSize: 11,
  color: "#666",
  marginTop: 4,
},
});