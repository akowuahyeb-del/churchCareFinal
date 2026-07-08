// screens/AttendanceSummaryScreen.js
//
// ✅ Full intelligence layer over attendance data:
//   - Real session history from Firestore, not hardcoded cards
//   - SVG bar + line charts built with react-native-svg (already installed)
//   - Mobility-aware rate (excludes away members from denominator)
//   - Per-member insights: streaks, consistent absentees, first-timers
//   - Group session breakdown
//   - Smart insights engine: derives 5-7 actionable observations
//   - Service-type filter + date range selector

import React, { useState, useEffect, useCallback } from "react";
import {
  View, StyleSheet,ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Rect, Line, Circle, Path, Text as SvgText, G } from "react-native-svg";
import { db } from "../firebase";
import {
  collection, getDocs, query, where, orderBy, limit
} from "firebase/firestore";
import AppHeader from "../components/AppHeader";
import AppText from "../components/AppText";
import { isMemberAway, trueLocalMembers } from "../constants/memberMobility";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH  = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 160;

// ─────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────
const today      = () => new Date().toISOString().split("T")[0];
const daysAgo    = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };
const formatDate = (iso) => { const d = new Date(iso); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); };
const dayName    = (iso) => { const d = new Date(iso); return d.toLocaleDateString("en-GB", { weekday: "short" }); };

const DATE_RANGES = [
  { key: "4w",  label: "4 Weeks",  days: 28  },
  { key: "3m",  label: "3 Months", days: 90  },
  { key: "6m",  label: "6 Months", days: 180 },
  { key: "1y",  label: "1 Year",   days: 365 },
];

// ─────────────────────────────────────────────────────────────────
// SVG BAR CHART
// ─────────────────────────────────────────────────────────────────
function BarChart({ data, color = "#4B3F72", showLabels = true }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW   = (CHART_WIDTH - 20) / data.length - 4;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 30}>
      {/* Baseline */}
      <Line x1={0} y1={CHART_HEIGHT} x2={CHART_WIDTH} y2={CHART_HEIGHT}
        stroke="#eee" strokeWidth={1} />

      {/* Horizontal guide lines */}
      {[0.25, 0.5, 0.75, 1].map((pct, i) => (
        <G key={i}>
          <Line
            x1={0} y1={CHART_HEIGHT - pct * CHART_HEIGHT}
            x2={CHART_WIDTH} y2={CHART_HEIGHT - pct * CHART_HEIGHT}
            stroke="#f0f0f0" strokeWidth={1} strokeDasharray="4 4"
          />
          <SvgText
            x={2} y={CHART_HEIGHT - pct * CHART_HEIGHT - 3}
            fontSize={8} fill="#ccc">
            {Math.round(maxVal * pct)}
          </SvgText>
        </G>
      ))}

      {data.map((d, i) => {
        const barH  = Math.max(4, (d.value / maxVal) * CHART_HEIGHT);
        const x     = i * ((CHART_WIDTH - 20) / data.length) + 10;
        const isMax = d.value === maxVal;

        return (
          <G key={i}>
            <Rect
              x={x} y={CHART_HEIGHT - barH}
              width={barW} height={barH}
              rx={3}
              fill={d.highlight ? "#E11D48" : isMax ? color : color + "88"}
            />
            {showLabels && (
              <SvgText
                x={x + barW / 2} y={CHART_HEIGHT + 14}
                textAnchor="middle" fontSize={8} fill="#aaa">
                {d.label}
              </SvgText>
            )}
            {d.value > 0 && (
              <SvgText
                x={x + barW / 2} y={CHART_HEIGHT - barH - 4}
                textAnchor="middle" fontSize={8} fill={color} fontWeight="bold">
                {d.value}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// SVG LINE CHART (trend)
// ─────────────────────────────────────────────────────────────────
function LineChart({ data, color = "#4B3F72" }) {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range  = maxVal - minVal || 1;

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * (CHART_WIDTH - 24) + 12,
    y: CHART_HEIGHT - ((d.value - minVal) / range) * (CHART_HEIGHT - 20) - 10,
    ...d,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const fillD = pathD + ` L${pts[pts.length - 1].x},${CHART_HEIGHT} L${pts[0].x},${CHART_HEIGHT} Z`;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 30}>
      {/* Guide lines */}
      {[0, 0.5, 1].map((pct, i) => (
        <Line key={i}
          x1={0} y1={CHART_HEIGHT - pct * (CHART_HEIGHT - 20) - 10}
          x2={CHART_WIDTH} y2={CHART_HEIGHT - pct * (CHART_HEIGHT - 20) - 10}
          stroke="#f0f0f0" strokeWidth={1}
        />
      ))}

      {/* Fill */}
      <Path d={fillD} fill={color + "18"} />

      {/* Line */}
      <Path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />

      {/* Points */}
      {pts.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={3} fill={color} />
          {i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
            <SvgText x={p.x} y={CHART_HEIGHT + 14}
              textAnchor="middle" fontSize={8} fill="#aaa">
              {p.label}
            </SvgText>
          )}
        </G>
      ))}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// SMART INSIGHTS ENGINE
// Derives observations from actual data, not placeholder text
// ─────────────────────────────────────────────────────────────────
function deriveInsights(sessions, members, attendance) {
  const insights = [];
  if (sessions.length === 0) return insights;

  const sorted = [...sessions].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const latest = sorted[0];
  const prev   = sorted[1];

  // 1. Trend: improving or declining?
  if (latest && prev && latest.finalRate != null && prev.finalRate != null) {
    const diff = latest.finalRate - prev.finalRate;
    if (Math.abs(diff) >= 5) {
      insights.push({
        icon: diff > 0 ? "trending-up-outline" : "trending-down-outline",
        color: diff > 0 ? "#27ae60" : "#e74c3c",
        text: `Attendance ${diff > 0 ? "improved" : "dropped"} by ${Math.abs(diff)}% compared to the previous session. ${diff > 0 ? "Good momentum — keep it up." : "Worth investigating with your pastoral team."}`,
        priority: Math.abs(diff) >= 10 ? 1 : 2,
      });
    }
  }

  // 2. Peak day detection
  const byService = {};
  sessions.forEach(s => {
    const key = s.service || "Unknown";
    if (!byService[key]) byService[key] = [];
    byService[key].push(s.finalRate || 0);
  });
  let bestService = null, bestAvg = 0;
  Object.entries(byService).forEach(([k, rates]) => {
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    if (avg > bestAvg) { bestAvg = avg; bestService = k; }
  });
  if (bestService) {
    insights.push({
      icon: "star-outline",
      color: "#F39C12",
      text: `${bestService} service consistently has the highest attendance (avg ${Math.round(bestAvg)}%). Consider scheduling key announcements and events on this day.`,
      priority: 3,
    });
  }

  // 3. Total members vs. average attendance gap
  const avgPresent = sessions.reduce((s, sess) => s + (sess.finalPresent || 0), 0) / sessions.length;
  const engagementRate = members.length > 0 ? Math.round((avgPresent / members.length) * 100) : 0;
  if (engagementRate < 60 && members.length > 10) {
    insights.push({
      icon: "alert-circle-outline",
      color: "#e74c3c",
      text: `Only ${engagementRate}% of registered members are attending on average. ${members.length - Math.round(avgPresent)} members haven't been seen recently — consider a pastoral outreach drive.`,
      priority: 1,
    });
  } else if (engagementRate >= 80) {
    insights.push({
      icon: "checkmark-circle-outline",
      color: "#27ae60",
      text: `Strong engagement — ${engagementRate}% of registered members are attending on average. This is above the typical 60-70% benchmark for active congregations.`,
      priority: 3,
    });
  }

  // 4. Consecutive decline
  if (sorted.length >= 3) {
    const recentRates = sorted.slice(0, 3).map(s => s.finalRate || 0);
    const declining = recentRates[0] < recentRates[1] && recentRates[1] < recentRates[2];
    const growing   = recentRates[0] > recentRates[1] && recentRates[1] > recentRates[2];
    if (declining) {
      insights.push({
        icon: "warning-outline",
        color: "#e74c3c",
        text: `3 consecutive sessions of declining attendance (${recentRates[2]}% → ${recentRates[1]}% → ${recentRates[0]}%). This pattern warrants attention from church leadership.`,
        priority: 1,
      });
    } else if (growing) {
      insights.push({
        icon: "trending-up-outline",
        color: "#27ae60",
        text: `3 consecutive sessions of growing attendance (${recentRates[2]}% → ${recentRates[1]}% → ${recentRates[0]}%). The congregation is growing — great sign!`,
        priority: 2,
      });
    }
  }

  // 5. Highest ever session
  const highestSession = sessions.reduce(
    (best, s) => (s.finalPresent || 0) > (best.finalPresent || 0) ? s : best, sessions[0]
  );
  if (highestSession && highestSession.finalPresent > 0) {
    insights.push({
      icon: "trophy-outline",
      color: "#F39C12",
      text: `Highest recorded attendance was ${highestSession.finalPresent} members on ${formatDate(highestSession.date)} (${highestSession.service} ${highestSession.type}).`,
      priority: 4,
    });
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function AttendanceSummaryScreen() {
  const navigation = useNavigation();
  const route      = useRoute();

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;

  const [sessions,      setSessions]      = useState([]);
  const [members,       setMembers]       = useState([]);
  const [attendance,    setAttendance]    = useState([]);
  const [groupSessions, setGroupSessions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const [dateRange,     setDateRange]     = useState("4w");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [chartType,     setChartType]     = useState("bar"); // bar | line
  const [activeTab,     setActiveTab]     = useState("overview"); // overview | members | groups | insights

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(d => {
      if (d) { try { setActiveEntity(JSON.parse(d)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;
    loadAll();
  }, [organizationId, entityId, dateRange]);

  const loadAll = useCallback(async () => {
    if (!organizationId || !entityId) return;
    setLoading(true);
    try {
      const rangeConfig = DATE_RANGES.find(r => r.key === dateRange);
      const fromDate    = daysAgo(rangeConfig?.days || 28);

      const [sessSnap, membSnap, attSnap, grpSnap] = await Promise.all([
        getDocs(query(
          collection(db, "organizations", organizationId, "entities", entityId, "sessions"),
          where("date", ">=", fromDate),
          where("status", "==", "ended")
        )),
        getDocs(collection(db, "organizations", organizationId, "entities", entityId, "members")),
        getDocs(query(
          collection(db, "organizations", organizationId, "entities", entityId, "attendance"),
          where("date", ">=", fromDate)
        )),
        getDocs(query(
          collection(db, "organizations", organizationId, "entities", entityId, "group_sessions"),
          where("date", ">=", fromDate),
          where("status", "==", "ended")
        )),
      ]);

      const sessionList = sessSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const memberList  = membSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const attList     = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const grpList     = grpSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setSessions(sessionList);
      setMembers(memberList);
      setAttendance(attList);
      setGroupSessions(grpList);
    } catch (e) {
      console.log("❌ AttendanceSummary loadAll:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, entityId, dateRange]);

  // ─── DERIVED DATA ───
  const todayDate = today();

  const filteredSessions = serviceFilter === "All"
    ? sessions
    : sessions.filter(s => s.service === serviceFilter);

  const availableServices = ["All", ...new Set(sessions.map(s => s.service).filter(Boolean))];

  // ✅ Mobility-aware true member count
  const localMemberCount = trueLocalMembers(members, todayDate).length;
  const awayCount        = members.length - localMemberCount;

  // Overall stats
  const avgPresent = filteredSessions.length > 0
  ? Math.round(
      filteredSessions.reduce(
        (s, sess) => s + (sess.finalPresent || 0),
        0
      ) / filteredSessions.length
    )
  : 0;

const avgRate = filteredSessions.length > 0
  ? Math.round(
      filteredSessions.reduce(
        (s, sess) => s + (sess.finalRate || 0),
        0
      ) / filteredSessions.length
    )
  : 0;

/* ATTENDANCE GRADE */

const attendanceGrade =
  avgRate >= 90
    ? "Excellent"
    : avgRate >= 75
    ? "Healthy"
    : avgRate >= 60
    ? "Fair"
    : "Needs Attention";

const attendanceInsight =
  avgRate >= 90
    ? "Outstanding engagement across the congregation."
    : avgRate >= 75
    ? "Healthy attendance levels with good member participation."
    : avgRate >= 60
    ? "Attendance is fair but there is room to improve engagement."
    : "Attendance requires attention and pastoral follow-up.";

const attendanceGradeColor =
  avgRate >= 90
    ? "#27AE60"
    : avgRate >= 75
    ? "#4B3F72"
    : avgRate >= 60
    ? "#F39C12"
    : "#E74C3C";

const attendanceStatusMessage =
  filteredSessions.length === 0
    ? "No attendance data available for the selected period."
    : `Based on ${filteredSessions.length} completed session${
        filteredSessions.length > 1 ? "s" : ""
      }.`;

/* ATTENDANCE TREND */
const latestRate = filteredSessions[0]?.finalRate || 0;
const previousRate = filteredSessions[1]?.finalRate || 0;

const trendDirection =
  latestRate > previousRate
    ? "up"
    : latestRate < previousRate
    ? "down"
    : "flat";

const trendColor =
  trendDirection === "up"
    ? "#27AE60"
    : trendDirection === "down"
    ? "#E74C3C"
    : "#BDC3C7";

const peakPresent = filteredSessions.length > 0
  ? Math.max(...filteredSessions.map(s => s.finalPresent || 0))
  : 0;

    
  // Chart data — last sessions chronologically
  const chartSessions = [...filteredSessions].reverse().slice(-12);
  const barData = chartSessions.map(s => ({
    value:     s.finalPresent || 0,
    label:     formatDate(s.date),
    highlight: (s.finalPresent || 0) < avgPresent * 0.7,
  }));

  const rateData = chartSessions.map(s => ({
    value: s.finalRate || 0,
    label: formatDate(s.date),
  }));

  // Member intelligence
  const memberAbsences = {};
  const memberPresences = {};
  attendance
    .filter(a => !a.sessionScope || a.sessionScope !== "group")
    .forEach(a => {
      if (!a.memberId) return;
      if (a.status === "absent")  memberAbsences[a.memberId]  = (memberAbsences[a.memberId]  || 0) + 1;
      if (a.status === "present") memberPresences[a.memberId] = (memberPresences[a.memberId] || 0) + 1;
    });

  const topAbsentees = members
    .map(m => ({ ...m, absences: memberAbsences[m.id] || 0, presences: memberPresences[m.id] || 0 }))
    .filter(m => m.absences >= 2 && !isMemberAway(m, todayDate))
    .sort((a, b) => b.absences - a.absences)
    .slice(0, 5);

  const topAttenders = members
    .map(m => ({ ...m, presences: memberPresences[m.id] || 0 }))
    .filter(m => m.presences > 0)
    .sort((a, b) => b.presences - a.presences)
    .slice(0, 5);

  // Smart streak calculation
  const streaks = {};
  members.forEach(m => {
    const mSessions = [...filteredSessions].reverse();
    let streak = 0;
    for (const sess of mSessions) {
      const rec = attendance.find(a => a.memberId === m.id && a.sessionId === sess.id);
      if (rec?.status === "present") streak++;
      else break;
    }
    if (streak >= 3) streaks[m.id] = streak;
  });

  const streakMembers = members
    .filter(m => streaks[m.id])
    .sort((a, b) => (streaks[b.id] || 0) - (streaks[a.id] || 0))
    .slice(0, 5);

  // Group breakdown
  const groupBreakdown = groupSessions.reduce((acc, sess) => {
    const key = sess.groupId;
    if (!acc[key]) acc[key] = { name: sess.groupName, sessions: 0, totalPresent: 0, totalSize: 0 };
    acc[key].sessions++;
    acc[key].totalPresent += sess.finalPresent || 0;
    acc[key].totalSize    += sess.totalMembers || 0;
    return acc;
  }, {});

  // Smart insights
  const insights = deriveInsights(filteredSessions, members, attendance);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance Summary"
        subtitle="Intelligence & trends"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* DATE RANGE SELECTOR */}
      <View style={styles.rangeRow}>
        {DATE_RANGES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[styles.rangeChip, dateRange === r.key && styles.rangeChipActive]}
            onPress={() => setDateRange(r.key)}
          >
            <AppText
  style={[
    styles.rangeChipText,
    dateRange === r.key && styles.rangeChipTextActive
  ]}
>
  {r.label}
</AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB ROW */}
      <View style={styles.tabRow}>
        {[
          { key: "overview",  label: "Overview",  icon: "grid-outline"       },
          { key: "members",   label: "Members",   icon: "people-outline"     },
          { key: "groups",    label: "Groups",    icon: "layers-outline"     },
          { key: "insights",  label: "Insights",  icon: "bulb-outline"       },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={14} color={activeTab === t.key ? "#4B3F72" : "#aaa"} />
            <AppText
  style={[
    styles.tabText,
    activeTab === t.key && styles.tabTextActive
  ]}
>
  {t.label}
</AppText>
          </TouchableOpacity>
        ))}
      </View>


{/* ATTENDANCE HEALTH HERO */}
<View style={styles.heroCard}>
  <AppText style={styles.heroLabel}>
  Attendance Health
</AppText>

  <View style={styles.heroRateRow}>
  <AppText style={styles.heroRate}>
  {avgRate || 0}%
</AppText>

  <Ionicons
    name={
      trendDirection === "up"
        ? "arrow-up-circle"
        : trendDirection === "down"
        ? "arrow-down-circle"
        : "remove-circle"
    }
    size={28}
    color={trendColor}
  />
</View>


<AppText style={styles.heroSub}>
  Mobility-adjusted attendance rate
</AppText>

<View
  style={[
    styles.gradeBadge,
    { backgroundColor: attendanceGradeColor + "20" }
  ]}
>
  <AppText
  style={[
    styles.gradeBadgeText,
    { color: attendanceGradeColor }
  ]}
>
  {attendanceGrade}
</AppText>
</View>

<AppText style={styles.heroStatusText}>
  {attendanceStatusMessage}
</AppText>


  <View style={styles.heroStats}>
    <View style={styles.heroStat}>
    <AppText style={styles.heroStatValue}>
  {avgPresent}
</AppText>

<AppText style={styles.heroStatLabel}>
  Avg Present
</AppText>
    </View>

    <View style={styles.heroStat}>
     <AppText style={styles.heroStatValue}>
  {localMemberCount}
</AppText>

<AppText style={styles.heroStatLabel}>
  Local
</AppText>
    </View>

    <View style={styles.heroStat}>
     <AppText style={styles.heroStatValue}>
  {awayCount}
</AppText>

<AppText style={styles.heroStatLabel}>
  Away
</AppText>
`
    </View>
  </View>
</View>

{/* SESSION INFORMATION */}
{filteredSessions.length > 0 && (
  <View style={styles.sessionInfoCard}>

    <View style={styles.sessionInfoHeader}>
      <Ionicons
        name="calendar-outline"
        size={16}
        color="#4B3F72"
      />
    <AppText style={styles.sessionInfoHeaderText}>
  LAST COMPLETED SESSION
</AppText>
    </View>

   <AppText style={styles.sessionInfoService}>
  {filteredSessions[0]?.service || "Service"}
</AppText>

   <AppText style={styles.sessionInfoType}>
  {filteredSessions[0]?.type || "Session"}
</AppText>

    <View style={styles.sessionInfoRow}>
      <Ionicons
        name="calendar-outline"
        size={14}
        color="#888"
      />
     <AppText style={styles.sessionInfoText}>
  {formatDate(filteredSessions[0]?.date)}
</AppText>
    </View>

    <View style={styles.sessionInfoRow}>
      <Ionicons
        name="time-outline"
        size={14}
        color="#888"
      />
     <AppText style={styles.sessionInfoText}>
  {filteredSessions[0]?.startTime || "—"}
  {filteredSessions[0]?.endTime
    ? ` - ${filteredSessions[0]?.endTime}`
    : ""}
</AppText>
    </View>

    <View style={styles.sessionInfoRow}>
      <Ionicons
        name="business-outline"
        size={14}
        color="#888"
      />
      <AppText style={styles.sessionInfoText}>
  {activeEntity?.name}
</AppText>
    </View>

    {filteredSessions[0]?.event && (
      <View style={styles.sessionInfoRow}>
        <Ionicons
          name="flag-outline"
          size={14}
          color="#888"
        />
        <AppText style={styles.sessionInfoText}>
  {filteredSessions[0]?.event}
</AppText>
      </View>
    )}

    <View style={styles.completedBadge}>
      <AppText style={styles.completedBadgeText}>
  Completed
</AppText>
    </View>

  </View>
)}

<View style={styles.healthInsightCard}>
  <Ionicons
    name="pulse-outline"
    size={18}
    color={attendanceGradeColor}
  />

 <AppText style={styles.healthInsightText}>
  {attendanceInsight}
</AppText>
</View>


      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#4B3F72" size="large" />
          <AppText style={styles.loaderText}>
  Loading attendance intelligence…
</AppText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} />}
          showsVerticalScrollIndicator={false}
        >

          {/* ══════════════ OVERVIEW TAB ══════════════ */}
          {activeTab === "overview" && (
            <>
              {/* KPI CARDS */}
              <View style={styles.kpiGrid}>
                <KPICard icon="people-outline"     color="#4B3F72" label="Roster"         value={members.length}     sub={`${localMemberCount} local today`} />
                <KPICard icon="checkmark-circle"   color="#27ae60" label="Avg Present"    value={avgPresent}         sub={`${avgRate}% rate`} />
                <KPICard icon="trending-up-outline" color="#F39C12" label="Peak"          value={peakPresent}        sub="best session" />
                <KPICard icon="calendar-outline"   color="#0984E3" label="Sessions"       value={filteredSessions.length} sub="in period" />
              </View>

              {/* MOBILITY NOTICE */}
              {awayCount > 0 && (
                <View style={styles.mobilityNotice}>
                  <Ionicons name="airplane-outline" size={13} color="#0984E3" />
                  <AppText style={styles.mobilityNoticeText}>
  <AppText style={{ fontWeight: "800" }}>
    {awayCount} member{awayCount > 1 ? "s" : ""} away
  </AppText>
  {" "}right now (students, transients).
  Attendance rate is calculated against the {localMemberCount} members expected locally — not the full {members.length}.
</AppText>

                </View>
              )}

              {/* SERVICE FILTER */}
              {availableServices.length > 2 && (
                <View style={styles.serviceFilterRow}>
                  {availableServices.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.serviceChip, serviceFilter === s && styles.serviceChipActive]}
                      onPress={() => setServiceFilter(s)}
                    >
                      <AppText
  style={[
    styles.serviceChipText,
    serviceFilter === s && styles.serviceChipTextActive
  ]}
>
  {s}
</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {filteredSessions.length === 0 ? (
                <EmptyState icon="calendar-outline" title="No Sessions Yet"
                  sub="Sessions will appear here once they've been run and ended." />
              ) : (
                <>
                  {/* CHART TOGGLE + BAR CHART */}
                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <AppText style={styles.chartTitle}>
  Attendance Count
</AppText>
                      <View style={styles.chartToggle}>
                        {["bar", "line"].map(ct => (
                          <TouchableOpacity key={ct} style={[styles.chartToggleBtn, chartType === ct && styles.chartToggleBtnActive]}
                            onPress={() => setChartType(ct)}>
                            <Ionicons name={ct === "bar" ? "bar-chart-outline" : "analytics-outline"} size={14}
                              color={chartType === ct ? "#4B3F72" : "#aaa"} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.chartLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#4B3F72" }]} />
                        <AppText style={styles.legendText}>
  Present
</AppText>

<AppText style={styles.legendText}>
  Below average
</AppText>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#e74c3c88" }]} />
                        <AppText style={styles.legendText}>
  Present
</AppText>

<AppText style={styles.legendText}>
  Below average
</AppText>
                      </View>
                    </View>
                    {chartType === "bar"
                      ? <BarChart data={barData} color="#4B3F72" />
                      : <LineChart data={rateData.map(d => ({ ...d, value: d.value || 0 }))} color="#4B3F72" />}
                  </View>

                  {/* RATE TREND */}
                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <AppText style={styles.chartTitle}>
  Attendance Rate %
</AppText>
                      <View style={[styles.avgPill, { backgroundColor: avgRate >= 70 ? "#27ae6020" : "#e74c3c20" }]}>
                        <AppText
  style={[
    styles.avgPillText,
    { color: avgRate >= 70 ? "#27ae60" : "#e74c3c" }
  ]}
>
  Avg {avgRate}%
</AppText>
                      </View>
                    </View>
                    <LineChart data={rateData} color={avgRate >= 70 ? "#27ae60" : "#e74c3c"} />
                    <View style={styles.rateBenchmark}>
                     <AppText style={styles.rateBenchmarkText}>
  Industry benchmark: 60-75% for active congregations
</AppText>
                    </View>
                  </View>

                  {/* RECENT SESSIONS LIST */}
                  <AppText style={styles.sectionTitle}>
  Recent Sessions
</AppText>

                  {filteredSessions.slice(0, 8).map(sess => (
                    <SessionRow key={sess.id} session={sess} memberCount={localMemberCount} />
                  ))}
                </>
              )}
            </>
          )}

          {/* ══════════════ MEMBERS TAB ══════════════ */}
          {activeTab === "members" && (
            <>
              {/* ATTENDANCE STREAKS */}
              {streakMembers.length > 0 && (
                <>
                  <View style={styles.memberSectionHeader}>
                    <Ionicons name="flame-outline" size={16} color="#F39C12" />
<AppText style={styles.memberSectionTitle}>
  Attendance Streaks
</AppText>

                  </View>
                 <AppText style={styles.memberSectionSub}>
  Members who have attended every session in a row — celebrate them!
</AppText>
                  {streakMembers.map(m => (
                    <MemberInsightRow key={m.id}
                      member={m}
                      rightLabel={`${streaks[m.id]} in a row 🔥`}
                      rightColor="#F39C12"
                    />
                  ))}
                </>
              )}

              {/* TOP ATTENDERS */}
              {topAttenders.length > 0 && (
                <>
                  <View style={[styles.memberSectionHeader, { marginTop: 16 }]}>
                    <Ionicons name="trophy-outline" size={16} color="#27ae60" />
                    <AppText style={styles.memberSectionTitle}>
  Most Faithful
</AppText>
                  </View>
                  <AppText style={styles.memberSectionSub}>
  Highest number of sessions attended in this period
</AppText>
                  {topAttenders.map((m, i) => (
                    <MemberInsightRow key={m.id}
                      member={m}
                      rank={i + 1}
                      rightLabel={`${m.presences} sessions`}
                      rightColor="#27ae60"
                    />
                  ))}
                </>
              )}

              {/* CONCERNING ABSENTEES */}
              {topAbsentees.length > 0 && (
                <>
                  <View style={[styles.memberSectionHeader, { marginTop: 16 }]}>
                    <Ionicons name="alert-circle-outline" size={16} color="#e74c3c" />
                    <AppText style={styles.memberSectionTitle}>
  Needs Pastoral Attention
</AppText>

<AppText style={styles.memberSectionSub}>
  Not tagged as away, but frequently absent — pastoral follow-up recommended
</AppText>
                  </View>
                 <AppText style={styles.memberSectionSub}>
  Not tagged as away, but frequently absent — pastoral follow-up recommended
</AppText>
                  {topAbsentees.map(m => (
                    <MemberInsightRow key={m.id}
                      member={m}
                      rightLabel={`${m.absences} absences`}
                      rightColor="#e74c3c"
                      alert
                    />
                  ))}
                </>
              )}

              {streakMembers.length === 0 && topAttenders.length === 0 && topAbsentees.length === 0 && (
                <EmptyState icon="people-outline" title="No Member Data Yet"
                  sub="Run a few sessions first and member intelligence will appear here automatically." />
              )}
            </>
          )}

          {/* ══════════════ GROUPS TAB ══════════════ */}
          {activeTab === "groups" && (
            <>
              <View style={styles.memberSectionHeader}>
                <Ionicons name="layers-outline" size={16} color="#7C3AED" />
                
<AppText style={styles.memberSectionTitle}>
  Group Session Summary
</AppText>

              </View>
              
<AppText style={styles.memberSectionSub}>
  Group attendance tracked separately — not counted in general membership metrics.
</AppText>


              {Object.entries(groupBreakdown).length === 0 ? (
                <EmptyState icon="people-outline" title="No Group Sessions Yet"
                  sub="Run group attendance sessions (Choir, Youth, etc.) and their stats will appear here." />
              ) : (
                Object.entries(groupBreakdown).map(([gid, g]) => {
                  const avgGroupRate = g.totalSize > 0
                    ? Math.round((g.totalPresent / g.totalSize) * 100)
                    : 0;
                  const avgPerSession = g.sessions > 0
                    ? Math.round(g.totalPresent / g.sessions)
                    : 0;

                  return (
                    <View key={gid} style={styles.groupCard}>
                      <View style={styles.groupCardHeader}>
                        <View style={styles.groupIcon}>
                          <Ionicons name="people-outline" size={18} color="#7C3AED" />
                        </View>
                        <AppText style={styles.groupCardName}>
  {g.name}
</AppText>
                        <View style={[styles.rateChip, { backgroundColor: avgGroupRate >= 70 ? "#e8f8f0" : "#fce8e8" }]}>
                          <AppText
  style={[
    styles.rateChipText,
    { color: avgGroupRate >= 70 ? "#27ae60" : "#e74c3c" }
  ]}
>
  {avgGroupRate}%
</AppText>
                        </View>
                      </View>
                      <View style={styles.groupCardStats}>
                        <GroupStat label="Sessions" value={g.sessions} />
                        <GroupStat label="Avg Present" value={avgPerSession} />
                        <GroupStat label="Avg Rate" value={`${avgGroupRate}%`} />
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* ══════════════ INSIGHTS TAB ══════════════ */}
          {activeTab === "insights" && (
            <>
              <View style={styles.memberSectionHeader}>
                <Ionicons name="bulb-outline" size={16} color="#4B3F72" />
                <AppText style={styles.memberSectionTitle}>
  Smart Insights
</AppText>
              </View>
         <AppText style={styles.memberSectionSub}>
  Automatically derived from your attendance patterns — updated each time you refresh.
</AppText>

              {insights.length === 0 ? (
                <EmptyState icon="bulb-outline" title="More Data Needed"
                  sub="Smart insights appear once you have at least 3 completed sessions in the selected period." />
              ) : (
                insights.map((ins, i) => (
                  <View key={i} style={[styles.insightCard, { borderLeftColor: ins.color }]}>
                    <View style={[styles.insightIcon, { backgroundColor: ins.color + "20" }]}>
                      <Ionicons name={ins.icon} size={18} color={ins.color} />
                    </View>
          <AppText style={styles.insightText}>
  {ins.text}
</AppText>
                  </View>
                ))
              )}

              {/* COMPARATIVE SNAPSHOT */}
              {filteredSessions.length >= 2 && (
                <>
                  <View style={[styles.memberSectionHeader, { marginTop: 16 }]}>
                    <Ionicons name="git-compare-outline" size={16} color="#0984E3" />
                    <AppText style={styles.memberSectionTitle}>
  This Period vs. Previous
</AppText>
                  </View>
                  <ComparativeSnapshot sessions={filteredSessions} members={members} />
                </>
              )}
            </>
          )}

        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────
function KPICard({ icon, color, label, value, sub }) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <AppText style={[styles.kpiValue, { color }]}>
  {value}
</AppText>
      <AppText style={styles.kpiLabel}>
  {label}
</AppText>
      {sub && <AppText style={styles.kpiSub}>{sub}</AppText>}
`
    </View>
  );
}

function SessionRow({ session, memberCount }) {
  const rate = session.finalRate ||
    (session.finalPresent && memberCount > 0
      ? Math.round((session.finalPresent / memberCount) * 100)
      : 0);
  const rateColor = rate >= 75 ? "#27ae60" : rate >= 50 ? "#F39C12" : "#e74c3c";

  return (
    <View style={styles.sessionRow}>
      <View style={[styles.sessionRowDot, { backgroundColor: rateColor }]} />
      <View style={{ flex: 1 }}>
        <AppText style={styles.sessionRowTitle}>
  {session.service} · {session.type}
</AppText>
       <AppText style={styles.sessionRowMeta}>
  {formatDate(session.date)} · {session.startTime || "—"}
  {session.event && session.event !== "None"
    ? ` · ${session.event}`
    : ""}
</AppText>
      </View>
      <View style={styles.sessionRowRight}>
        <AppText
  style={[
    styles.sessionRowRate,
    { color: rateColor }
  ]}
>
  {rate}%
</AppText>
        <AppText style={styles.sessionRowCount}>
  {session.finalPresent || 0} present
</AppText>
      </View>
    </View>
  );
}

function MemberInsightRow({ member, rank, rightLabel, rightColor, alert }) {
  return (
    <View style={[styles.memberRow, alert && styles.memberRowAlert]}>
      {rank && <AppText style={styles.memberRank}>#{rank}</AppText>}
      <View style={styles.memberAvatar}>
        <AppText style={styles.memberAvatarText}>
  {(member.name || "?")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()}
</AppText>
      </View>
      <View style={{ flex: 1 }}>
<AppText style={styles.memberRowName}>
  {member.name}
</AppText>

<AppText style={styles.memberRowSub}>
  {member.ministry || ""}
</AppText>
      </View>
      <AppText
  style={[
    styles.memberRowRight,
    { color: rightColor }
  ]}
>
  {rightLabel}
</AppText>
    </View>
  );
}

function GroupStat({ label, value }) {
  return (
    <View style={styles.groupStatItem}>
   <AppText style={styles.groupStatValue}>
  {value}
</AppText>

<AppText style={styles.groupStatLabel}>
  {label}
</AppText>
    </View>
  );
}

function ComparativeSnapshot({ sessions, members }) {
  const half     = Math.floor(sessions.length / 2);
  const recent   = sessions.slice(0, half);
  const previous = sessions.slice(half);

  const avg = (arr, field) => arr.length > 0
    ? Math.round(arr.reduce((s, x) => s + (x[field] || 0), 0) / arr.length)
    : 0;

  const recentRate = avg(recent, "finalRate");
  const prevRate   = avg(previous, "finalRate");
  const diff       = recentRate - prevRate;

  return (
    <View style={styles.compareCard}>
      <View style={styles.compareCol}>
  <AppText style={styles.compareColLabel}>Previous</AppText>
<AppText style={styles.compareValue}>{avg(previous, "finalPresent")}</AppText>
<AppText style={styles.compareRate}>{prevRate}% avg rate</AppText>
<AppText style={styles.compareSessions}>{previous.length} sessions</AppText>
      </View>
      <View style={styles.compareArrow}>
        <Ionicons
          name={diff >= 0 ? "arrow-forward" : "arrow-forward"}
          size={20}
          color={diff >= 0 ? "#27ae60" : "#e74c3c"}
        />
        <AppText
  style={[
    styles.compareDiff,
    { color: diff >= 0 ? "#27ae60" : "#e74c3c" }
  ]}
>
  {diff >= 0 ? "+" : ""}{diff}%
</AppText>
      </View>
      <View style={styles.compareCol}>
<AppText style={styles.compareColLabel}>Recent</AppText>

<AppText
  style={[
    styles.compareValue,
    { color: diff >= 0 ? "#27ae60" : "#e74c3c" }
  ]}
>
  {avg(recent, "finalPresent")}
</AppText>

<AppText style={styles.compareRate}>
  {recentRate}% avg rate
</AppText>

<AppText style={styles.compareSessions}>
  {recent.length} sessions
</AppText>
      </View>
    </View>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={44} color="#ddd" />
      <AppText style={styles.emptyTitle}>
  {title}
</AppText>

<AppText style={styles.emptyText}>
  {sub}
</AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#f4f6fb" },
  loader:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText: { color: "#888", fontSize: 13 },

  rangeRow: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rangeChip: { flex: 1, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0", alignItems: "center" },
  rangeChipActive: { backgroundColor: "#4B3F72" },
  rangeChipText: { fontSize: 11, color: "#888", fontWeight: "600" },
  rangeChipTextActive: { color: "#fff" },

  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#4B3F72" },
  tabText: { fontSize: 10, color: "#aaa", fontWeight: "600" },
  tabTextActive: { color: "#4B3F72" },

  body: { padding: 14, paddingBottom: 60 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  kpiCard: { width: "47.5%", backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", elevation: 1 },
  kpiIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: "900" },
  kpiLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", textTransform: "uppercase", marginTop: 2 },
  kpiSub:   { fontSize: 10, color: "#bbb", marginTop: 2 },

  mobilityNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#E8F4FD", borderRadius: 10, padding: 10, marginBottom: 10 },
  mobilityNoticeText: { flex: 1, fontSize: 11, color: "#0984E3", lineHeight: 16 },

  serviceFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  serviceChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0" },
  serviceChipActive: { backgroundColor: "#4B3F72", borderColor: "#4B3F72" },
  serviceChipText: { fontSize: 11, color: "#888", fontWeight: "600" },
  serviceChipTextActive: { color: "#fff" },

  chartCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  chartTitle: { fontSize: 13, fontWeight: "700", color: "#222" },
  chartToggle: { flexDirection: "row", backgroundColor: "#f0f0f0", borderRadius: 8, padding: 2, gap: 2 },
  chartToggleBtn: { padding: 4, borderRadius: 6 },
  chartToggleBtnActive: { backgroundColor: "#fff" },
  chartLegend: { flexDirection: "row", gap: 14, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: "#888" },
  avgPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  avgPillText: { fontSize: 11, fontWeight: "700" },
  rateBenchmark: { marginTop: 6 },
  rateBenchmarkText: { fontSize: 10, color: "#bbb", textAlign: "center" },

  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#888", textTransform: "uppercase", marginBottom: 8, marginTop: 6 },

  sessionRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, elevation: 1 },
  sessionRowDot: { width: 10, height: 10, borderRadius: 5 },
  sessionRowTitle: { fontSize: 13, fontWeight: "700", color: "#222" },
  sessionRowMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  sessionRowRight: { alignItems: "flex-end" },
  sessionRowRate: { fontSize: 15, fontWeight: "900" },
  sessionRowCount: { fontSize: 10, color: "#aaa", marginTop: 1 },

  memberSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  memberSectionTitle: { fontSize: 14, fontWeight: "800", color: "#222" },
  memberSectionSub: { fontSize: 11, color: "#888", marginBottom: 10 },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, elevation: 1 },
  memberRowAlert: { borderLeftWidth: 3, borderLeftColor: "#e74c3c" },
  memberRank: { fontSize: 12, fontWeight: "800", color: "#4B3F72", width: 20 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 12, fontWeight: "800", color: "#4B3F72" },
  memberRowName: { fontSize: 13, fontWeight: "700", color: "#222" },
  memberRowSub: { fontSize: 11, color: "#aaa", marginTop: 1 },
  memberRowRight: { fontSize: 12, fontWeight: "800" },

  groupCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },
  groupCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  groupIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#7C3AED20", alignItems: "center", justifyContent: "center" },
  groupCardName: { flex: 1, fontSize: 14, fontWeight: "800", color: "#222" },
  rateChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rateChipText: { fontSize: 12, fontWeight: "800" },
  groupCardStats: { flexDirection: "row", justifyContent: "space-around" },
  groupStatItem: { alignItems: "center" },
  groupStatValue: { fontSize: 18, fontWeight: "900", color: "#4B3F72" },
  groupStatLabel: { fontSize: 9, color: "#aaa", fontWeight: "700", textTransform: "uppercase", marginTop: 2 },

  insightCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4, elevation: 1 },
  insightIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  insightText: { flex: 1, fontSize: 13, color: "#333", lineHeight: 19, fontWeight: "500" },

  compareCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1 },
  compareCol: { flex: 1, alignItems: "center" },
  compareColLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  compareValue: { fontSize: 28, fontWeight: "900", color: "#4B3F72" },
  compareRate: { fontSize: 11, color: "#888", marginTop: 4 },
  compareSessions: { fontSize: 10, color: "#bbb", marginTop: 2 },
  compareArrow: { alignItems: "center", paddingHorizontal: 10 },
  compareDiff: { fontSize: 13, fontWeight: "800", marginTop: 4 },

  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#888", marginTop: 12 },
  emptyText: { fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 6, maxWidth: 280, lineHeight: 17 },
  heroCard: {
  backgroundColor: "#4B3F72",
  marginHorizontal: 14,
  marginTop: 12,
  borderRadius: 18,
  padding: 20,
  alignItems: "center",
  elevation: 2,
},

heroLabel: {
  color: "rgba(255,255,255,0.7)",
  fontSize: 11,
  fontWeight: "700",
  textTransform: "uppercase",
},

heroRate: {
  color: "#fff",
  fontSize: 42,
  fontWeight: "900",
  marginTop: 4,
},

heroSub: {
  color: "rgba(255,255,255,0.8)",
  fontSize: 12,
  marginTop: 2,
},

heroStats: {
  flexDirection: "row",
  marginTop: 18,
  width: "100%",
  justifyContent: "space-around",
},

heroStat: {
  alignItems: "center",
},

heroStatValue: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "800",
},

heroStatLabel: {
  color: "rgba(255,255,255,0.7)",
  fontSize: 10,
  marginTop: 2,
},
heroCard: {
  backgroundColor: "#4B3F72",
  marginHorizontal: 14,
  marginTop: 12,
  borderRadius: 18,
  padding: 20,
  alignItems: "center",
  elevation: 2,
},

heroLabel: {
  color: "rgba(255,255,255,0.7)",
  fontSize: 11,
  fontWeight: "700",
  textTransform: "uppercase",
},

heroRate: {
  color: "#fff",
  fontSize: 42,
  fontWeight: "900",
  marginTop: 4,
},

heroSub: {
  color: "rgba(255,255,255,0.8)",
  fontSize: 12,
  marginTop: 2,
},

heroStats: {
  flexDirection: "row",
  width: "100%",
  justifyContent: "space-around",
  marginTop: 18,
},

heroStat: {
  alignItems: "center",
},

heroStatValue: {
  color: "#fff",
  fontSize: 20,
  fontWeight: "800",
},

heroStatLabel: {
  color: "rgba(255,255,255,0.7)",
  fontSize: 10,
  marginTop: 2,
  textTransform: "uppercase",
},
sessionInfoCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  marginHorizontal: 14,
  marginTop: 10,
  marginBottom: 10,
  elevation: 1,
},

sessionInfoHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},

sessionInfoHeaderText: {
  marginLeft: 6,
  color: "#888",
  fontSize: 10,
  fontWeight: "800",
  textTransform: "uppercase",
},

sessionInfoService: {
  fontSize: 20,
  fontWeight: "900",
  color: "#4B3F72",
},

sessionInfoType: {
  fontSize: 14,
  color: "#666",
  marginBottom: 12,
},

sessionInfoRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 6,
},

sessionInfoText: {
  marginLeft: 8,
  fontSize: 12,
  color: "#444",
},

completedBadge: {
  alignSelf: "flex-start",
  marginTop: 12,
  backgroundColor: "#E8F8F0",
  borderRadius: 20,
  paddingHorizontal: 12,
  paddingVertical: 4,
},

completedBadgeText: {
  color: "#27AE60",
  fontSize: 11,
  fontWeight: "800",
},
gradeBadge: {
  marginTop: 10,
  paddingHorizontal: 14,
  paddingVertical: 5,
  borderRadius: 20,
},

gradeBadgeText: {
  fontSize: 12,
  fontWeight: "800",
},

healthInsightCard: {
  backgroundColor: "#fff",
  marginHorizontal: 14,
  marginBottom: 10,
  borderRadius: 12,
  padding: 14,
  flexDirection: "row",
  alignItems: "center",
},

healthInsightText: {
  flex: 1,
  marginLeft: 10,
  color: "#444",
  fontSize: 12,
  lineHeight: 18,
},
heroStatusText: {
  color: "rgba(255,255,255,0.75)",
  fontSize: 11,
  marginTop: 10,
  textAlign: "center",
},
heroRateRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},
});