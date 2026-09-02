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
  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState(null);

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
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // NOTE: this is a client-side convenience filter, not a security
      // boundary. Sensitive-category enforcement MUST also live in
      // Firestore Security Rules — see the rule in the earlier message.
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

      setTickets(visible.filter((t) => t.status !== "resolved" && t.status !== "closed"));
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
              <Text style={styles.statusText}>{item.status}</Text>
              {item.assignedToName && (
                <Text style={styles.assignedText}>→ {item.assignedToName}</Text>
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
});