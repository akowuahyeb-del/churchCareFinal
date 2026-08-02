// screens/SuperAdminScreen.js
//
// ✅ Developer console — reads across ALL organizations in the platform.
// This screen is the only place in the codebase that queries the root
// `organizations` collection directly rather than scoping everything
// under a single organizationId. Protect this route with a developer-
// only auth check (custom claims, a separate login, or a hardcoded
// dev UID allowlist) — it should never appear in the main nav for a
// church admin.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, RefreshControl,
  Switch
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import {
  collection, getDocs, doc, updateDoc, setDoc,
  query, where, orderBy, limit, getDoc,
  writeBatch, onSnapshot, deleteDoc
} from "firebase/firestore";
import { getTemplate } from "../constants/organizationTemplates";
import { PLANS, getPlan, PLAN_ORDER } from "../constants/subscriptionPlans";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";
// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  active:   "#27ae60",
  pending:  "#F39C12",
  rejected: "#e74c3c",
  inactive: "#888",
};

const STATUS_ICON = {
  active:   "checkmark-circle",
  pending:  "hourglass-outline",
  rejected: "close-circle",
  inactive: "pause-circle-outline",
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function SuperAdminScreen({ navigation }) {
  const [tab, setTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [governanceNodes, setGovernanceNodes] = useState([]);
   const [pendingLinks, setPendingLinks] = useState([]);

   
  // ── PLATFORM METRICS ──
  const [metrics, setMetrics] = useState({
    totalOrgs: 0,
    activeOrgs: 0,
    pendingOrgs: 0,
    rejectedOrgs: 0,
    totalMembers: 0,
    totalSessions: 0,
    totalContributions: 0,
    monthlyRevenue: 0,
    planCounts: {},
  });

  // ── ORGANIZATIONS ──
  const [orgs, setOrgs] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [orgFilter, setOrgFilter] = useState("all");
  const [orgSearch, setOrgSearch] = useState("");
  const functions = getFunctions();

const approveOrganization =
  httpsCallable(
    functions,
    "approveOrganization"
  );
  const deactivateOrganization =
  httpsCallable(
    functions,
    "deactivateOrganization"
  );

const reinstateOrganization =
  httpsCallable(
    functions,
    "reinstateOrganization"
  );

  // ── LIVE ACTIVITY ──
  const [liveActivity, setLiveActivity] = useState([]);
  const activityUnsubRef = useRef(null);

  // ── FEATURE FLAGS ──
  const [featureFlags, setFeatureFlags] = useState({
    ai_insights_enabled: true,
    qr_generator_enabled: true,
    donation_receipts_enabled: true,
    geo_checkin_enabled: true,
    new_registrations_open: true,
    maintenance_mode: false,
  });

  // ── MODALS ──
  const [approvalModal, setApprovalModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deactivationReason,setDeactivationReason] =useState("");
  const [deactivateModal,setDeactivateModal] =useState(false);
  const [processingOrgId, setProcessingOrgId] = useState(null);
  const [orgDetailModal, setOrgDetailModal] = useState(false);
  const [orgDetail, setOrgDetail] = useState(null);
  const [orgDetailData, setOrgDetailData] = useState(null);
  const [flagModal, setFlagModal] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announcementType, setAnnouncementType] = useState("info");
  const [planModal, setPlanModal] = useState(false);
  const [planTarget, setPlanTarget] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("basic");
  useEffect(() => {
  const verifyAccess = async () => {
    try {
      const stored = await AsyncStorage.getItem("currentUser");

      if (!stored) {
        navigation.goBack();
        return;
      }

      const user = JSON.parse(stored);

      if (user?.role !== "super_admin") {
        Alert.alert(
          "Access Denied",
          "You do not have permission to access the Developer Console."
        );

        navigation.goBack();
      }
    } catch (err) {
      navigation.goBack();
    }
  };

  verifyAccess();
}, []);

  // ─────────────────────────────────────────────────────────────────
  // LOAD ALL DATA
  // ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
  loadOrganizations(),
  loadGovernanceNodes(),
  loadFeatureFlags(),
]);
      startLiveActivityListener();
    } catch (e) {
      console.log("❌ SuperAdmin loadAll:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    return () => {
      if (activityUnsubRef.current) activityUnsubRef.current();
    };
  }, []);


const loadGovernanceNodes = async () => {
  try {
    const snap = await getDocs(
      collection(db, "governanceNodes")
    );

    console.log(
      "✅ governanceNodes found:",
      snap.size
    );

    const nodes = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    console.log(
      "✅ governanceNodes data:",
      nodes
    );

    setGovernanceNodes(nodes);

    setPendingLinks(
      nodes.filter(n => n.pendingLink)
    );

  } catch (e) {
    console.log(
      "❌ loadGovernanceNodes:",
      e
    );
  }
};




  // ─────────────────────────────────────────────────────────────────
  // LOAD ORGANIZATIONS + AGGREGATE METRICS
  // ✅ Reads across ALL orgs — the only screen in the app that does this
  // ─────────────────────────────────────────────────────────────────
  const loadOrganizations = async () => {
    try {
      const orgsSnap = await getDocs(collection(db, "organizations"));
      const orgList = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load subscription + basic stats for each org in parallel
      const enriched = await Promise.all(
        orgList.map(async (org) => {
          try {
            const [subSnap, entitiesSnap] = await Promise.all([
              getDoc(doc(db, "organizations", org.id, "billing", "subscription")),
              getDocs(collection(db, "organizations", org.id, "entities")),
            ]);

            const sub = subSnap.exists() ? subSnap.data() : { planId: "free", status: "free" };
            const entities = entitiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Quick member + contribution count from first entity
            let memberCount = 0, contributionTotal = 0, sessionCount = 0;
            if (entities.length > 0) {
              const eid = entities[0].id;
              const [mSnap, cSnap, sSnap] = await Promise.all([
                getDocs(collection(db, "organizations", org.id, "entities", eid, "members")),
                getDocs(query(
                  collection(db, "organizations", org.id, "entities", eid, "contributions"),
                  where("status", "==", "acknowledged")
                )),
                getDocs(collection(db, "organizations", org.id, "entities", eid, "sessions")),
              ]);
              memberCount = mSnap.size;
              contributionTotal = cSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
              sessionCount = sSnap.size;
            }

            return {
              ...org,
              subscription: sub,
              entityCount: entities.length,
              memberCount,
              contributionTotal,
              sessionCount,
              plan: getPlan(sub.planId || "free"),
              isTrialing: sub.status === "trialing",
            };
          } catch (e) {
            return { ...org, subscription: { planId: "free", status: "free" }, plan: getPlan("free"), memberCount: 0, entityCount: 0 };
          }
        })
      );

      setOrgs(enriched);



      // ── AGGREGATE PLATFORM METRICS ──
      const planCounts = {};
      let totalMembers = 0, totalSessions = 0, totalContributions = 0, monthlyRevenue = 0;

      enriched.forEach(org => {
        const pid = org.subscription?.planId || "free";
        planCounts[pid] = (planCounts[pid] || 0) + 1;
        totalMembers += org.memberCount || 0;
        totalSessions += org.sessionCount || 0;
        totalContributions += org.contributionTotal || 0;
        const plan = getPlan(pid);
        if (org.subscription?.status === "active" && plan.price) {
          monthlyRevenue += plan.price;
        }
      });

      setMetrics({
        totalOrgs: enriched.length,
        activeOrgs: enriched.filter(o => o.status === "active").length,
        pendingOrgs: enriched.filter(o => o.status === "pending").length,
        rejectedOrgs: enriched.filter(o => o.status === "rejected").length,
        totalMembers,
        totalSessions,
        totalContributions,
        monthlyRevenue,
        planCounts,
      });

    } catch (e) {
      console.log("❌ loadOrganizations:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // LIVE ACTIVITY LISTENER — recent sessions across all orgs
  // ✅ The one thing a developer actually needs to see in real time:
  // is anything happening on the platform right now?
  // ─────────────────────────────────────────────────────────────────
  const startLiveActivityListener = () => {
    if (activityUnsubRef.current) activityUnsubRef.current();

    // ⚠️ Firestore doesn't support cross-collection-group queries easily
    // without a collection group index. This uses a platform-level
    // activity log that each device writes to when a session starts.
    // If you don't have this yet, the fallback below reads from a
    // dedicated `platformActivity` collection you can write to from
    // startSession in AttendanceScreen.
    try {
      const q = query(
        collection(db, "platformActivity"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      activityUnsubRef.current = onSnapshot(q, snap => {
        setLiveActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, () => {
        // Collection doesn't exist yet — graceful fallback
        setLiveActivity([]);
      });
    } catch (e) {
      setLiveActivity([]);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // FEATURE FLAGS
  // ─────────────────────────────────────────────────────────────────
  const loadFeatureFlags = async () => {
    try {
      const snap = await getDoc(doc(db, "platform", "featureFlags"));
      if (snap.exists()) setFeatureFlags(prev => ({ ...prev, ...snap.data() }));
    } catch (e) {
      // platform doc may not exist yet — use defaults
    }
  };

  const saveFeatureFlag = async (key, value) => {
    const updated = { ...featureFlags, [key]: value };
    setFeatureFlags(updated);
    try {
      await setDoc(doc(db, "platform", "featureFlags"), updated, { merge: true });
    } catch (e) {
      Alert.alert("Error", "Could not save feature flag.");
      setFeatureFlags(featureFlags); // revert
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // APPROVE CHURCH — same logic as ApprovalScreen, centralized here
  // ─────────────────────────────────────────────────────────────────
  const approveChurch = async (org) => {
  setProcessingOrgId(org.id);

  try {
    const result =
      await approveOrganization({
        organizationId: org.id,
      });

    console.log(
      "✅ approval result",
      result.data
    );

    setApprovalModal(false);

    await loadOrganizations();

    Alert.alert(
      "✅ Approved",
      `${org.name} is now active.`
    );

  } catch (e) {

    console.log(
      "❌ approveChurch:",
      e
    );

    Alert.alert(
      "Approval failed",
      e.message
    );

  } finally {
    setProcessingOrgId(null);
  }
};
const deactivateChurch = async (org) => {
  if (!deactivationReason.trim()) {
    Alert.alert(
      "Reason Required",
      "Please provide a reason."
    );
    return;
  }

  setProcessingOrgId(org.id);

  try {

    await deactivateOrganization({
      organizationId: org.id,
      reason: deactivationReason,
    });

    await loadOrganizations();

    setDeactivationReason("");

    Alert.alert(
      "Church Deactivated",
      `${org.name} has been deactivated.`
    );

  } catch (e) {

    Alert.alert(
      "Error",
      e.message
    );

  } finally {

    setProcessingOrgId(null);

  }
};

const reinstateChurch = async (org) => {

  setProcessingOrgId(org.id);

  try {

    await reinstateOrganization({
      organizationId: org.id,
    });

    await loadOrganizations();

    Alert.alert(
      "Church Reinstated",
      `${org.name} has been reinstated.`
    );

  } catch (e) {

    Alert.alert(
      "Error",
      e.message
    );

  } finally {

    setProcessingOrgId(null);

  }
};

  // ─────────────────────────────────────────────────────────────────
  // PLAN OVERRIDE — force a plan for a specific org
  // ─────────────────────────────────────────────────────────────────
  const overridePlan = async () => {
    if (!planTarget) return;
    try {
      await setDoc(
        doc(db, "organizations", planTarget.id, "billing", "subscription"),
        {
          planId: selectedPlan,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          overriddenByDeveloper: true,
          overriddenAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await logActivity({
        type: "plan_override",
        orgId: planTarget.id,
        orgName: planTarget.name,
        message: `Plan overridden to ${selectedPlan} for ${planTarget.name}`,
      });
      setPlanModal(false);
      await loadOrganizations();
      Alert.alert("✅ Plan Updated", `${planTarget.name} is now on ${getPlan(selectedPlan).label}.`);
    } catch (e) {
      Alert.alert("Error", "Could not override plan.");
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // LOAD ORG DETAIL
  // ─────────────────────────────────────────────────────────────────
  const openOrgDetail = async (org) => {
    setOrgDetail(org);
    setOrgDetailModal(true);
    setOrgDetailData(null);

    try {
      const entitiesSnap = await getDocs(collection(db, "organizations", org.id, "entities"));
      const entities = entitiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const nodesSnap = await getDocs(collection(db, "organizations", org.id, "nodes"));
      const nodes = nodesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const subSnap = await getDoc(doc(db, "organizations", org.id, "billing", "subscription"));
      const sub = subSnap.exists() ? subSnap.data() : null;

      setOrgDetailData({ entities, nodes, sub });
    } catch (e) {
      console.log("❌ openOrgDetail:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // PLATFORM ANNOUNCEMENT
  // ─────────────────────────────────────────────────────────────────
  const sendAnnouncement = async () => {
    if (!announcement.trim()) return;
    try {
      await setDoc(doc(db, "platform", "announcement"), {
        message: announcement.trim(),
        type: announcementType,
        publishedAt: new Date().toISOString(),
        active: true,
      });
      await logActivity({
        type: "announcement",
        message: `Platform announcement sent: "${announcement.slice(0, 50)}"`,
      });
      setAnnouncementModal(false);
      setAnnouncement("");
      Alert.alert("✅ Sent", "Announcement is now visible to all users.");
    } catch (e) {
      Alert.alert("Error", "Could not send announcement.");
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // PLATFORM ACTIVITY LOG HELPER
  // ─────────────────────────────────────────────────────────────────
  const logActivity = async (entry) => {
    try {
      await setDoc(doc(collection(db, "platformActivity")), {
        ...entry,
        createdAt: new Date().toISOString(),
      });
    } catch (_) {}
  };

  // ─────────────────────────────────────────────────────────────────
  // FILTERED ORGS
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = orgs;
    if (orgFilter !== "all") filtered = filtered.filter(o => o.status === orgFilter);
    if (orgSearch) filtered = filtered.filter(o =>
      o.name?.toLowerCase().includes(orgSearch.toLowerCase()) ||
      o.denomination?.toLowerCase().includes(orgSearch.toLowerCase()) ||
      o.location?.toLowerCase().includes(orgSearch.toLowerCase())
    );
    setFilteredOrgs(filtered);
  }, [orgs, orgFilter, orgSearch]);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  // ─────────────────────────────────────────────────────────────────
  // RENDER TABS
  // ─────────────────────────────────────────────────────────────────
  const TABS = [
  { key: "overview",   label: "Overview",   icon: "grid-outline" },
  { key: "churches",   label: "Churches",   icon: "business-outline" },
  { key: "governance", label: "Governance", icon: "git-branch-outline" },
  { key: "activity",   label: "Activity",   icon: "pulse-outline" },
  { key: "flags",      label: "Flags",      icon: "flag-outline" },
];

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Developer Console</Text>
          <Text style={styles.headerSub}>ChurchCare Platform · {metrics.totalOrgs} orgs</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={() => setAnnouncementModal(true)}>
          <Ionicons name="megaphone-outline" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── PENDING ALERT BANNER ── */}
      {metrics.pendingOrgs > 0 && (
        <TouchableOpacity
          style={styles.pendingBanner}
          onPress={() => { setTab("churches"); setOrgFilter("pending"); }}
        >
          <Ionicons name="hourglass-outline" size={14} color="#fff" />
          <Text style={styles.pendingBannerText}>
            {metrics.pendingOrgs} church{metrics.pendingOrgs > 1 ? "es" : ""} awaiting approval — tap to review
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── TAB ROW ── */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={15} color={tab === t.key ? "#4B3F72" : "#aaa"} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#4B3F72" size="large" />
          <Text style={styles.loaderText}>Loading platform data…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >

          {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
          {tab === "overview" && (
            <>
              {/* KPI grid */}
              <Text style={styles.sectionTitle}>Platform Overview</Text>
              <View style={styles.kpiGrid}>
                <KPICard icon="business-outline" color="#4B3F72" label="Total Orgs"     value={metrics.totalOrgs} />
                <KPICard icon="checkmark-circle" color="#27ae60" label="Active"         value={metrics.activeOrgs} />
                <KPICard icon="hourglass-outline" color="#F39C12" label="Pending"       value={metrics.pendingOrgs} highlight={metrics.pendingOrgs > 0} />
                <KPICard icon="people-outline"   color="#0984E3" label="Total Members"  value={metrics.totalMembers.toLocaleString()} />
                <KPICard icon="calendar-outline" color="#6C5CE7" label="Sessions Run"   value={metrics.totalSessions.toLocaleString()} />
                <KPICard icon="wallet-outline"   color="#27ae60" label="Donations Rec." value={`GH₵${metrics.totalContributions.toLocaleString()}`} />
                <Text style={{ color: "#fff" }}>
  Governance Nodes: {governanceNodes.length}
</Text>

<Text style={{ color: "#F39C12" }}>
  Pending Links: {pendingLinks.length}
</Text>
              </View>

              {/* Monthly revenue */}
              <View style={styles.revenueCard}>
                <View style={styles.revenueLeft}>
                  <Text style={styles.revenueLabel}>Monthly Recurring Revenue</Text>
                  <Text style={styles.revenueValue}>GH₵ {metrics.monthlyRevenue.toLocaleString()}</Text>
                  <Text style={styles.revenueSub}>From {(metrics.planCounts.basic || 0) + (metrics.planCounts.pro || 0)} paying orgs</Text>
                </View>
                <Ionicons name="trending-up-outline" size={36} color="#27ae60" />
              </View>

              {/* Plan distribution */}
              <Text style={styles.sectionTitle}>Plan Distribution</Text>
              <View style={styles.card}>
                {PLAN_ORDER.map(pid => {
                  const count = metrics.planCounts[pid] || 0;
                  const pct = metrics.totalOrgs > 0 ? (count / metrics.totalOrgs) * 100 : 0;
                  const plan = getPlan(pid);
                  return (
                    <View key={pid} style={styles.planDistRow}>
                      <Text style={styles.planDistLabel}>{plan.label}</Text>
                      <View style={styles.planDistTrack}>
                        <View style={[styles.planDistFill, { width: `${pct}%`, backgroundColor: pid === "pro" ? "#4B3F72" : pid === "basic" ? "#0984E3" : pid === "free" ? "#888" : "#27ae60" }]} />
                      </View>
                      <Text style={styles.planDistCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Quick actions */}
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <ActionCard icon="hourglass-outline" color="#F39C12" label="Review Pending"
                  sub={`${metrics.pendingOrgs} waiting`}
                  onPress={() => { setTab("churches"); setOrgFilter("pending"); }} />
                <ActionCard icon="megaphone-outline" color="#4B3F72" label="Announcement"
                  sub="Broadcast to all users"
                  onPress={() => setAnnouncementModal(true)} />
                <ActionCard icon="flag-outline" color="#6C5CE7" label="Feature Flags"
                  sub="Toggle platform features"
                  onPress={() => setTab("flags")} />
                <ActionCard icon="pulse-outline" color="#27ae60" label="Live Activity"
                  sub="What's happening now"
                  onPress={() => setTab("activity")} />
              </View>
            </>
          )}

          {/* ════════════════════ CHURCHES TAB ════════════════════ */}
          {tab === "churches" && (
            <>
              {/* Filter + search */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={15} color="#aaa" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search churches…"
                  value={orgSearch}
                  onChangeText={setOrgSearch}
                />
                {orgSearch ? (
                  <TouchableOpacity onPress={() => setOrgSearch("")}>
                    <Ionicons name="close-circle" size={15} color="#aaa" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.filterRow}>
                {["all", "active", "inactive", "pending", "rejected"].map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, orgFilter === f && styles.filterChipActive]}
                    onPress={() => setOrgFilter(f)}
                  >
                    <Text style={[styles.filterChipText, orgFilter === f && styles.filterChipTextActive]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>{filteredOrgs.length} Church{filteredOrgs.length !== 1 ? "es" : ""}</Text>

              {filteredOrgs.map(org => (
                <OrgCard
  key={org.id}
  org={org}
  processingOrgId={processingOrgId}
  onPress={() => openOrgDetail(org)}
  onApprove={() => {
    setSelectedOrg(org);
    setApprovalModal(true);
  }}
  onPlan={() => {
    setPlanTarget(org);
    setSelectedPlan(
      org.subscription?.planId || "free"
    );
    setPlanModal(true);
  }}
  onDeactivate={() => {
  setSelectedOrg(org);
  setDeactivationReason("");
  setDeactivateModal(true);
}}
  onReinstate={() =>
    reinstateChurch(org)
  }
/>

                
              ))}

              {filteredOrgs.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="business-outline" size={40} color="#ddd" />
                  <Text style={styles.emptyText}>No churches match this filter</Text>
                </View>
              )}
            </>
          )}


  {tab === "governance" && (
  <>
    <Text style={styles.sectionTitle}>
      Governance Registry
    </Text>

    <View style={styles.card}>
      <InfoPair
        label="Total Nodes"
        value={governanceNodes.length}
      />

      <InfoPair
        label="Pending Links"
        value={pendingLinks.length}
      />
    </View>

    {pendingLinks.length === 0 ? (
      <View style={styles.emptyState}>
        <Ionicons
          name="checkmark-circle-outline"
          size={40}
          color="#27ae60"
        />
        <Text style={styles.emptyText}>
          No pending governance links
        </Text>
      </View>
    ) : (
      pendingLinks.map(node => (
        <View
          key={node.id}
          style={styles.orgCard}
        >
          <Text style={styles.orgName}>
            {node.name}
          </Text>

          <Text style={styles.orgSub}>
            Level: {node.levelId}
          </Text>

          <Text
            style={{
              color: "#F39C12",
              marginTop: 6,
            }}
          >
            Waiting for parent assignment
          </Text>
        </View>
      ))
    )}
  </>
)}







          {/* ════════════════════ ACTIVITY TAB ════════════════════ */}
          {tab === "activity" && (
            <>
              <Text style={styles.sectionTitle}>Live Platform Activity</Text>
              {liveActivity.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="pulse-outline" size={40} color="#ddd" />
                  <Text style={styles.emptyText}>No activity yet</Text>
                  <Text style={styles.emptySubText}>
                    Activity events appear here once churches start using the app.
                    Write to the `platformActivity` collection from AttendanceScreen.startSession()
                    to populate this feed.
                  </Text>
                </View>
              ) : (
                liveActivity.map(a => (
                  <ActivityRow key={a.id} activity={a} />
                ))
              )}
            </>
          )}

          {/* ════════════════════ FLAGS TAB ════════════════════ */}
          {tab === "flags" && (
            <>
              <Text style={styles.sectionTitle}>Feature Flags</Text>
              <Text style={styles.sectionSubtitle}>
                Changes take effect immediately across all users. Use with care.
              </Text>

              {/* Maintenance mode gets a special warning */}
              <View style={[styles.flagCard, featureFlags.maintenance_mode && { borderColor: "#e74c3c", borderWidth: 2 }]}>
                <View style={[styles.flagIcon, { backgroundColor: "#e74c3c20" }]}>
                  <Ionicons name="construct-outline" size={18} color="#e74c3c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flagTitle}>Maintenance Mode</Text>
                  <Text style={styles.flagSub}>
                    {featureFlags.maintenance_mode
                      ? "⚠️ ACTIVE — all users see a maintenance screen"
                      : "Show a maintenance screen to all non-developer users"}
                  </Text>
                </View>
                <Switch
                  value={featureFlags.maintenance_mode}
                  onValueChange={v => {
                    if (v) {
                      Alert.alert(
                        "Enable Maintenance Mode?",
                        "This will block ALL non-developer users from using the app immediately.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Enable", style: "destructive", onPress: () => saveFeatureFlag("maintenance_mode", true) }
                        ]
                      );
                    } else {
                      saveFeatureFlag("maintenance_mode", false);
                    }
                  }}
                  trackColor={{ true: "#e74c3c" }}
                />
              </View>

              {/* Registration gate */}
              <FlagCard
                icon="add-circle-outline"
                color="#27ae60"
                title="New Registrations Open"
                sub="Allow new churches to submit registration requests"
                flagKey="new_registrations_open"
                value={featureFlags.new_registrations_open}
                onToggle={saveFeatureFlag}
              />
              <FlagCard
                icon="bulb-outline"
                color="#F39C12"
                title="AI Insights"
                sub="Finance AI analysis (calls Anthropic API — disabling saves API costs)"
                flagKey="ai_insights_enabled"
                value={featureFlags.ai_insights_enabled}
                onToggle={saveFeatureFlag}
              />
              <FlagCard
                icon="qr-code-outline"
                color="#4B3F72"
                title="QR Generator"
                sub="Dynamic QR code generation in Settings"
                flagKey="qr_generator_enabled"
                value={featureFlags.qr_generator_enabled}
                onToggle={saveFeatureFlag}
              />
              <FlagCard
                icon="receipt-outline"
                color="#0984E3"
                title="Donation Receipts"
                sub="PDF receipt generation (uses expo-print)"
                flagKey="donation_receipts_enabled"
                value={featureFlags.donation_receipts_enabled}
                onToggle={saveFeatureFlag}
              />
              <FlagCard
                icon="location-outline"
                color="#00B894"
                title="Geo Check-in"
                sub="GPS-based attendance verification"
                flagKey="geo_checkin_enabled"
                value={featureFlags.geo_checkin_enabled}
                onToggle={saveFeatureFlag}
              />
            </>
          )}

        </ScrollView>
      )}

      {/* ══════════ APPROVAL MODAL ══════════ */}
      <Modal visible={approvalModal} transparent animationType="slide">
  <View style={styles.overlay}>
    <View
      style={[
        styles.modalBox,
        { maxHeight: "85%" }
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        {selectedOrg && (
          <>
                
<Text style={styles.fieldLabel}>
  Registration Details
</Text>

<View style={styles.subDetail}>

  <InfoPair
    label="Church Name"
    value={selectedOrg.name || "—"}
  />

  <InfoPair
    label="Location"
    value={selectedOrg.location || "—"}
  />

  <InfoPair
    label="Denomination"
    value={selectedOrg.denomination || "—"}
  />

</View>
                <View
  style={{
    backgroundColor: "#EEF0FA",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  }}
>
  <Text
    style={{
      color: "#4B3F72",
      fontWeight: "700",
    }}
  >
    {getTemplate(
      selectedOrg.templateId
    )?.name}
  </Text>

  <Text
    style={{
      marginTop: 4,
      color: "#555",
    }}
  >
    Creating:
    {" "}
    {
      getTemplate(selectedOrg.templateId)
        ?.levels
        ?.find(
          l => l.id === selectedOrg.levelId
        )?.label
    }
  </Text>
</View>

<Text style={styles.fieldLabel}>
  Administrator
</Text>

<View style={styles.subDetail}>

  <InfoPair
    label="Name"
    value={selectedOrg.adminName || "—"}
  />

  <InfoPair
    label="Phone"
    value={selectedOrg.adminPhone || "—"}
  />

  <InfoPair
    label="Email"
    value={selectedOrg.adminEmail || "—"}
  />

</View>

<Text style={styles.fieldLabel}>
  Primary Contact
</Text>



<View style={styles.subDetail}>

  <InfoPair
    label="Name"
    value={selectedOrg.contactName || "—"}
  />

  <InfoPair
    label="Phone"
    value={selectedOrg.contactPhone || "—"}
  />

  <InfoPair
    label="Email"
    value={selectedOrg.contactEmail || "—"}
  />

</View>
<Text style={styles.fieldLabel}>
  Governance
</Text>

<View style={styles.subDetail}>

  <InfoPair
    label="Template"
    value={
      getTemplate(selectedOrg.templateId)?.name ||
      selectedOrg.templateId ||
      "—"
    }
  />

  <InfoPair
    label="Level"
    value={
      getTemplate(selectedOrg.templateId)
        ?.levels
        ?.find(
          l => l.id === selectedOrg.levelId
        )?.label ||
      selectedOrg.levelId ||
      "—"
    }
  />

  <InfoPair
    label="Relationship"
    value={
      selectedOrg.relationshipMode ||
      "—"
    }
  />

</View>





                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={13} color="#4B3F72" />
                  <Text style={styles.infoBoxText}>
                    Approving will: activate the org, create a{" "}
                    {getTemplate(selectedOrg.templateId)?.levels?.length || 4}-level hierarchy,
                    and start a 14-day Pro trial.
                  </Text>
                </View>

                {processingOrgId === selectedOrg.id ? (
                  <ActivityIndicator color="#4B3F72" style={{ marginVertical: 16 }} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => approveChurch(selectedOrg)}>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve & Activate</Text>
                    </TouchableOpacity>

                    <Text style={styles.fieldLabel}>Rejection Reason (required to reject)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Why is this registration being rejected?"
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.rejectBtn, !rejectReason.trim() && { opacity: 0.4 }]}
                      onPress={() => rejectChurch(selectedOrg)}
                      disabled={!rejectReason.trim()}
                    >
                      <Ionicons name="close-circle" size={16} color="#fff" />
                      <Text style={styles.rejectBtnText}>Reject Registration</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={() => { setApprovalModal(false); setRejectReason(""); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                           </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>





<Modal
  visible={deactivateModal}
  transparent
  animationType="fade"
>
  <View style={styles.overlay}>
    <View style={styles.modalBox}>

      <Text style={styles.modalTitle}>
        Deactivate Church
      </Text>

      <Text style={styles.modalSub}>
        {selectedOrg?.name}
      </Text>

      <Text style={styles.fieldLabel}>
        Reason *
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            height: 90,
            textAlignVertical: "top",
          },
        ]}
        multiline
        placeholder="Why is this church being deactivated?"
        value={deactivationReason}
        onChangeText={setDeactivationReason}
      />

      <TouchableOpacity
        style={[
          styles.rejectBtn,
          !deactivationReason.trim() &&
            { opacity: 0.4 }
        ]}
        disabled={!deactivationReason.trim()}
        onPress={async () => {
          await deactivateChurch(
            selectedOrg
          );

          setDeactivateModal(false);
        }}
      >
        <Ionicons
          name="pause-circle-outline"
          size={16}
          color="#fff"
        />

        <Text style={styles.rejectBtnText}>
          Deactivate Church
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setDeactivateModal(false);
          setDeactivationReason("");
        }}
      >
        <Text style={styles.cancelText}>
          Cancel
        </Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>







      {/* ══════════ ORG DETAIL MODAL ══════════ */}
      <Modal visible={orgDetailModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: "85%" }]}>
            <ScrollView>
              {orgDetail && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>{orgDetail.name}</Text>
                    <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[orgDetail.status] || "#888") + "22" }]}>
                      <Ionicons name={STATUS_ICON[orgDetail.status] || "ellipse-outline"} size={11} color={STATUS_COLOR[orgDetail.status] || "#888"} />
                      <Text style={[styles.statusPillText, { color: STATUS_COLOR[orgDetail.status] || "#888" }]}>
                        {orgDetail.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalInfoGrid}>
                    <InfoPair label="Denomination" value={orgDetail.denomination || "—"} />
                    <InfoPair label="Location" value={orgDetail.location || "—"} />
                    <InfoPair label="Contact" value={orgDetail.contactName || "—"} />
                    <InfoPair label="Phone" value={orgDetail.contactPhone || "—"} />
                    <InfoPair label="Email" value={orgDetail.contactEmail || "—"} />
                    <InfoPair label="Template" value={getTemplate(orgDetail.templateId)?.name || "—"} />
                    <InfoPair label="Registered" value={orgDetail.createdAt?.slice(0, 10) || "—"} />
                    {orgDetail.approvedAt && <InfoPair label="Approved" value={orgDetail.approvedAt?.slice(0, 10)} />}
                    {orgDetail.rejectionReason && <InfoPair label="Rejection Reason" value={orgDetail.rejectionReason} />}
                  </View>

                  <View style={styles.modalStatsRow}>
                    <MiniStat label="Members" value={orgDetail.memberCount || 0} />
                    <MiniStat label="Entities" value={orgDetail.entityCount || 0} />
                    <MiniStat label="Sessions" value={orgDetail.sessionCount || 0} />
                    <MiniStat label="Donations" value={`GH₵${(orgDetail.contributionTotal || 0).toLocaleString()}`} />
                  </View>

                  {orgDetailData ? (
                    <>
                      <Text style={styles.fieldLabel}>Subscription</Text>
                      <View style={styles.subDetail}>
                        <InfoPair label="Plan" value={getPlan(orgDetailData.sub?.planId || "free").label} />
                        <InfoPair label="Status" value={orgDetailData.sub?.status || "free"} />
                        {orgDetailData.sub?.trialEndsAt && (
                          <InfoPair label="Trial Ends" value={orgDetailData.sub.trialEndsAt.slice(0, 10)} />
                        )}
                        {orgDetailData.sub?.overriddenByDeveloper && (
                          <InfoPair label="Note" value="⚠️ Plan manually overridden by developer" />
                        )}
                      </View>

                      <Text style={styles.fieldLabel}>Nodes ({orgDetailData.nodes.length})</Text>
                      {orgDetailData.nodes.map(n => (
                        <View key={n.id} style={styles.nodeDetailRow}>
                          <Ionicons name="ellipse" size={8} color="#4B3F72" />
                          <Text style={styles.nodeDetailText}>{n.name} ({n.levelId})</Text>
                          {n.entityId && <View style={styles.linkedMini}><Text style={styles.linkedMiniText}>linked</Text></View>}
                        </View>
                      ))}
                    </>
                  ) : (
                    <ActivityIndicator color="#4B3F72" style={{ marginVertical: 16 }} />
                  )}

                  <TouchableOpacity
                    style={styles.planOverrideBtn}
                    onPress={() => {
                      setPlanTarget(orgDetail);
                      setSelectedPlan(orgDetail.subscription?.planId || "free");
                      setOrgDetailModal(false);
                      setPlanModal(true);
                    }}
                  >
                    <Ionicons name="card-outline" size={14} color="#4B3F72" />
                    <Text style={styles.planOverrideBtnText}>Override Plan</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setOrgDetailModal(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ PLAN OVERRIDE MODAL ══════════ */}
      <Modal visible={planModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Override Plan</Text>
            <Text style={styles.modalSub}>{planTarget?.name}</Text>


            <View style={styles.infoBox}>
              <Ionicons name="alert-outline" size={13} color="#e67e22" />
              <Text style={[styles.infoBoxText, { color: "#e67e22" }]}>
                Developer overrides bypass payment verification. Use only for testing or exceptional support cases.
              </Text>
            </View>

            {PLAN_ORDER.map(pid => {
              const p = getPlan(pid);
              return (
                <TouchableOpacity
                  key={pid}
                  style={[styles.planOption, selectedPlan === pid && styles.planOptionActive]}
                  onPress={() => setSelectedPlan(pid)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planOptionName, selectedPlan === pid && { color: "#4B3F72" }]}>{p.label}</Text>
                    <Text style={styles.planOptionPrice}>
                      {p.price === null ? "Custom" : p.price === 0 ? "Free" : `GH₵${p.price}/mo`}
                    </Text>
                  </View>
                  <View style={[styles.radioOuter, selectedPlan === pid && styles.radioActive]}>
                    {selectedPlan === pid && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={overridePlan}>
                <Text style={styles.white}>Apply Override</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPlanModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════ ANNOUNCEMENT MODAL ══════════ */}
      <Modal visible={announcementModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Platform Announcement</Text>
            <Text style={styles.modalSub}>Shown to all users when they open the app</Text>

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipRow}>
              {[
                { key: "info", color: "#0984E3" },
                { key: "warning", color: "#e67e22" },
                { key: "maintenance", color: "#e74c3c" },
                { key: "success", color: "#27ae60" },
              ].map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.chip, announcementType === t.key && { backgroundColor: t.color }]}
                  onPress={() => setAnnouncementType(t.key)}
                >
                  <Text style={[styles.chipText, announcementType === t.key && { color: "#fff" }]}>
                    {t.key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Write your announcement…"
              value={announcement}
              onChangeText={setAnnouncement}
              multiline
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={sendAnnouncement}>
                <Text style={styles.white}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAnnouncementModal(false)}>
                <Text style={styles.white}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────
function KPICard({ icon, color, label, value, highlight }) {
  return (
    <View style={[styles.kpiCard, highlight && { borderColor: color, borderWidth: 2 }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, color, label, sub, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function OrgCard({
  org,
  processingOrgId,
  onPress,
  onApprove,
  onPlan,
  onDeactivate,
  onReinstate,
}) {
  const color = STATUS_COLOR[org.status] || "#888";
  return (
    <TouchableOpacity style={styles.orgCard} onPress={onPress}>
      <View style={styles.orgCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orgName}>{org.name}</Text>
          <Text style={styles.orgSub}>{org.denomination} · {org.location}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: color + "22" }]}>
          <Ionicons name={STATUS_ICON[org.status] || "ellipse-outline"} size={11} color={color} />
          <Text style={[styles.statusPillText, { color }]}>{org.status}</Text>
        </View>
      </View>

      <View style={styles.orgCardStats}>
        <OrgStat icon="people-outline"    color="#4B3F72" value={org.memberCount || 0}  label="members" />
        <OrgStat icon="git-branch-outline" color="#0984E3" value={org.entityCount || 0} label="entities" />
        <OrgStat icon="card-outline"      color="#27ae60"  value={org.plan?.label || "Free"} label="plan" />
      </View>

      {org.status === "pending" && (
        processingOrgId === org.id ? (
          <ActivityIndicator color="#4B3F72" style={{ marginTop: 8 }} />
        ) : (
          <TouchableOpacity style={styles.approveCardBtn} onPress={onApprove}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
            <Text style={styles.approveCardBtnText}>Review & Approve</Text>
          </TouchableOpacity>
        )
      )}

{org.status === "active" && (
  <>
    <TouchableOpacity
      style={styles.planCardBtn}
      onPress={onPlan}
    >
      <Ionicons
        name="card-outline"
        size={12}
        color="#4B3F72"
      />
      <Text style={styles.planCardBtnText}>
        Manage Plan
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.planCardBtn,
        {
          backgroundColor: "#ffe6e6",
          marginTop: 6,
        },
      ]}
      onPress={onDeactivate}
    >
      <Ionicons
        name="pause-circle-outline"
        size={12}
        color="#e74c3c"
      />
      <Text
        style={{
          color: "#e74c3c",
          fontWeight: "700",
        }}
      >
        Deactivate
      </Text>
    </TouchableOpacity>
  </>
)}

{org.status === "inactive" && (
  <TouchableOpacity
    style={[
      styles.planCardBtn,
      {
        backgroundColor: "#e8fff0",
        marginTop: 6,
      },
    ]}
    onPress={onReinstate}
  >
    <Ionicons
      name="refresh-circle-outline"
      size={12}
      color="#27ae60"
    />
    <Text
      style={{
        color: "#27ae60",
        fontWeight: "700",
      }}
    >
      Reinstate
    </Text>
  </TouchableOpacity>
)}

    </TouchableOpacity>
  );
}

function OrgStat({ icon, color, value, label }) {
  return (
    <View style={styles.orgStat}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={styles.orgStatValue}>{value}</Text>
      <Text style={styles.orgStatLabel}>{label}</Text>
    </View>
  );
}

function ActivityRow({ activity }) {
  const ACTIVITY_ICON = {
    org_approved: { icon: "checkmark-circle", color: "#27ae60" },
    org_rejected: { icon: "close-circle", color: "#e74c3c" },
    plan_override: { icon: "card-outline", color: "#4B3F72" },
    announcement: { icon: "megaphone-outline", color: "#F39C12" },
    session_start: { icon: "play-circle", color: "#0984E3" },
    session_end:   { icon: "stop-circle", color: "#888" },
  };
  const cfg = ACTIVITY_ICON[activity.type] || { icon: "ellipse", color: "#ccc" };

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: cfg.color + "20" }]}>
        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityMessage}>{activity.message || activity.type}</Text>
        <Text style={styles.activityTime}>{activity.createdAt?.slice(0, 16).replace("T", " ") || "—"}</Text>
      </View>
    </View>
  );
}

function FlagCard({ icon, color, title, sub, flagKey, value, onToggle }) {
  return (
    <View style={styles.flagCard}>
      <View style={[styles.flagIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.flagTitle}>{title}</Text>
        <Text style={styles.flagSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={v => onToggle(flagKey, v)}
        trackColor={{ true: color }}
      />
    </View>
  );
}

function InfoPair({ label, value }) {
  return (
    <View style={styles.infoPairRow}>
      <Text style={styles.infoPairLabel}>{label}</Text>
      <Text style={styles.infoPairValue}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText: { color: "#888", fontSize: 13 },

  header: { backgroundColor: "#1a1a2e", paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },
  headerAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },

  pendingBanner: { backgroundColor: "#F39C12", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  pendingBannerText: { flex: 1, color: "#fff", fontSize: 12, fontWeight: "700" },

  tabRow: { flexDirection: "row", backgroundColor: "#16213e", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { fontSize: 11, color: "#666", fontWeight: "600" },
  tabTextActive: { color: "#4B3F72" },

  body: { padding: 14, paddingBottom: 80 },

  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#888", textTransform: "uppercase", marginBottom: 10, marginTop: 10 },
  sectionSubtitle: { fontSize: 11, color: "#666", marginBottom: 10, marginTop: -6 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  kpiCard: { width: "30.5%", backgroundColor: "#1a1a2e", borderRadius: 12, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  kpiValue: { fontSize: 18, fontWeight: "900" },
  kpiLabel: { fontSize: 9, color: "#666", fontWeight: "700", textTransform: "uppercase", textAlign: "center" },

  revenueCard: { backgroundColor: "#1a1a2e", borderRadius: 14, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderWidth: 1, borderColor: "#27ae6030" },
  revenueLeft: {},
  revenueLabel: { fontSize: 11, color: "#888", fontWeight: "700", textTransform: "uppercase" },
  revenueValue: { fontSize: 26, fontWeight: "900", color: "#27ae60", marginTop: 4 },
  revenueSub: { fontSize: 11, color: "#555", marginTop: 2 },

  card: { backgroundColor: "#1a1a2e", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },

  planDistRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  planDistLabel: { width: 80, fontSize: 12, color: "#888" },
  planDistTrack: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  planDistFill: { height: 6, borderRadius: 3 },
  planDistCount: { width: 24, fontSize: 12, color: "#666", textAlign: "right" },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionCard: { width: "48%", backgroundColor: "#1a1a2e", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: "800", color: "#ddd", textAlign: "center" },
  actionSub: { fontSize: 10, color: "#666", textAlign: "center", marginTop: 3 },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1a1a2e", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#ddd" },

  filterRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  filterChipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  filterChipText: { fontSize: 11, color: "#666", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },

  orgCard: { backgroundColor: "#1a1a2e", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  orgCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  orgName: { fontSize: 14, fontWeight: "800", color: "#ddd" },
  orgSub: { fontSize: 11, color: "#666", marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  orgCardStats: { flexDirection: "row", gap: 14, marginBottom: 8 },
  orgStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  orgStatValue: { fontSize: 12, fontWeight: "700", color: "#ccc" },
  orgStatLabel: { fontSize: 10, color: "#555" },
  approveCardBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#27ae60", borderRadius: 8, padding: 10, marginTop: 4 },
  approveCardBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  planCardBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginTop: 4 },
  planCardBtnText: { fontSize: 11, color: "#4B3F72", fontWeight: "700" },

  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1a1a2e", borderRadius: 10, padding: 12, marginBottom: 6 },
  activityIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityMessage: { fontSize: 13, color: "#ccc", fontWeight: "600" },
  activityTime: { fontSize: 10, color: "#555", marginTop: 2 },

  flagCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1a1a2e", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  flagIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  flagTitle: { fontSize: 13, fontWeight: "700", color: "#ddd" },
  flagSub: { fontSize: 11, color: "#666", marginTop: 2 },

  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyText: { color: "#555", marginTop: 10, fontSize: 13 },
  emptySubText: { color: "#444", marginTop: 6, fontSize: 11, textAlign: "center", lineHeight: 16 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center" },
  modalBox: { backgroundColor: "#fff", margin: 20, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#222", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#888", marginBottom: 14 },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalInfoGrid: { gap: 4, marginBottom: 14 },
  modalStatsRow: { flexDirection: "row", backgroundColor: "#f8f8f8", borderRadius: 10, padding: 12, gap: 10, marginBottom: 14 },
  modalBtnRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  modalSaveBtn: { flex: 1, backgroundColor: "#4B3F72", padding: 12, borderRadius: 10, alignItems: "center" },
  modalCancelBtn: { flex: 1, backgroundColor: "#aaa", padding: 12, borderRadius: 10, alignItems: "center" },
  white: { color: "#fff", fontWeight: "700" },
  cancelText: { textAlign: "center", color: "#888", marginTop: 12, padding: 8 },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 10, marginBottom: 12 },
  infoBoxText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },

  infoPairRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  infoPairLabel: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  infoPairValue: { fontSize: 11, color: "#333", fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 10 },

  miniStat: { flex: 1, alignItems: "center" },
  miniStatValue: { fontSize: 15, fontWeight: "900", color: "#4B3F72" },
  miniStatLabel: { fontSize: 9, color: "#aaa", textTransform: "uppercase", fontWeight: "700", marginTop: 2 },

  subDetail: { backgroundColor: "#f8f8f8", borderRadius: 10, padding: 10, marginBottom: 12, gap: 4 },
  nodeDetailRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  nodeDetailText: { fontSize: 12, color: "#555" },
  linkedMini: { backgroundColor: "#EEF0FA", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  linkedMiniText: { fontSize: 9, color: "#4B3F72", fontWeight: "800" },

  planOverrideBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start", marginTop: 8 },
  planOverrideBtnText: { fontSize: 12, color: "#4B3F72", fontWeight: "700" },

  approveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#27ae60", borderRadius: 10, padding: 12, marginBottom: 10 },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  rejectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#e74c3c", borderRadius: 10, padding: 12 },
  rejectBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  planOption: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#eee", marginBottom: 8 },
  planOptionActive: { borderColor: "#4B3F72", backgroundColor: "#fafafe" },
  planOptionName: { fontSize: 14, fontWeight: "700", color: "#333" },
  planOptionPrice: { fontSize: 11, color: "#888", marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#4B3F72" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4B3F72" },

  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 11, fontSize: 13, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0" },
  chipText: { fontSize: 12, color: "#555", fontWeight: "600" },
});