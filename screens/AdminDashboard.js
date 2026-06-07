import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, SafeAreaView, StatusBar, Platform
} from "react-native";


import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// ── Optional: install with: npx expo install react-native-chart-kit react-native-svg
// If not installed yet, charts fall back to bar-style UI components
let LineChart, BarChart, PieChart;
try {
  const chartKit = require("react-native-chart-kit");
  LineChart = chartKit.LineChart;
  BarChart  = chartKit.BarChart;
  PieChart  = chartKit.PieChart;
} catch (e) { /* charts not installed — fallback bars used */ }

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 48;

const CHART_CONFIG = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(75, 63, 114, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 100, 120, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: "4", strokeWidth: "2", stroke: "#4B3F72" },
};

const TABS = [
  { key: "Activities",  label: "Activities",  icon: "calendar-outline",      color: "#6C5CE7", bg: "#F0EEFF" },
  { key: "Members",     label: "Members",     icon: "people-outline",        color: "#0984E3", bg: "#E8F4FD" },
  { key: "Attendance",  label: "Attendance",  icon: "checkmark-circle-outline", color: "#00B894", bg: "#E8FBF5" },
  { key: "Financial",   label: "Financial",   icon: "cash-outline",          color: "#FDCB6E", bg: "#FFFBEE" },
  { key: "Inventory",   label: "Inventory",   icon: "cube-outline",          color: "#E17055", bg: "#FEF0EE" },
  { key: "History",     label: "History",     icon: "time-outline",          color: "#00CEC9", bg: "#E8FFFE" },
];

export default function AdminDashboard() {
  const navigation = useNavigation();

  const [members,    setMembers]    = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab,  setActiveTab]  = useState("Activities");
  const [expanded,   setExpanded]   = useState({});  // which chart sections are expanded

  useEffect(() => {
    const unsubMem = onSnapshot(collection(db, "members"),
      snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAtt = onSnapshot(collection(db, "attendance"),
      snap => setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubMem(); unsubAtt(); };
  }, []);

  /* ── Metrics ── */
  const totalMembers  = members.length;
  const present       = attendance.filter(a => a.status === "present").length;
  const absent        = attendance.filter(a => a.status === "absent").length;
  const activeMembers = members.filter(m => m.status === "Regular").length;
  const visitors      = members.filter(m => m.status === "Visitor").length;
  const newConverts   = members.filter(m => m.status === "New Convert").length;
  const communicants  = members.filter(m => m.communicant === "yes").length;
  const attendanceRate = totalMembers > 0 ? Math.round((present / (present + absent || 1)) * 100) : 0;

  /* ── Toggle section expand ── */
  const toggleSection = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  /* ── Attendance trend (last 7 days mock — replace with real Firestore query) ── */
  const attendanceTrend = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ data: [12, 19, 8, 25, 14, 30, present || 22], strokeWidth: 2 }],
  };

  /* ── Member growth mock ── */
  const memberGrowth = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [{ data: [20, 35, 50, 62, 78, totalMembers || 90] }],
  };

  /* ── Pie data for member types ── */
  const memberPieData = [
    { name: "Regular",   population: activeMembers || 60, color: "#0984E3", legendFontColor: "#333", legendFontSize: 12 },
    { name: "Visitor",   population: visitors      || 20, color: "#00CEC9", legendFontColor: "#333", legendFontSize: 12 },
    { name: "New Conv.", population: newConverts   || 10, color: "#6C5CE7", legendFontColor: "#333", legendFontSize: 12 },
  ];

  /* ── Financial bar data mock ── */
  const financialBar = {
    labels: ["Tithe", "Offering", "Building", "Missions", "Welfare"],
    datasets: [{ data: [5000, 3200, 1500, 800, 400] }],
  };

  /* ── Render a stat card ── */
  const StatCard = ({ title, value, icon, color, bg, onPress }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress || (() => navigation.navigate("DashboardDetails", { title }))}>
      <View style={[styles.statIconBox, { backgroundColor: bg || "#f0f0f0" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{title}</Text>
      <Text style={styles.statHint}>View details →</Text>
    </TouchableOpacity>
  );

  /* ── Render a collapsible section ── */
  const Section = ({ sectionKey, title, icon, color, children }) => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(sectionKey)}>
        <View style={[styles.sectionIconBox, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        <Ionicons name={expanded[sectionKey] ? "chevron-up" : "chevron-down"} size={16} color={color} />
      </TouchableOpacity>
      {expanded[sectionKey] !== false && children}
    </View>
  );

  /* ── Fallback bar chart (no chart library) ── */
  const FallbackBar = ({ data, maxVal, color }) => (
    <View style={styles.fallbackBar}>
      {data.map((d, i) => (
        <View key={i} style={styles.fallbackBarItem}>
          <View style={[styles.fallbackBarFill, { height: Math.max(8, (d.val / maxVal) * 100), backgroundColor: d.color || color }]} />
          <Text style={styles.fallbackBarLabel} numberOfLines={1}>{d.label}</Text>
          <Text style={styles.fallbackBarVal}>{d.val}</Text>
        </View>
      ))}
    </View>
  );

  /* ── Big KPI ring-like card ── */
  const KpiCard = ({ label, value, total, color, bg }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <View style={[styles.kpiCard, { borderColor: color }]}>
        <Text style={[styles.kpiValue, { color }]}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
        {total > 0 && (
          <View style={styles.kpiBarTrack}>
            <View style={[styles.kpiBarFill, { width: `${pct}%`, backgroundColor: color }]} />
          </View>
        )}
        {total > 0 && <Text style={styles.kpiPct}>{pct}%</Text>}
      </View>
    );
  };

  /* ══════════ TAB CONTENT ══════════ */
  const renderContent = () => {
    const tab = TABS.find(t => t.key === activeTab);
    const { color, bg } = tab;

    switch (activeTab) {

      /* ── ACTIVITIES ── */
      case "Activities": return (
        <View>
          <View style={styles.cardGrid}>
            <StatCard title="Total Events"    value={12} icon="calendar"      color="#6C5CE7" bg="#F0EEFF" />
            <StatCard title="Services This Month" value={8} icon="time"       color="#00B894" bg="#E8FBF5" />
            <StatCard title="Upcoming Events" value={4}  icon="notifications" color="#0984E3" bg="#E8F4FD" />
            <StatCard title="Completed"       value={8}  icon="checkmark-done" color="#FDCB6E" bg="#FFFBEE" />
          </View>

          <Section sectionKey="act_trend" title="Activity Trend" icon="trending-up-outline" color="#6C5CE7">
            {LineChart ? (
              <LineChart data={attendanceTrend} width={CHART_W} height={180}
                chartConfig={{ ...CHART_CONFIG, color: (o = 1) => `rgba(108,92,231,${o})` }}
                bezier style={styles.chart} />
            ) : (
              <FallbackBar color="#6C5CE7" maxVal={30}
                data={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((l, i) =>
                  ({ label: l, val: [12,19,8,25,14,30,22][i] }))} />
            )}
          </Section>
        </View>
      );

      /* ── MEMBERS ── */
      case "Members": return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard label="Total"      value={totalMembers}  total={0}            color="#0984E3" />
            <KpiCard label="Regular"    value={activeMembers} total={totalMembers}  color="#00B894" />
            <KpiCard label="Visitors"   value={visitors}      total={totalMembers}  color="#6C5CE7" />
          </View>

          <View style={styles.cardGrid}>
            <StatCard title="Total Members"  value={totalMembers}  icon="people"      color="#0984E3" bg="#E8F4FD" />
            <StatCard title="Active/Regular" value={activeMembers} icon="checkmark"   color="#00B894" bg="#E8FBF5" />
            <StatCard title="Visitors"       value={visitors}      icon="walk-outline" color="#6C5CE7" bg="#F0EEFF" />
            <StatCard title="New Converts"   value={newConverts}   icon="person-add"  color="#00CEC9" bg="#E8FFFE" />
            <StatCard title="Communicants"   value={communicants}  icon="restaurant"  color="#FDCB6E" bg="#FFFBEE" />
          </View>

          <Section sectionKey="mem_growth" title="Member Growth" icon="trending-up-outline" color="#0984E3">
            {LineChart ? (
              <LineChart data={memberGrowth} width={CHART_W} height={180}
                chartConfig={{ ...CHART_CONFIG, color: (o=1) => `rgba(9,132,227,${o})` }}
                bezier style={styles.chart} />
            ) : (
              <FallbackBar color="#0984E3" maxVal={totalMembers || 90}
                data={["Jan","Feb","Mar","Apr","May","Jun"].map((l,i) =>
                  ({ label:l, val:[20,35,50,62,78,totalMembers||90][i] }))} />
            )}
          </Section>

          <Section sectionKey="mem_type" title="Member Types" icon="pie-chart-outline" color="#6C5CE7">
            {PieChart ? (
              <PieChart data={memberPieData} width={CHART_W} height={180}
                chartConfig={CHART_CONFIG}
                accessor="population" backgroundColor="transparent"
                paddingLeft="10" style={styles.chart} />
            ) : (
              <FallbackBar color="#6C5CE7" maxVal={totalMembers || 90}
                data={[
                  { label:"Regular",  val: activeMembers||60, color:"#0984E3" },
                  { label:"Visitor",  val: visitors||20,      color:"#00CEC9" },
                  { label:"New Conv.",val: newConverts||10,   color:"#6C5CE7" },
                ]} />
            )}
          </Section>
        </View>
      );

      /* ── ATTENDANCE ── */
      case "Attendance": return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard label="Present" value={present}  total={present+absent} color="#00B894" />
            <KpiCard label="Absent"  value={absent}   total={present+absent} color="#D63031" />
            <KpiCard label="Rate"    value={`${attendanceRate}%`} total={0}  color="#6C5CE7" />
          </View>

          <View style={styles.cardGrid}>
            <StatCard title="Present Today"   value={present}  icon="checkmark-circle" color="#00B894" bg="#E8FBF5" />
            <StatCard title="Absent Today"    value={absent}   icon="close-circle"     color="#D63031" bg="#FDECEA" />
            <StatCard title="Attendance Rate" value={`${attendanceRate}%`} icon="analytics" color="#6C5CE7" bg="#F0EEFF" />
            <StatCard title="Total Sessions"  value={24}       icon="calendar"         color="#0984E3" bg="#E8F4FD" />
          </View>

          <Section sectionKey="att_trend" title="Attendance Trend (7 Days)" icon="trending-up-outline" color="#00B894">
            {LineChart ? (
              <LineChart data={attendanceTrend} width={CHART_W} height={180}
                chartConfig={{ ...CHART_CONFIG, color: (o=1) => `rgba(0,184,148,${o})` }}
                bezier style={styles.chart} />
            ) : (
              <FallbackBar color="#00B894" maxVal={35}
                data={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((l,i) =>
                  ({ label:l, val:[12,19,8,25,14,30,present||22][i] }))} />
            )}
          </Section>

          <Section sectionKey="att_compare" title="Present vs Absent" icon="bar-chart-outline" color="#D63031">
            {BarChart ? (
              <BarChart data={{ labels:["Present","Absent"], datasets:[{data:[present||22,absent||8]}] }}
                width={CHART_W} height={160}
                chartConfig={{ ...CHART_CONFIG, color:(o=1)=>`rgba(214,48,49,${o})` }}
                style={styles.chart} />
            ) : (
              <FallbackBar color="#D63031" maxVal={Math.max(present,absent,1)}
                data={[
                  { label:"Present", val:present, color:"#00B894" },
                  { label:"Absent",  val:absent,  color:"#D63031" },
                ]} />
            )}
          </Section>
        </View>
      );

      /* ── FINANCIAL ── */
      case "Financial": return (
        <View>
          <View style={styles.kpiRow}>
            <KpiCard label="Tithes"    value="₵5,000"  total={0} color="#FDCB6E" />
            <KpiCard label="Offerings" value="₵3,200"  total={0} color="#E17055" />
            <KpiCard label="Total"     value="₵9,900"  total={0} color="#00B894" />
          </View>

          <View style={styles.cardGrid}>
            <StatCard title="Tithes"    value="₵5,000" icon="cash"            color="#FDCB6E" bg="#FFFBEE" />
            <StatCard title="Offerings" value="₵3,200" icon="wallet"          color="#E17055" bg="#FEF0EE" />
            <StatCard title="Building Fund" value="₵1,500" icon="business"    color="#0984E3" bg="#E8F4FD" />
            <StatCard title="Missions"  value="₵800"   icon="earth"           color="#00CEC9" bg="#E8FFFE" />
            <StatCard title="Welfare"   value="₵400"   icon="heart"           color="#D63031" bg="#FDECEA" />
            <StatCard title="Total"     value="₵9,900" icon="trending-up"     color="#00B894" bg="#E8FBF5" />
          </View>

          <Section sectionKey="fin_bar" title="Income by Category" icon="bar-chart-outline" color="#FDCB6E">
            {BarChart ? (
              <BarChart data={financialBar} width={CHART_W} height={180}
                chartConfig={{ ...CHART_CONFIG, color:(o=1)=>`rgba(253,203,110,${o})` }}
                style={styles.chart} />
            ) : (
              <FallbackBar color="#FDCB6E" maxVal={5000}
                data={[
                  { label:"Tithe",    val:5000, color:"#FDCB6E" },
                  { label:"Offering", val:3200, color:"#E17055" },
                  { label:"Building", val:1500, color:"#0984E3" },
                  { label:"Missions", val:800,  color:"#00CEC9" },
                  { label:"Welfare",  val:400,  color:"#D63031" },
                ]} />
            )}
          </Section>

          <Section sectionKey="fin_trend" title="Financial Trend" icon="trending-up-outline" color="#E17055">
            {LineChart ? (
              <LineChart data={{ labels:["Jan","Feb","Mar","Apr","May","Jun"], datasets:[{data:[6000,7200,5800,9100,8400,9900]}] }}
                width={CHART_W} height={180}
                chartConfig={{ ...CHART_CONFIG, color:(o=1)=>`rgba(225,112,85,${o})` }}
                bezier style={styles.chart} />
            ) : (
              <FallbackBar color="#E17055" maxVal={10000}
                data={["Jan","Feb","Mar","Apr","May","Jun"].map((l,i) =>
                  ({ label:l, val:[6000,7200,5800,9100,8400,9900][i] }))} />
            )}
          </Section>
        </View>
      );

      /* ── INVENTORY ── */
      case "Inventory": return (
        <View>
          <View style={styles.cardGrid}>
            <StatCard title="In Stock"    value={120} icon="cube"          color="#00B894" bg="#E8FBF5" />
            <StatCard title="Low Stock"   value={8}   icon="alert-circle"  color="#E17055" bg="#FEF0EE" />
            <StatCard title="Out of Stock" value={3}  icon="close-circle"  color="#D63031" bg="#FDECEA" />
            <StatCard title="Total Items" value={131} icon="list"          color="#0984E3" bg="#E8F4FD" />
          </View>

          <Section sectionKey="inv_bar" title="Stock Levels" icon="bar-chart-outline" color="#00B894">
            <FallbackBar color="#00B894" maxVal={120}
              data={[
                { label:"Chairs",      val:80,  color:"#00B894" },
                { label:"Bibles",      val:45,  color:"#0984E3" },
                { label:"Hymnals",     val:30,  color:"#6C5CE7" },
                { label:"Sound Equip", val:8,   color:"#E17055" },
                { label:"Projectors",  val:3,   color:"#D63031" },
              ]} />
          </Section>
        </View>
      );

      /* ── HISTORY ── */
      case "History": return (
        <View>
          <View style={styles.cardGrid}>
            <StatCard title="Today's Logs"  value={25}  icon="time"          color="#6C5CE7" bg="#F0EEFF" />
            <StatCard title="Total Records" value={540} icon="document-text" color="#0984E3" bg="#E8F4FD" />
            <StatCard title="This Week"     value={87}  icon="calendar"      color="#00CEC9" bg="#E8FFFE" />
            <StatCard title="This Month"    value={312} icon="stats-chart"   color="#FDCB6E" bg="#FFFBEE" />
          </View>

          <Section sectionKey="hist_trend" title="Activity Log Trend" icon="trending-up-outline" color="#6C5CE7">
            {LineChart ? (
              <LineChart data={{ labels:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], datasets:[{data:[30,45,28,60,52,75,25]}] }}
                width={CHART_W} height={180}
                chartConfig={{ ...CHART_CONFIG, color:(o=1)=>`rgba(108,92,231,${o})` }}
                bezier style={styles.chart} />
            ) : (
              <FallbackBar color="#6C5CE7" maxVal={75}
                data={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((l,i) =>
                  ({ label:l, val:[30,45,28,60,52,75,25][i] }))} />
            )}
          </Section>
        </View>
      );

      default: return null;
    }
  };

  const activeTabData = TABS.find(t => t.key === activeTab);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ── HEADER ── */}
      <View style={styles.headerBar}>
        {/* ✅ #1 — Back button fixed */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Church overview & analytics</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: activeTabData?.color + "30" }]}>
          <Ionicons name={activeTabData?.icon} size={16} color={activeTabData?.color} />
        </View>
      </View>

      {/* ✅ #7 — Grid-style tab layout (2 columns × 3 rows) */}
     <View style={styles.tabGrid}>
  {TABS.map(tab => {
    const isActive = activeTab === tab.key;

    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tabCard,
          { backgroundColor: tab.bg },
          isActive && styles.tabCardActive,
          { transform: [{ scale: isActive ? 1.05 : 1 }] }
        ]}
        onPress={() => {
          if (tab.key === "Financial") {
            navigation.navigate("Finance");
          } else {
            setActiveTab(tab.key);
          }
        }}
      >
        <View style={[
          styles.tabIconWrap,
          { backgroundColor: "#fff" }
        ]}>
          <Ionicons
            name={tab.icon}
            size={20}
            color={tab.color}
          />
        </View>

        <Text style={[
          styles.tabLabel,
          isActive && { color: tab.color }
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>



      {/* ── CONTENT ── */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
  flex: 1,
  backgroundColor: "#4B3F72",
  paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 
},


  /* Header */
  headerBar: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingBottom: 14,
  paddingTop: Platform.OS === "android" ? 16 : 24,
  backgroundColor: "#4B3F72",
},


  backBtn: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(255,255,255,0.15)",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,

  marginLeft: 4, 
},

  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 1 },
  headerBadge: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  /* ✅ #7 — Grid tabs: 3 columns × 2 rows */
  tabGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 16,
  backgroundColor: "#f4f6fb",
},

tabGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
},

tabCard: {
  width: "48%",
  borderRadius: 16,
  paddingVertical: 16,
  alignItems: "center",
  marginBottom: 12,

  backgroundColor: "#fff",

  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 5,
  elevation: 2,
},

tabCardActive: {
  borderWidth: 2,
  borderColor: "#4B3F72",
},

tabIconBadge: {
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 8,
},

tabTitle: {
  fontSize: 12,
  fontWeight: "700",
  color: "#333",
},

tabCard: {
  width: "31%",
  backgroundColor: "#fff",
  borderRadius: 16,
  paddingVertical: 16,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,

  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},

tabCardActive: {
  borderWidth: 2,
  borderColor: "#4B3F72",
},

tabIconWrap: {
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 8,
},

tabLabel: {
  fontSize: 12,
  fontWeight: "700",
  color: "#333",
  textAlign: "center",
},
  tabGridBtn: {
    width: "30.5%",                // 3 per row
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, paddingHorizontal: 6,
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e8e8e8",
    gap: 5,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tabGridText: { fontSize: 12, fontWeight: "700" },

  /* Content */
  content: { paddingHorizontal: 16, paddingTop: 14, backgroundColor: "#f4f6fb" },

  /* KPI row */
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 2,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  kpiValue: { fontSize: 18, fontWeight: "900" },
  kpiLabel: { fontSize: 10, color: "#888", fontWeight: "600", marginTop: 2, textAlign: "center" },
  kpiBarTrack: { width: "100%", height: 4, backgroundColor: "#eee", borderRadius: 2, marginTop: 6 },
  kpiBarFill: { height: 4, borderRadius: 2 },
  kpiPct: { fontSize: 10, color: "#aaa", marginTop: 3 },

  /* Stat card grid */
  cardGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14, gap: 8 },
  statCard: {
    width: "47.5%", backgroundColor: "#fff", padding: 14, borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 3, fontWeight: "600", lineHeight: 16 },
  statHint: { marginTop: 8, fontSize: 11, color: "#1BA97F", fontWeight: "600" },

  /* Collapsible section */
  section: { backgroundColor: "#fff", borderRadius: 14, marginBottom: 12, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  sectionIconBox: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: "700" },

  /* Chart */
  chart: { borderRadius: 12, marginHorizontal: 14, marginBottom: 14 },

  /* Fallback bar chart */
  fallbackBar: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingHorizontal: 14, paddingBottom: 14, height: 140 },
  fallbackBarItem: { alignItems: "center", flex: 1 },
  fallbackBarFill: { width: 28, borderRadius: 6, minHeight: 8 },
  fallbackBarLabel: { fontSize: 9, color: "#888", marginTop: 4, fontWeight: "600" },
  fallbackBarVal: { fontSize: 10, fontWeight: "800", color: "#333", marginTop: 1 },
});