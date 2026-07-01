// components/FeatureGate.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubscription } from "../utils/subscription";
import { getPlan } from "../constants/subscriptionPlans";

// ✅ Wraps any premium UI. Renders children if the org's current plan
// unlocks `feature`; otherwise renders a compact upgrade prompt instead
// (or nothing, if `silent` is set — useful for hiding a button entirely
// rather than explaining why it's missing).
//
// Usage:
//   <FeatureGate feature={FEATURES.AI_INSIGHTS} organizationId={orgId} entityId={entityId} onUpgrade={() => navigation.navigate("Subscription")}>
//     <AIInsightsTab />
//   </FeatureGate>
export default function FeatureGate({
  feature, organizationId, entityId, children, onUpgrade, silent = false
}) {
  const { hasFeature, plan, loading } = useSubscription(organizationId, entityId);

  if (loading) return null;
  if (hasFeature(feature)) return children;
  if (silent) return null;

  return (
    <View style={styles.box}>
      <Ionicons name="lock-closed-outline" size={28} color="#aaa" />
      <Text style={styles.title}>Upgrade to Unlock</Text>
      <Text style={styles.sub}>
        This feature isn't included in your {plan.label} plan.
      </Text>
      {onUpgrade && (
        <TouchableOpacity style={styles.btn} onPress={onUpgrade}>
          <Text style={styles.btnText}>View Plans</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ✅ Lighter-weight variant for inline use (e.g. disabling a single
// button) rather than replacing a whole screen section.
export function useFeatureGate(feature, organizationId, entityId) {
  const sub = useSubscription(organizationId, entityId);
  return { allowed: sub.hasFeature(feature), plan: sub.plan, loading: sub.loading };
}

const styles = StyleSheet.create({
  box: { alignItems: "center", padding: 30, backgroundColor: "#fafafa", borderRadius: 14, margin: 14 },
  title: { fontSize: 14, fontWeight: "800", color: "#333", marginTop: 10 },
  sub: { fontSize: 12, color: "#999", marginTop: 4, textAlign: "center" },
  btn: { backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, marginTop: 14 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});