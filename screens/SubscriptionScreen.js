import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

import AppHeader from "../components/AppHeader";
import { useSubscription } from "../utils/subscription";
import {
  PLANS,
  PLAN_ORDER,
  getPlan,
  getLimit,
  LIMITS,
} from "../constants/subscriptionPlans";
import { hasPermission } from "../constants/permissions";

import {
  collection,
  doc,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";

const STATUS_COLOR = {
  trialing: "#0984E3",
  active: "#27ae60",
  past_due: "#e67e22",
  canceled: "#e74c3c",
  free: "#888",
};

const FEATURE_LABELS = {
  ai_insights: "AI Financial Insights",
  qr_generator: "QR Code Generator",
  donation_receipts: "Donation Receipts",
  donation_approvals: "Donation Approval Workflow",
  data_export: "Data Export & Backup",
  multi_branch: "Multi-Branch Churches",
  advanced_roles: "Advanced Roles & Permissions",
  custom_branding: "Custom Branding",
  priority_support: "Priority Support",
};

const MEMBER_ADDON_PACKAGES = [
  {
    id: "member50",
    qty: 50,
    price: 10,
  },
  {
    id: "member100",
    qty: 100,
    price: 18,
  },
  {
    id: "member500",
    qty: 500,
    price: 75,
  },
];

const ADMIN_ADDON_PACKAGES = [
  {
    id: "admin1",
    qty: 1,
    price: 5,
  },
  {
    id: "admin2",
    qty: 2,
    price: 9,
  },
  {
    id: "admin5",
    qty: 5,
    price: 20,
  },
];


export default function SubscriptionScreen({ route }) {
  const navigation = useNavigation();
  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId = activeEntity?.entityId;

  // ⚠️ Same placeholder pattern as other screens this conversation —
  // billing changes should be gated behind manage_church_settings.
  const viewerPermissions = route?.params?.viewerPermissions || [];
  const canManageBilling = hasPermission({ permissions: viewerPermissions }, "manage_church_settings");

  const [upgrading, setUpgrading] = useState(null); // planId currently checking out
  

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  const {
    subscription, plan, planId, status, isActive, isTrialExpired,
    daysLeftInTrial, usage, loading,
    membersLimit, adminsLimit,
  } = useSubscription(organizationId, entityId);

  // ✅ Calls a Cloud Function — same pattern as the AI insight call
  // earlier in this build. The Paystack secret key NEVER touches the
  // client; the function returns an authorization_url that opens
  // Paystack's hosted checkout (supports card, Ghana MoMo, and bank).
  const handleUpgrade = async (targetPlanId) => {
    if (!canManageBilling) {
      Alert.alert("Not Authorized", "Only an admin can change the subscription plan.");
      return;
    }
    if (!organizationId) return;

    const targetPlan = getPlan(targetPlanId);
    if (targetPlan.price === null) {
      Alert.alert("Contact Sales", "Reach out to our team to set up an Enterprise plan.");
      return;
    }

    setUpgrading(targetPlanId);
    try {
      const functions = getFunctions(app);
      const initCheckout = httpsCallable(functions, "initPaystackCheckout");
      const result = await initCheckout({ organizationId, planId: targetPlanId });

      const url = result.data?.authorization_url;
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Could not start checkout. Please try again.");
      }
    } catch (e) {
      console.log("❌ Checkout error:", e);
      Alert.alert(
        "Checkout Unavailable",
        "Payment processing isn't configured yet. See functions/subscriptions.js for setup."
      );
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#4B3F72" size="large" />
      </View>
    );
  }

const requestAddon = async (
  type,
  pkg
) => {

  if (!organizationId || !entityId) {
    Alert.alert(
      "Error",
      "Organisation information is unavailable."
    );
    return;
  }

  try {
    const currentMemberLimit =
  getLimit(
    planId,
    LIMITS.MAX_MEMBERS
  ) || 0;

const currentAdminLimit =
  getLimit(
    planId,
    LIMITS.MAX_ADMINS
  ) || 0;

  const nextPlanId =
  PLAN_ORDER[
    PLAN_ORDER.indexOf(planId) + 1
  ];

const nextPlan =
  nextPlanId
    ? getPlan(nextPlanId)
    : null;

    if (
  type === "Members" &&
  nextPlan
) {

 const currentAddonMembers =
  subscription?.addons
    ?.extraMembers || 0;

const requestedCapacity =
  currentMemberLimit +
  currentAddonMembers +
  pkg.qty;

  const nextPlanCapacity =
    getLimit(
      nextPlan.id,
      LIMITS.MAX_MEMBERS
    );

  if (
    requestedCapacity >=
    nextPlanCapacity
  ) {

    Alert.alert(
      "Upgrade Required",
      `This add-on reaches the ${nextPlan.label} plan capacity. Upgrade instead.`
    );

    return;
  }
}

if (
  type === "Admins" &&
  nextPlan
) {

 const currentAddonAdmins =
  subscription?.addons
    ?.extraAdmins || 0;

const requestedCapacity =
  currentAdminLimit +
  currentAddonAdmins +
  pkg.qty;

  const nextPlanCapacity =
    getLimit(
      nextPlan.id,
      LIMITS.MAX_ADMINS
    );

  if (
  requestedCapacity >
  (nextPlanCapacity * 0.5)
)
{

    Alert.alert(
      "Upgrade Required",
      `This add-on reaches the ${nextPlan.label} admin capacity. Upgrade instead.`
    );

    return;
  }
}

    await setDoc(
      doc(
        collection(
          db,
          "subscriptionRequests"
        )
      ),
      {
        organizationId,
        entityId,

        // Human-readable data for Super Admin
        organizationName:
          activeEntity?.name || "",

        entityName:
          activeEntity?.name || "",

        requestedBy:
          activeEntity?.uid || "",

        requestedByName:
          activeEntity?.memberName || "",

        currentPlan:
          planId || "free",

        requestType:
          type === "Members"
            ? "memberAddon"
            : "adminAddon",

        packageId: pkg.id,

        quantity: pkg.qty,

        requestedPrice: pkg.price,

        currency: "GHS",

        region: "ghana",

        status: "pending",

        requestedAt:
          new Date().toISOString(),
      }
    );

    Alert.alert(
      "Request Submitted",
      `Your ${pkg.qty} ${type} add-on request has been submitted for review.`
    );

  } catch (e) {

    console.log(
      "❌ requestAddon:",
      e
    );

    Alert.alert(
      "Error",
      "Could not submit request."
    );
  }
};

  return (
    <View style={styles.container}>
      <AppHeader title="Subscription & Billing" showBack onBack={() => navigation.goBack()} />
<ScrollView
  contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
>

        {/* ── CURRENT PLAN CARD ── */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View>
              <Text style={styles.planCardLabel}>Current Plan</Text>
              <Text style={styles.planCardName}>{plan.label}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[status] || "#888") + "22" }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] || "#888" }]} />
              <Text style={[styles.statusText, { color: STATUS_COLOR[status] || "#888" }]}>
                {isTrialExpired ? "Trial Expired" : status.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>

          {status === "trialing" && !isTrialExpired && (
            <View style={styles.trialBanner}>
              <Ionicons name="time-outline" size={14} color="#0984E3" />
              <Text style={styles.trialBannerText}>
                {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left in your trial
              </Text>
            </View>
          )}

          {isTrialExpired && (
            <View style={[styles.trialBanner, { backgroundColor: "#fce8e8" }]}>
              <Ionicons name="alert-circle-outline" size={14} color="#e74c3c" />
              <Text style={[styles.trialBannerText, { color: "#e74c3c" }]}>
                Your trial has ended. Upgrade to keep premium features.
              </Text>
            </View>
          )}

          <Text style={styles.planPrice}>
            {plan.price === null ? "Custom pricing" : plan.price === 0 ? "Free" : `GH₵ ${plan.price}/${plan.billingCycle === "monthly" ? "mo" : "yr"}`}
          </Text>

        </View>
{/* ── UNLOCKED FEATURES ── */}
<Text style={styles.sectionTitle}>
  Unlocked Features
</Text>

<View style={styles.usageCard}>
  {plan.features.length === 0 ? (
    <Text style={styles.planFeatureMuted}>
      This plan includes core features only.
    </Text>
  ) : (
    plan.features.map(feature => (
      <View key={feature} style={styles.planFeatureItem}>
        <Ionicons
          name="checkmark-circle"
          size={16}
          color="#27ae60"
        />
        <Text style={styles.planFeatureText}>
  {FEATURE_LABELS[feature] || feature}
</Text>
      </View>
    ))
  )}
</View>


        {/* ── USAGE ── */}
        <Text style={styles.sectionTitle}>Usage</Text>
        <View style={styles.usageCard}>
          <UsageBar label="Members" data={membersLimit} />
          <UsageBar label="Admins" data={adminsLimit} />
        </View>


<Text style={styles.sectionTitle}>
  Member Capacity
</Text>

<View style={styles.usageCard}>
  <DetailRow
    label="Plan Capacity"
    value={getLimit(
      planId,
      LIMITS.MAX_MEMBERS
    ) ?? "Unlimited"}
  />

  <DetailRow
    label="Purchased Add-ons"
    value={
      subscription?.addons?.extraMembers || 0
    }
  />

  <DetailRow
    label="Total Capacity"
    value={
      membersLimit.isUnlimited
        ? "Unlimited"
        : membersLimit.limit
    }
  />

  <DetailRow
    label="Used"
    value={membersLimit.used}
  />

  <DetailRow
    label="Remaining"
    value={
      membersLimit.isUnlimited
        ? "Unlimited"
        : membersLimit.remaining
    }
  />
</View>

<Text style={styles.sectionTitle}>
  Admin Capacity
</Text>

<View style={styles.usageCard}>
  <DetailRow
    label="Plan Capacity"
    value={getLimit(
      planId,
      LIMITS.MAX_ADMINS
    ) ?? "Unlimited"}
  />

  <DetailRow
    label="Purchased Add-ons"
    value={
      subscription?.addons?.extraAdmins || 0
    }
  />

  <DetailRow
    label="Total Capacity"
    value={
      adminsLimit.isUnlimited
        ? "Unlimited"
        : adminsLimit.limit
    }
  />

  <DetailRow
    label="Used"
    value={adminsLimit.used}
  />

  <DetailRow
    label="Remaining"
    value={
      adminsLimit.isUnlimited
        ? "Unlimited"
        : adminsLimit.remaining
    }
  />
</View>
{planId !== "pro" && (
<>
  <Text style={styles.sectionTitle}>
    Need More Capacity?
  </Text>

  <View style={styles.usageCard}>

    <Text
      style={{
        fontWeight: "700",
        marginBottom: 12,
        color: "#4B3F72",
      }}
    >
      Member Add-ons
    </Text>

    {MEMBER_ADDON_PACKAGES.map(pkg => (
      <TouchableOpacity
        key={pkg.id}
        style={styles.addonBtn}
        onPress={() =>
          requestAddon(
            "Members",
            pkg
          )
        }
      >
        <Text style={styles.addonTitle}>
          +{pkg.qty} Members
        </Text>

        <Text style={styles.addonPrice}>
          GH₵ {pkg.price}
        </Text>
      </TouchableOpacity>
    ))}

    <Text
      style={{
        fontWeight: "700",
        marginTop: 16,
        marginBottom: 12,
        color: "#4B3F72",
      }}
    >
      Admin Add-ons
    </Text>

    {ADMIN_ADDON_PACKAGES.map(pkg => (
      <TouchableOpacity
        key={pkg.id}
        style={styles.addonBtn}
        onPress={() =>
          requestAddon(
            "Admins",
            pkg
          )
        }
      >
        <Text style={styles.addonTitle}>
          +{pkg.qty} Admins
        </Text>

        <Text style={styles.addonPrice}>
          GH₵ {pkg.price}
        </Text>
      </TouchableOpacity>
    ))}

  </View>
</>
)}

        {/* ── PLANS COMPARISON ── */}
        <Text style={styles.sectionTitle}>Plans</Text>
        {PLAN_ORDER.map(pid => {
          const p = PLANS[pid];
          const isCurrent = pid === planId;
          return (
            <View key={pid} style={[styles.planRow, isCurrent && styles.planRowActive]}>
              {pid === "pro" && (
  <View style={styles.popularBadge}>
    <Text style={styles.popularBadgeText}>
      ⭐ MOST POPULAR
    </Text>
  </View>
)}
              <View style={styles.planRowHeader}>
                <View>
                  <Text style={styles.planRowName}>{p.label}</Text>
                  <Text style={styles.planRowTagline}>{p.tagline}</Text>
                </View>

                <Text style={styles.planRowPrice}>
                  {p.price === null ? "Custom" : p.price === 0 ? "Free" : `GH₵${p.price}`}
                  {p.price ? <Text style={styles.planRowCycle}>/{p.billingCycle === "monthly" ? "mo" : "yr"}</Text> : null}
                </Text>
              </View>

              <View style={styles.planFeatureList}>
                {p.features.length === 0 ? (
                  <Text style={styles.planFeatureMuted}>Core features only</Text>
                ) : (
                  p.features.map(f => (
                    <View key={f} style={styles.planFeatureItem}>
                      <Ionicons name="checkmark-circle" size={13} color="#27ae60" />
                      <Text style={styles.planFeatureText}>{f.replace(/_/g, " ")}</Text>
                    </View>
                  ))
                )}
              </View>

              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current Plan</Text>
                </View>
              ) : (
                canManageBilling && (
                  <TouchableOpacity
                    style={[styles.upgradeBtn, upgrading === pid && { opacity: 0.6 }]}
                    onPress={() => handleUpgrade(pid)}
                    disabled={!!upgrading}
                  >
                    {upgrading === pid ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.upgradeBtnText}>
                        {PLAN_ORDER.indexOf(pid) > PLAN_ORDER.indexOf(planId) ? "Upgrade" : "Switch"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              )}
            </View>
          );
        })}

        {!canManageBilling && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={14} color="#4B3F72" />
            <Text style={styles.infoBannerText}>
              Only an admin can change the subscription plan.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function UsageBar({ label, data }) {
  const pct = data.isUnlimited ? 0 : Math.min(100, (data.used / Math.max(data.limit, 1)) * 100);
  const isWarning = !data.isUnlimited && pct >= 80;

  return (
    <View style={styles.usageRow}>
      <View style={styles.usageRowHeader}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageValue}>
          {data.used}{data.isUnlimited ? "" : ` / ${data.limit}`}
        </Text>
      </View>
      {!data.isUnlimited && (
        <View style={styles.usageTrack}>
          <View style={[styles.usageFill, { width: `${pct}%`, backgroundColor: isWarning ? "#e74c3c" : "#4B3F72" }]} />
        </View>
      )}
      {data.isUnlimited && <Text style={styles.usageUnlimited}>Unlimited</Text>}
    </View>
  );
}

function DetailRow({
  label,
  value
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          color: "#666",
          fontSize: 13,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: "#222",
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  planCard: { backgroundColor: "#fff", borderRadius: 16, padding: 18, elevation: 2 },
  planCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planCardLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", textTransform: "uppercase" },
  planCardName: { fontSize: 22, fontWeight: "900", color: "#4B3F72", marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: "800" },
  trialBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F4FD", borderRadius: 10, padding: 10, marginTop: 12 },
  trialBannerText: { fontSize: 12, color: "#0984E3", fontWeight: "600" },
  planPrice: { fontSize: 14, color: "#666", marginTop: 12, fontWeight: "700" },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#888", textTransform: "uppercase", marginTop: 22, marginBottom: 10 },

  usageCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1 },
  usageRow: { marginBottom: 14 },
  usageRowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  usageLabel: { fontSize: 13, fontWeight: "700", color: "#333" },
  usageValue: { fontSize: 12, color: "#888", fontWeight: "600" },
  usageTrack: { height: 6, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  usageFill: { height: 6, borderRadius: 3 },
  usageUnlimited: { fontSize: 11, color: "#27ae60", fontWeight: "700" },

  planRow: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, borderWidth: 1.5, borderColor: "transparent" },
  planRowActive: { borderColor: "#4B3F72" },
  planRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planRowName: { fontSize: 15, fontWeight: "800", color: "#222" },
  planRowTagline: { fontSize: 11, color: "#999", marginTop: 2 },
  planRowPrice: { fontSize: 16, fontWeight: "900", color: "#4B3F72" },
  planRowCycle: { fontSize: 11, fontWeight: "600", color: "#aaa" },

  planFeatureList: { marginTop: 12, gap: 5 },
  planFeatureItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  planFeatureText: { fontSize: 11, color: "#555", textTransform: "capitalize" },
  planFeatureMuted: { fontSize: 11, color: "#bbb", fontStyle: "italic" },

  currentBadge: { alignSelf: "flex-start", backgroundColor: "#EEF0FA", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  currentBadgeText: { fontSize: 11, fontWeight: "800", color: "#4B3F72" },
  upgradeBtn: { backgroundColor: "#4B3F72", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  upgradeBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  infoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 12, marginTop: 10 },
  infoBannerText: { flex: 1, fontSize: 11, color: "#4B3F72" },
  featureCount: {
  marginTop: 6,
  fontSize: 12,
  fontWeight: "700",
  color: "#27ae60",
},
popularBadge: {
  alignSelf: "flex-start",
  backgroundColor: "#FFF3CD",
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 4,
  marginBottom: 10,
},

popularBadgeText: {
  fontSize: 10,
  fontWeight: "800",
  color: "#D97706",
},
topFeaturesLabel: {
  fontSize: 11,
  fontWeight: "800",
  color: "#4B3F72",
  marginTop: 4,
},

topFeaturesText: {
  fontSize: 11,
  color: "#666",
  lineHeight: 18,
  marginTop: 4,
},

addonBtn: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
},

addonTitle: {
  fontSize: 13,
  fontWeight: "700",
  color: "#333",
},

addonPrice: {
  fontSize: 13,
  fontWeight: "800",
  color: "#4B3F72",
},
});