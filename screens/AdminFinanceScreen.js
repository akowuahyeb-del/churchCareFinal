
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, FlatList, SafeAreaView,
  StatusBar, Dimensions, Platform, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, query,
  orderBy, where, serverTimestamp, Timestamp
} from "firebase/firestore";

const { width: W } = Dimensions.get("window");

// ── Chart lib (optional) ──────────────────────────────────────
let LineChart, BarChart;
try {
  const ck = require("react-native-chart-kit");
  LineChart = ck.LineChart; BarChart = ck.BarChart;
} catch (_) {}

const CHART_CFG = {
  backgroundColor: "#fff", backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff", decimalPlaces: 0,
  color: (o = 1) => `rgba(75,63,114,${o})`,
  labelColor: (o = 1) => `rgba(100,100,120,${o})`,
  style: { borderRadius: 12 },
};

// ── CHART OF ACCOUNTS ──────────────────────────────────────────
const COA = {
  Assets: {
    color: "#0984E3", icon: "wallet-outline",
    accounts: ["Cash", "Bank Account", "Accounts Receivable", "Equipment", "Buildings", "Land"]
  },
  Liabilities: {
    color: "#D63031", icon: "alert-circle-outline",
    accounts: ["Loans", "Accounts Payable", "Mortgage", "Deferred Income"]
  },
  Equity: {
    color: "#6C5CE7", icon: "shield-outline",
    accounts: ["Owner's Equity", "Retained Earnings", "General Reserve"]
  },
  Income: {
    color: "#00B894", icon: "trending-up-outline",
    accounts: ["Tithes", "Offerings", "Donations", "Building Fund", "Missions Fund",
               "Registration Fees", "Internship Fees", "Rent Income", "Other Income"]
  },
  Expenses: {
    color: "#E17055", icon: "trending-down-outline",
    accounts: ["Salaries", "Utilities", "Maintenance", "Transportation",
               "Office Supplies", "Welfare", "Missions", "Printing", "Other Expenses"]
  },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TODAY  = new Date();

// ── TABS ──────────────────────────────────────────────────────
const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "grid-outline", color: "#6C5CE7", bg: "#F0EEFF" },
  { key: "journal", label: "Journal", icon: "book-outline", color: "#0984E3", bg: "#E8F4FD" },
  { key: "ledger", label: "Ledger", icon: "list-outline", color: "#00B894", bg: "#E8FBF5" },
  { key: "trial", label: "Trial", icon: "scale-outline", color: "#6C5CE7", bg: "#F0EEFF" },
  { key: "pnl", label: "P&L", icon: "bar-chart-outline", color: "#E17055", bg: "#FEF0EE" },
  { key: "balance", label: "Balance", icon: "document-text-outline", color: "#00CEC9", bg: "#E8FFFE" },
  { key: "cashflow", label: "Cash Flow", icon: "water-outline", color: "#FDCB6E", bg: "#FFFBEE" },
  { key: "coa", label: "Chart", icon: "albums-outline", color: "#A29BFE", bg: "#F3F2FF" },
  { key: "ai", label: "AI", icon: "sparkles-outline", color: "#FD79A8", bg: "#FFEAF3" },
];

export default function AdminFinanceScreen() {
  const navigation = useNavigation();
  const [churchId, setChurchId] = useState(null);
  const [tab,           setTab]           = useState("dashboard");
  const [transactions,  setTransactions]  = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiInsight,     setAiInsight]     = useState("");

  // Journal entry form
  const [jModal,   setJModal]   = useState(false);
  const [jDate,    setJDate]    = useState(TODAY.toISOString().split("T")[0]);
  const [jDesc,    setJDesc]    = useState("");
  const [jEntries, setJEntries] = useState([
    { account: "", type: "debit",  amount: "" },
    { account: "", type: "credit", amount: "" },
  ]);

  // Ledger filter
  const [ledgerAccount, setLedgerAccount] = useState("Cash");

  /* ── Load transactions ── */
  useEffect(() => {
  if (churchId) {
    loadTransactions();
  }
}, [churchId]);

  useEffect(() => {
  AsyncStorage.getItem("churchId").then(id => {
    console.log("Finance churchId:", id);
    setChurchId(id);
  });
}, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "transactions"),
         where("churchId", "==", churchId),
         orderBy("date", "desc")
    )
      );

      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // fallback demo data
      setTransactions(DEMO_TRANSACTIONS);
    } finally { setLoading(false); }
  };

  /* ── Save journal entry ── */
  const saveJournal = async () => {
    const debits  = jEntries.filter(e => e.type === "debit");
    const credits = jEntries.filter(e => e.type === "credit");
    const totalD  = debits.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalC  = credits.reduce((s, e) => s + Number(e.amount || 0), 0);

    if (!jDesc.trim()) { Alert.alert("Description required"); return; }
    if (jEntries.some(e => !e.account || !e.amount)) { Alert.alert("Fill all entry lines"); return; }
    if (totalD !== totalC) {
      Alert.alert("Unbalanced entry", `Debits (${totalD}) must equal Credits (${totalC})`);
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        churchId, 
        date: jDate,
          description: jDesc,
         entries: jEntries.map(e => ({ ...e, amount: Number(e.amount) })),
          totalAmount: totalD,
          createdAt: serverTimestamp(),
       });
      Alert.alert("✅ Entry saved");
      setJModal(false); resetJournal();
      loadTransactions();
    } catch (err) { Alert.alert("Error", err.message); }
  };

  const resetJournal = () => {
    setJDate(TODAY.toISOString().split("T")[0]); setJDesc("");
    setJEntries([
      { account: "", type: "debit",  amount: "" },
      { account: "", type: "credit", amount: "" },
    ]);
  };

  const addJournalLine = () =>
    setJEntries(p => [...p, { account: "", type: "debit", amount: "" }]);

  /* ── Computed balances ── */
  const balances = (() => {
    const map = {};
    transactions.forEach(tx => {
      (tx.entries || []).forEach(e => {
        if (!map[e.account]) map[e.account] = { debit: 0, credit: 0 };
        if (e.type === "debit")  map[e.account].debit  += Number(e.amount || 0);
        if (e.type === "credit") map[e.account].credit += Number(e.amount || 0);
      });
    });
    return map;
  })();

  const accountBalance = (account) => {
    const b = balances[account] || { debit: 0, credit: 0 };
    const cat = Object.entries(COA).find(([, v]) => v.accounts.includes(account))?.[0];
    // Normal balance: Assets/Expenses = Debit; Liabilities/Equity/Income = Credit
    if (["Assets","Expenses"].includes(cat)) return b.debit - b.credit;
    return b.credit - b.debit;
  };

  const categoryTotal = (category) =>
    (COA[category]?.accounts || []).reduce((s, a) => s + Math.max(0, accountBalance(a)), 0);

  const totalIncome   = categoryTotal("Income");
  const totalExpenses = categoryTotal("Expenses");
  const netProfit     = totalIncome - totalExpenses;
  const totalAssets   = categoryTotal("Assets");
  const totalLiab     = categoryTotal("Liabilities");
  const totalEquity   = categoryTotal("Equity");

  /* ── Ledger entries for selected account ── */
  const ledgerEntries = (() => {
    const rows = [];
    let balance = 0;
    const sorted = [...transactions].sort((a, b) => a.date?.localeCompare(b.date));
    sorted.forEach(tx => {
      (tx.entries || []).filter(e => e.account === ledgerAccount).forEach(e => {
        const cat = Object.entries(COA).find(([, v]) => v.accounts.includes(ledgerAccount))?.[0];
        const normal = ["Assets","Expenses"].includes(cat);
        if (normal) balance += e.type === "debit" ? Number(e.amount) : -Number(e.amount);
        else        balance += e.type === "credit" ? Number(e.amount) : -Number(e.amount);
        rows.push({ date: tx.date, desc: tx.description, debit: e.type === "debit" ? e.amount : "", credit: e.type === "credit" ? e.amount : "", balance });
      });
    });
    return rows;
  })();

  /* ── AI Insight (calls Anthropic API) ── */
  const generateAiInsight = async () => {
    setAiLoading(true);
    try {
      const summary = `
        Total Income: GH₵${totalIncome.toLocaleString()}
        Total Expenses: GH₵${totalExpenses.toLocaleString()}
        Net Profit: GH₵${netProfit.toLocaleString()}
        Total Assets: GH₵${totalAssets.toLocaleString()}
        Total Liabilities: GH₵${totalLiab.toLocaleString()}
        Total Equity: GH₵${totalEquity.toLocaleString()}
        Number of Transactions: ${transactions.length}
        Top Income: ${topAccounts("Income").map(a => `${a.name}: GH₵${a.balance.toLocaleString()}`).join(", ")}
        Top Expenses: ${topAccounts("Expenses").map(a => `${a.name}: GH₵${a.balance.toLocaleString()}`).join(", ")}
      `;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a church financial advisor. Analyze this financial summary and provide 4-5 concise insights, trends, and recommendations in plain English. Be specific with numbers. Include budget forecasting and anomaly detection if relevant.\n\n${summary}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("\n") || "No insight generated.";
      setAiInsight(text);
    } catch (e) {
      setAiInsight("Could not generate insight. Please check your connection and try again.");
    } finally { setAiLoading(false); }
  };

  const topAccounts = (category) =>
    (COA[category]?.accounts || [])
      .map(a => ({ name: a, balance: accountBalance(a) }))
      .filter(a => a.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3);

  /* ── Monthly trend ── */
  const monthlyIncome = MONTHS.map((_, mi) =>
    transactions.reduce((s, tx) => {
      const m = new Date(tx.date).getMonth();
      if (m !== mi) return s;
      return s + (tx.entries || []).filter(e => {
        const cat = Object.entries(COA).find(([, v]) => v.accounts.includes(e.account))?.[0];
        return cat === "Income" && e.type === "credit";
      }).reduce((ss, e) => ss + Number(e.amount), 0);
    }, 0)
  );
  const monthlyExpenses = MONTHS.map((_, mi) =>
    transactions.reduce((s, tx) => {
      const m = new Date(tx.date).getMonth();
      if (m !== mi) return s;
      return s + (tx.entries || []).filter(e => {
        const cat = Object.entries(COA).find(([, v]) => v.accounts.includes(e.account))?.[0];
        return cat === "Expenses" && e.type === "debit";
      }).reduce((ss, e) => ss + Number(e.amount), 0);
    }, 0)
  );

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Financial Reports</Text>
          <Text style={styles.headerSub}>Accounting & Analytics</Text>
        </View>
        <TouchableOpacity style={styles.addEntryBtn} onPress={() => setJModal(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addEntryText}>Entry</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
     <View style={styles.tabGrid}>
  {TABS.map(tabItem => {
    const isActive = tab === tabItem.key;

    return (
      <TouchableOpacity
        key={tabItem.key}
        activeOpacity={0.8}
        style={[
          styles.tabCard,
          { backgroundColor: tabItem.bg },
          isActive && styles.tabCardActive,
        ]}
        onPress={() => setTab(tabItem.key)}
      >
        <View
          style={[
            styles.tabIconWrap,
            { backgroundColor: "#fff" }
          ]}
        >
          <Ionicons
            name={tabItem.icon}
            size={20}
            color={tabItem.color}
          />
        </View>

        <Text
          style={[
            styles.tabLabel,
            isActive && { color: tabItem.color }
          ]}
        >
          {tabItem.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>


      {loading ? (
        <View style={styles.loader}><ActivityIndicator color="#4B3F72" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {/* ══ DASHBOARD ══ */}
          {tab === "dashboard" && (
            <View>
              {/* KPI Row */}
              <View style={styles.kpiRow}>
                <KpiCard label="Income"   value={`₵${fmt(totalIncome)}`}   color="#00B894" icon="trending-up" />
                <KpiCard label="Expenses" value={`₵${fmt(totalExpenses)}`} color="#E17055" icon="trending-down" />
                <KpiCard label="Net"      value={`₵${fmt(netProfit)}`}     color={netProfit >= 0 ? "#00B894" : "#D63031"} icon="analytics" />
              </View>

              {/* Balance sheet summary */}
              <View style={styles.bsRow}>
                <View style={[styles.bsCard, { borderColor: "#0984E3" }]}>
                  <Text style={[styles.bsValue, { color: "#0984E3" }]}>₵{fmt(totalAssets)}</Text>
                  <Text style={styles.bsLabel}>Total Assets</Text>
                </View>
                <View style={[styles.bsCard, { borderColor: "#D63031" }]}>
                  <Text style={[styles.bsValue, { color: "#D63031" }]}>₵{fmt(totalLiab)}</Text>
                  <Text style={styles.bsLabel}>Liabilities</Text>
                </View>
                <View style={[styles.bsCard, { borderColor: "#6C5CE7" }]}>
                  <Text style={[styles.bsValue, { color: "#6C5CE7" }]}>₵{fmt(totalEquity)}</Text>
                  <Text style={styles.bsLabel}>Equity</Text>
                </View>
              </View>

              {/* Income vs Expenses chart */}
              <SectionCard title="Income vs Expenses" icon="bar-chart-outline" color="#4B3F72">
                {BarChart ? (
                  <BarChart
                    data={{ labels: MONTHS.slice(0, 6), datasets: [{ data: monthlyIncome.slice(0, 6) }] }}
                    width={W - 64} height={160} chartConfig={CHART_CFG} style={styles.chart}
                  />
                ) : (
                  <MiniBarChart
                    data={MONTHS.slice(0,6).map((l,i) => ({ label:l, income: monthlyIncome[i]||0, expense: monthlyExpenses[i]||0 }))}
                  />
                )}
              </SectionCard>

              {/* Monthly profit trend */}
              <SectionCard title="Monthly Net Profit Trend" icon="trending-up-outline" color="#00B894">
                {LineChart ? (
                  <LineChart
                    data={{ labels: MONTHS.slice(0,6), datasets: [{ data: MONTHS.slice(0,6).map((_,i) => Math.max(0, (monthlyIncome[i]||0)-(monthlyExpenses[i]||0))), strokeWidth:2 }] }}
                    width={W - 64} height={150} chartConfig={{ ...CHART_CFG, color:(o=1)=>`rgba(0,184,148,${o})` }}
                    bezier style={styles.chart}
                  />
                ) : (
                  <SimpleLineViz data={MONTHS.slice(0,6).map((_,i) => (monthlyIncome[i]||0)-(monthlyExpenses[i]||0))} color="#00B894" />
                )}
              </SectionCard>

              {/* Top income / top expense */}
              <View style={styles.twoCol}>
                <View style={[styles.halfCard, { borderLeftColor: "#00B894" }]}>
                  <Text style={styles.halfCardTitle}>Top Income</Text>
                  {topAccounts("Income").map(a => (
                    <View key={a.name} style={styles.topRow}>
                      <Text style={styles.topName} numberOfLines={1}>{a.name}</Text>
                      <Text style={[styles.topVal, { color: "#00B894" }]}>₵{fmt(a.balance)}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.halfCard, { borderLeftColor: "#E17055" }]}>
                  <Text style={styles.halfCardTitle}>Top Expenses</Text>
                  {topAccounts("Expenses").map(a => (
                    <View key={a.name} style={styles.topRow}>
                      <Text style={styles.topName} numberOfLines={1}>{a.name}</Text>
                      <Text style={[styles.topVal, { color: "#E17055" }]}>₵{fmt(a.balance)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ══ JOURNAL ══ */}
          {tab === "journal" && (
            <View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setJModal(true)}>
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>New Journal Entry</Text>
              </TouchableOpacity>

              {transactions.length === 0 && (
                <EmptyState icon="book-outline" text="No journal entries yet" />
              )}
              {transactions.map(tx => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txHeader}>
                    <Text style={styles.txDate}>{tx.date}</Text>
                    <Text style={styles.txAmt}>₵{fmt(tx.totalAmount)}</Text>
                  </View>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <View style={styles.txTable}>
                    <View style={styles.txTableHeader}>
                      <Text style={[styles.txCol, { flex:2 }]}>Account</Text>
                      <Text style={styles.txCol}>Debit</Text>
                      <Text style={styles.txCol}>Credit</Text>
                    </View>
                    {(tx.entries || []).map((e, i) => (
                      <View key={i} style={styles.txTableRow}>
                        <Text style={[styles.txCell, { flex:2 }]} numberOfLines={1}>{e.account}</Text>
                        <Text style={[styles.txCell, { color: "#0984E3" }]}>{e.type==="debit" ? fmt(e.amount) : ""}</Text>
                        <Text style={[styles.txCell, { color: "#00B894" }]}>{e.type==="credit" ? fmt(e.amount) : ""}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ══ LEDGER ══ */}
          {tab === "ledger" && (
            <View>
              <Text style={styles.subLabel}>Select Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {Object.values(COA).flatMap(c => c.accounts).map(a => (
                  <TouchableOpacity key={a}
                    style={[styles.acctChip, ledgerAccount === a && styles.acctChipActive]}
                    onPress={() => setLedgerAccount(a)}>
                    <Text style={[styles.acctChipText, ledgerAccount === a && { color: "#fff" }]}
                      numberOfLines={1}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.ledgerCard}>
                <Text style={styles.ledgerTitle}>{ledgerAccount}</Text>
                <Text style={[styles.ledgerBalance, { color: accountBalance(ledgerAccount) >= 0 ? "#00B894" : "#D63031" }]}>
                  Balance: ₵{fmt(accountBalance(ledgerAccount))}
                </Text>
                <View style={styles.txTableHeader}>
                  <Text style={[styles.txCol, { flex:1.5 }]}>Date</Text>
                  <Text style={[styles.txCol, { flex:2 }]}>Description</Text>
                  <Text style={styles.txCol}>Dr</Text>
                  <Text style={styles.txCol}>Cr</Text>
                  <Text style={styles.txCol}>Bal</Text>
                </View>
                {ledgerEntries.length === 0 && (
                  <Text style={styles.emptySmall}>No entries for this account</Text>
                )}
                {ledgerEntries.map((r, i) => (
                  <View key={i} style={[styles.txTableRow, { backgroundColor: i % 2 === 0 ? "#fff" : "#f9f9f9" }]}>
                    <Text style={[styles.txCell, { flex:1.5 }]}>{r.date}</Text>
                    <Text style={[styles.txCell, { flex:2 }]} numberOfLines={1}>{r.desc}</Text>
                    <Text style={[styles.txCell, { color:"#0984E3" }]}>{r.debit ? fmt(r.debit) : ""}</Text>
                    <Text style={[styles.txCell, { color:"#00B894" }]}>{r.credit ? fmt(r.credit) : ""}</Text>
                    <Text style={[styles.txCell, { fontWeight:"700", color: r.balance>=0?"#222":"#D63031" }]}>{fmt(r.balance)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ══ TRIAL BALANCE ══ */}
          {tab === "trial" && (
            <View>
              <View style={styles.trialHeader}>
                <Text style={styles.trialTitle}>Trial Balance</Text>
                <Text style={styles.trialDate}>As of {TODAY.toLocaleDateString()}</Text>
              </View>
              <View style={styles.txTable}>
                <View style={styles.txTableHeader}>
                  <Text style={[styles.txCol, { flex:2 }]}>Account</Text>
                  <Text style={styles.txCol}>Debit</Text>
                  <Text style={styles.txCol}>Credit</Text>
                </View>
                {Object.entries(COA).map(([cat, { color, accounts }]) => (
                  <View key={cat}>
                    <Text style={[styles.trialCatLabel, { color }]}>{cat}</Text>
                    {accounts.filter(a => balances[a]).map(a => {
                      const b = balances[a] || { debit:0, credit:0 };
                      return (
                        <View key={a} style={styles.txTableRow}>
                          <Text style={[styles.txCell, { flex:2 }]}>{a}</Text>
                          <Text style={[styles.txCell, { color:"#0984E3" }]}>{b.debit ? fmt(b.debit) : ""}</Text>
                          <Text style={[styles.txCell, { color:"#00B894" }]}>{b.credit ? fmt(b.credit) : ""}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
              {/* Totals */}
              {(() => {
                const tD = Object.values(balances).reduce((s,b) => s + b.debit, 0);
                const tC = Object.values(balances).reduce((s,b) => s + b.credit, 0);
                return (
                  <View style={[styles.txTableRow, styles.trialTotal]}>
                    <Text style={[styles.txCell, { flex:2, fontWeight:"800" }]}>TOTALS</Text>
                    <Text style={[styles.txCell, { color:"#0984E3", fontWeight:"800" }]}>₵{fmt(tD)}</Text>
                    <Text style={[styles.txCell, { color:"#00B894", fontWeight:"800" }]}>₵{fmt(tC)}</Text>
                  </View>
                );
              })()}
              {(() => {
                const tD = Object.values(balances).reduce((s,b) => s + b.debit, 0);
                const tC = Object.values(balances).reduce((s,b) => s + b.credit, 0);
                return tD === tC ? (
                  <View style={styles.balancedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00B894" />
                    <Text style={styles.balancedText}>Balanced ✓ Debits = Credits</Text>
                  </View>
                ) : (
                  <View style={[styles.balancedBadge, { backgroundColor: "#fdecea" }]}>
                    <Ionicons name="alert-circle" size={16} color="#D63031" />
                    <Text style={[styles.balancedText, { color: "#D63031" }]}>Out of balance by ₵{fmt(Math.abs(tD - tC))}</Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* ══ P&L ══ */}
          {tab === "pnl" && (
            <View>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Profit & Loss Statement</Text>
                <Text style={styles.reportSub}>{TODAY.toLocaleString("default",{month:"long"})} {TODAY.getFullYear()}</Text>
              </View>

              <ReportSection title="INCOME" color="#00B894" accounts={COA.Income.accounts}
                balances={balances} getBalance={accountBalance} total={totalIncome} />
              <ReportSection title="EXPENSES" color="#E17055" accounts={COA.Expenses.accounts}
                balances={balances} getBalance={accountBalance} total={totalExpenses} />

              <View style={[styles.netRow, { backgroundColor: netProfit >= 0 ? "#e8fbf5" : "#fdecea" }]}>
                <Text style={styles.netLabel}>NET {netProfit >= 0 ? "PROFIT" : "LOSS"}</Text>
                <Text style={[styles.netValue, { color: netProfit >= 0 ? "#00B894" : "#D63031" }]}>
                  ₵{fmt(Math.abs(netProfit))}
                </Text>
              </View>

              <SectionCard title="Income vs Expenses" icon="bar-chart-outline" color="#4B3F72">
                <MiniBarChart data={[
                  { label:"Income",   income:totalIncome,   expense:0 },
                  { label:"Expenses", income:0, expense:totalExpenses },
                  { label:"Net",      income:Math.max(0,netProfit), expense:0 },
                ]} />
              </SectionCard>
            </View>
          )}

          {/* ══ BALANCE SHEET ══ */}
          {tab === "balance" && (
            <View>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Balance Sheet</Text>
                <Text style={styles.reportSub}>As of {TODAY.toLocaleDateString()}</Text>
              </View>

              <ReportSection title="ASSETS" color="#0984E3" accounts={COA.Assets.accounts}
                balances={balances} getBalance={accountBalance} total={totalAssets} />
              <ReportSection title="LIABILITIES" color="#D63031" accounts={COA.Liabilities.accounts}
                balances={balances} getBalance={accountBalance} total={totalLiab} />
              <ReportSection title="EQUITY" color="#6C5CE7" accounts={COA.Equity.accounts}
                balances={balances} getBalance={accountBalance} total={totalEquity} />

              <View style={[styles.netRow, { backgroundColor: Math.abs(totalAssets - (totalLiab + totalEquity)) < 1 ? "#e8fbf5" : "#fdecea" }]}>
                <Text style={styles.netLabel}>Assets = Liabilities + Equity</Text>
                <Text style={[styles.netValue, { color: "#0984E3" }]}>
                  {Math.abs(totalAssets - (totalLiab + totalEquity)) < 1 ? "✓ Balanced" : "⚠ Out of balance"}
                </Text>
              </View>
            </View>
          )}

          {/* ══ CASH FLOW ══ */}
          {tab === "cashflow" && (
            <View>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Cash Flow Statement</Text>
                <Text style={styles.reportSub}>{TODAY.toLocaleString("default",{month:"long"})} {TODAY.getFullYear()}</Text>
              </View>

              {[
                { title:"Operating Activities",  color:"#00B894", items:["Tithes","Offerings","Donations","Salaries","Utilities","Office Supplies"] },
                { title:"Investing Activities",  color:"#0984E3", items:["Equipment","Buildings","Land","Maintenance"] },
                { title:"Financing Activities",  color:"#6C5CE7", items:["Loans","Accounts Payable","Owner's Equity"] },
              ].map(section => {
                const flows = section.items.map(a => {
                  const b  = accountBalance(a);
                  const cat = Object.entries(COA).find(([, v]) => v.accounts.includes(a))?.[0];
                  const inflow = ["Income","Liabilities","Equity"].includes(cat) ? b : 0;
                  const outflow = ["Expenses","Assets"].includes(cat) ? b : 0;
                  return { account: a, inflow, outflow };
                }).filter(f => f.inflow > 0 || f.outflow > 0);
                const net = flows.reduce((s,f) => s + f.inflow - f.outflow, 0);
                return (
                  <View key={section.title} style={[styles.cfSection, { borderLeftColor: section.color }]}>
                    <Text style={[styles.cfTitle, { color: section.color }]}>{section.title}</Text>
                    {flows.map(f => (
                      <View key={f.account} style={styles.cfRow}>
                        <Text style={styles.cfAccount}>{f.account}</Text>
                        {f.inflow > 0  && <Text style={[styles.cfAmt, { color:"#00B894" }]}>+₵{fmt(f.inflow)}</Text>}
                        {f.outflow > 0 && <Text style={[styles.cfAmt, { color:"#D63031" }]}>-₵{fmt(f.outflow)}</Text>}
                      </View>
                    ))}
                    <View style={[styles.cfNet, { backgroundColor: net >= 0 ? "#e8fbf5" : "#fdecea" }]}>
                      <Text style={styles.cfNetLabel}>Net {section.title.split(" ")[0]}</Text>
                      <Text style={[styles.cfNetValue, { color: net >= 0 ? "#00B894" : "#D63031" }]}>
                        {net >= 0 ? "+" : ""}₵{fmt(net)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ══ CHART OF ACCOUNTS ══ */}
          {tab === "coa" && (
            <View>
              {Object.entries(COA).map(([cat, { color, icon, accounts }]) => (
                <View key={cat} style={[styles.coaSection, { borderLeftColor: color }]}>
                  <View style={styles.coaHeader}>
                    <View style={[styles.coaIconBox, { backgroundColor: color + "20" }]}>
                      <Ionicons name={icon} size={16} color={color} />
                    </View>
                    <Text style={[styles.coaTitle, { color }]}>{cat}</Text>
                    <Text style={[styles.coaTotal, { color }]}>₵{fmt(categoryTotal(cat))}</Text>
                  </View>
                  {accounts.map(a => (
                    <View key={a} style={styles.coaRow}>
                      <View style={styles.coaDot} />
                      <Text style={styles.coaAccount}>{a}</Text>
                      <Text style={[styles.coaBal, { color: accountBalance(a) > 0 ? color : "#bbb" }]}>
                        {accountBalance(a) > 0 ? `₵${fmt(accountBalance(a))}` : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* ══ AI INSIGHTS ══ */}
          {tab === "ai" && (
            <View>
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={28} color="#6C5CE7" />
                <Text style={styles.aiTitle}>AI Financial Insights</Text>
                <Text style={styles.aiSub}>Powered by Claude AI</Text>
              </View>

              <View style={styles.aiSummaryRow}>
                <AiMetric label="Income" value={`₵${fmt(totalIncome)}`} color="#00B894" />
                <AiMetric label="Expenses" value={`₵${fmt(totalExpenses)}`} color="#E17055" />
                <AiMetric label="Profit" value={`₵${fmt(netProfit)}`} color={netProfit>=0?"#00B894":"#D63031"} />
              </View>

              <TouchableOpacity style={styles.aiBtn} onPress={generateAiInsight} disabled={aiLoading}>
                {aiLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="sparkles-outline" size={16} color="#fff" /><Text style={styles.aiBtnText}>Generate AI Insight</Text></>
                }
              </TouchableOpacity>

              {aiInsight ? (
                <View style={styles.aiInsightBox}>
                  <View style={styles.aiInsightHeader}>
                    <Ionicons name="bulb-outline" size={16} color="#6C5CE7" />
                    <Text style={styles.aiInsightTitle}>Analysis & Recommendations</Text>
                  </View>
                  <Text style={styles.aiInsightText}>{aiInsight}</Text>
                </View>
              ) : (
                <View style={styles.aiPlaceholder}>
                  <Ionicons name="analytics-outline" size={48} color="#ddd" />
                  <Text style={styles.aiPlaceholderText}>
                    Tap "Generate AI Insight" for expense categorization, budget forecasting, donation trend prediction, and anomaly detection.
                  </Text>
                </View>
              )}

              {/* Donation trend */}
              <SectionCard title="Donation Trend" icon="trending-up-outline" color="#6C5CE7">
                <SimpleLineViz data={monthlyIncome} color="#6C5CE7" />
              </SectionCard>

              {/* Budget vs Actual mock */}
              <SectionCard title="Budget vs Actual" icon="bar-chart-outline" color="#0984E3">
                <MiniBarChart data={["Salaries","Utilities","Maintenance","Transport"].map((l,i) => ({
                  label:l, income:[3000,1000,500,400][i], expense:[3200,1100,450,380][i]
                }))} labelI="Budget" labelE="Actual" />
              </SectionCard>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ══ JOURNAL ENTRY MODAL ══ */}
      <Modal visible={jModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Journal Entry</Text>
              <Text style={styles.modalHint}>Double-entry: Debits must equal Credits</Text>

              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput style={styles.input} value={jDate} onChangeText={setJDate} placeholder="YYYY-MM-DD" />

              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput style={styles.input} value={jDesc} onChangeText={setJDesc} placeholder="e.g. Sunday Offering Collection" />

              <Text style={styles.fieldLabel}>Entries</Text>
              {jEntries.map((entry, i) => (
                <View key={i} style={styles.entryRow}>
                  <View style={[styles.entryTypePill, { backgroundColor: entry.type === "debit" ? "#E8F4FD" : "#E8FBF5" }]}>
                    <TouchableOpacity onPress={() => {
                      const u = [...jEntries]; u[i].type = u[i].type === "debit" ? "credit" : "debit"; setJEntries(u);
                    }}>
                      <Text style={[styles.entryTypeText, { color: entry.type === "debit" ? "#0984E3" : "#00B894" }]}>
                        {entry.type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput style={[styles.input, styles.entryAccount]}
                    placeholder="Account" value={entry.account}
                    onChangeText={t => { const u=[...jEntries]; u[i].account=t; setJEntries(u); }} />

                  <TextInput style={[styles.input, styles.entryAmt]}
                    placeholder="Amount" keyboardType="numeric" value={entry.amount}
                    onChangeText={t => { const u=[...jEntries]; u[i].amount=t; setJEntries(u); }} />
                </View>
              ))}

              <TouchableOpacity style={styles.addLineBtn} onPress={addJournalLine}>
                <Ionicons name="add-circle-outline" size={14} color="#4B3F72" />
                <Text style={styles.addLineBtnText}>Add line</Text>
              </TouchableOpacity>

              {/* Debit / Credit totals */}
              {(() => {
                const td = jEntries.filter(e=>e.type==="debit").reduce((s,e)=>s+Number(e.amount||0),0);
                const tc = jEntries.filter(e=>e.type==="credit").reduce((s,e)=>s+Number(e.amount||0),0);
                return (
                  <View style={[styles.balanceCheck, { backgroundColor: td===tc ? "#e8fbf5":"#fdecea" }]}>
                    <Text style={{ color: td===tc?"#00B894":"#D63031", fontWeight:"700", fontSize:13 }}>
                      Debits: ₵{fmt(td)}  |  Credits: ₵{fmt(tc)}  {td===tc?"✓ Balanced":"⚠ Not balanced"}
                    </Text>
                  </View>
                );
              })()}

              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 14 }]} onPress={saveJournal}>
                <Text style={styles.primaryBtnText}>Save Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { marginTop: 8 }]} onPress={() => { setJModal(false); resetJournal(); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ─── Helper components ──────────────────────────────────── */

const KpiCard = ({ label, value, color, icon }) => (
  <View style={[styles.kpiCard, { borderColor: color }]}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const SectionCard = ({ title, icon, color, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionCardHeader}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.sectionCardTitle, { color }]}>{title}</Text>
    </View>
    {children}
  </View>
);

const ReportSection = ({ title, color, accounts, getBalance, total }) => (
  <View style={[styles.reportSection, { borderLeftColor: color }]}>
    <Text style={[styles.reportSectionTitle, { color }]}>{title}</Text>
    {accounts.filter(a => getBalance(a) > 0).map(a => (
      <View key={a} style={styles.reportRow}>
        <Text style={styles.reportAccount}>{a}</Text>
        <Text style={styles.reportAmt}>₵{fmt(getBalance(a))}</Text>
      </View>
    ))}
    <View style={[styles.reportTotal, { borderTopColor: color }]}>
      <Text style={[styles.reportTotalLabel, { color }]}>Total {title}</Text>
      <Text style={[styles.reportTotalVal, { color }]}>₵{fmt(total)}</Text>
    </View>
  </View>
);

const MiniBarChart = ({ data, labelI="Income", labelE="Expense" }) => {
  const max = Math.max(...data.map(d => Math.max(d.income||0, d.expense||0)), 1);
  return (
    <View style={{ padding: 14 }}>
      <View style={styles.miniChartRow}>
        {data.map((d, i) => (
          <View key={i} style={styles.miniChartItem}>
            <View style={styles.miniChartBars}>
              {d.income > 0 && <View style={[styles.miniBar, { height: Math.max(4,(d.income/max)*90), backgroundColor:"#00B894" }]} />}
              {d.expense > 0 && <View style={[styles.miniBar, { height: Math.max(4,(d.expense/max)*90), backgroundColor:"#E17055", marginLeft:3 }]} />}
            </View>
            <Text style={styles.miniBarLabel} numberOfLines={1}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.miniLegend}>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:"#00B894"}]}/><Text style={styles.legendText}>{labelI}</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:"#E17055"}]}/><Text style={styles.legendText}>{labelE}</Text></View>
      </View>
    </View>
  );
};

const SimpleLineViz = ({ data, color }) => {
  const max  = Math.max(...data, 1);
  const pts  = data.slice(0, 6);
  return (
    <View style={{ flexDirection:"row", alignItems:"flex-end", padding:14, height:100, gap:6 }}>
      {pts.map((v, i) => (
        <View key={i} style={{ flex:1, alignItems:"center" }}>
          <View style={{ flex:1, justifyContent:"flex-end" }}>
            <View style={{ width:8, borderRadius:4, backgroundColor:color, height:Math.max(4,(v/max)*60) }} />
          </View>
          <Text style={{ fontSize:9, color:"#aaa", marginTop:2 }}>{MONTHS[i]}</Text>
        </View>
      ))}
    </View>
  );
};

const AiMetric = ({ label, value, color }) => (
  <View style={styles.aiMetric}>
    <Text style={[styles.aiMetricValue, { color }]}>{value}</Text>
    <Text style={styles.aiMetricLabel}>{label}</Text>
  </View>
);

const EmptyState = ({ icon, text }) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={40} color="#ddd" />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num/1000000).toFixed(1) + "M";
  if (num >= 1000) return (num/1000).toFixed(1) + "K";
  return num.toLocaleString();
};

/* Demo data for when Firebase is empty */
const DEMO_TRANSACTIONS = [
  { id:"d1", date:"2024-06-01", description:"Sunday Offering", totalAmount:2500,
    entries:[{account:"Cash",type:"debit",amount:2500},{account:"Offerings",type:"credit",amount:2500}] },
  { id:"d2", date:"2024-06-01", description:"Tithes Collection", totalAmount:5000,
    entries:[{account:"Bank Account",type:"debit",amount:5000},{account:"Tithes",type:"credit",amount:5000}] },
  { id:"d3", date:"2024-06-03", description:"Electricity Bill", totalAmount:800,
    entries:[{account:"Utilities",type:"debit",amount:800},{account:"Cash",type:"credit",amount:800}] },
  { id:"d4", date:"2024-06-05", description:"Staff Salaries", totalAmount:3000,
    entries:[{account:"Salaries",type:"debit",amount:3000},{account:"Bank Account",type:"credit",amount:3000}] },
  { id:"d5", date:"2024-06-07", description:"Building Fund Donation", totalAmount:1500,
    entries:[{account:"Bank Account",type:"debit",amount:1500},{account:"Building Fund",type:"credit",amount:1500}] },
];

/* ─── Styles ──────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:"#4B3F72" },
  header: { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingBottom:14, paddingTop:8 },
  backBtn: { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.15)", alignItems:"center", justifyContent:"center", marginRight:12 },
  headerTitle: { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub: { color:"rgba(255,255,255,0.65)", fontSize:11 },
  addEntryBtn: { flexDirection:"row", alignItems:"center", backgroundColor:"rgba(255,255,255,0.2)", paddingHorizontal:12, paddingVertical:7, borderRadius:10, gap:4 },
  addEntryText: { color:"#fff", fontSize:12, fontWeight:"700" },

  tabScroll: { backgroundColor:"#f4f6fb", maxHeight:50 },
  tabContainer: { paddingHorizontal:12, paddingVertical:8, gap:6 },
  tabBtn: { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:7, backgroundColor:"#fff", borderRadius:20, gap:5, borderWidth:1.5, borderColor:"#e8e8e8" },
  tabBtnActive: { backgroundColor:"#EEF0FA", borderColor:"#4B3F72" },
  tabText: { fontSize:12, color:"#aaa", fontWeight:"600" },
  tabTextActive: { color:"#4B3F72", fontWeight:"800" },

  body: { padding:16, backgroundColor:"#f4f6fb" },
  loader: { flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#f4f6fb" },

  kpiRow: { flexDirection:"row", gap:8, marginBottom:12 },
  kpiCard: { flex:1, backgroundColor:"#fff", borderRadius:12, padding:12, alignItems:"center", borderWidth:2, elevation:2 },
  kpiValue: { fontSize:16, fontWeight:"900", marginTop:4 },
  kpiLabel: { fontSize:10, color:"#888", fontWeight:"600", marginTop:2 },

  bsRow: { flexDirection:"row", gap:8, marginBottom:14 },
  bsCard: { flex:1, backgroundColor:"#fff", borderRadius:12, padding:12, alignItems:"center", borderWidth:2, elevation:1 },
  bsValue: { fontSize:14, fontWeight:"800" },
  bsLabel: { fontSize:9, color:"#888", fontWeight:"600", marginTop:2, textAlign:"center" },

  sectionCard: { backgroundColor:"#fff", borderRadius:12, marginBottom:12, overflow:"hidden", elevation:1 },
  sectionCardHeader: { flexDirection:"row", alignItems:"center", padding:14, gap:8 },
  sectionCardTitle: { fontSize:13, fontWeight:"700" },
  chart: { borderRadius:12, marginHorizontal:12, marginBottom:12 },

  twoCol: { flexDirection:"row", gap:8, marginBottom:12 },
  halfCard: { flex:1, backgroundColor:"#fff", borderRadius:12, padding:12, borderLeftWidth:4, elevation:1 },
  halfCardTitle: { fontSize:12, fontWeight:"800", color:"#333", marginBottom:8 },
  topRow: { flexDirection:"row", justifyContent:"space-between", marginBottom:5 },
  topName: { fontSize:11, color:"#555", flex:1 },
  topVal: { fontSize:11, fontWeight:"700" },

  txCard: { backgroundColor:"#fff", borderRadius:12, padding:14, marginBottom:10, elevation:2 },
  txHeader: { flexDirection:"row", justifyContent:"space-between", marginBottom:4 },
  txDate: { fontSize:11, color:"#888", fontWeight:"600" },
  txAmt: { fontSize:13, fontWeight:"800", color:"#4B3F72" },
  txDesc: { fontSize:13, fontWeight:"600", color:"#222", marginBottom:8 },
  txTable: { borderRadius:8, overflow:"hidden", borderWidth:1, borderColor:"#f0f0f0" },
  txTableHeader: { flexDirection:"row", backgroundColor:"#f9f9f9", padding:8 },
  txTableRow: { flexDirection:"row", padding:8, borderTopWidth:1, borderTopColor:"#f0f0f0" },
  txCol: { flex:1, fontSize:11, fontWeight:"700", color:"#666" },
  txCell: { flex:1, fontSize:12, color:"#333" },

  subLabel: { fontSize:12, fontWeight:"700", color:"#888", textTransform:"uppercase", marginBottom:8 },
  acctChip: { paddingHorizontal:12, paddingVertical:6, backgroundColor:"#f0f0f0", borderRadius:20, marginRight:6 },
  acctChipActive: { backgroundColor:"#4B3F72" },
  acctChipText: { fontSize:12, color:"#555", fontWeight:"600" },
  ledgerCard: { backgroundColor:"#fff", borderRadius:12, padding:14, elevation:2 },
  ledgerTitle: { fontSize:15, fontWeight:"800", color:"#222", marginBottom:2 },
  ledgerBalance: { fontSize:13, fontWeight:"700", marginBottom:12 },
  emptySmall: { textAlign:"center", color:"#bbb", padding:16 },

  trialHeader: { marginBottom:14 },
  trialTitle: { fontSize:17, fontWeight:"800", color:"#222" },
  trialDate: { fontSize:12, color:"#888", marginTop:2 },
  trialCatLabel: { fontSize:11, fontWeight:"800", textTransform:"uppercase", padding:8, backgroundColor:"#f9f9f9" },
  trialTotal: { backgroundColor:"#f0f0f0", padding:10 },
  balancedBadge: { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#e8fbf5", borderRadius:10, padding:12, marginTop:12 },
  balancedText: { fontSize:13, fontWeight:"700", color:"#00B894" },

  reportHeader: { marginBottom:14 },
  reportTitle: { fontSize:17, fontWeight:"800", color:"#222" },
  reportSub: { fontSize:12, color:"#888", marginTop:2 },
  reportSection: { backgroundColor:"#fff", borderRadius:12, padding:14, marginBottom:10, borderLeftWidth:4, elevation:1 },
  reportSectionTitle: { fontSize:13, fontWeight:"800", textTransform:"uppercase", marginBottom:10 },
  reportRow: { flexDirection:"row", justifyContent:"space-between", paddingVertical:5, borderBottomWidth:1, borderBottomColor:"#f5f5f5" },
  reportAccount: { fontSize:13, color:"#444" },
  reportAmt: { fontSize:13, fontWeight:"600", color:"#222" },
  reportTotal: { flexDirection:"row", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTopWidth:1.5 },
  reportTotalLabel: { fontSize:13, fontWeight:"800" },
  reportTotalVal: { fontSize:15, fontWeight:"900" },
  netRow: { borderRadius:12, padding:16, flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  netLabel: { fontSize:13, fontWeight:"700", color:"#333" },
  netValue: { fontSize:20, fontWeight:"900" },

  cfSection: { backgroundColor:"#fff", borderRadius:12, padding:14, marginBottom:10, borderLeftWidth:4, elevation:1 },
  cfTitle: { fontSize:14, fontWeight:"800", marginBottom:10 },
  cfRow: { flexDirection:"row", justifyContent:"space-between", paddingVertical:5, borderBottomWidth:1, borderBottomColor:"#f5f5f5" },
  cfAccount: { fontSize:13, color:"#444" },
  cfAmt: { fontSize:13, fontWeight:"700" },
  cfNet: { flexDirection:"row", justifyContent:"space-between", marginTop:8, padding:8, borderRadius:8 },
  cfNetLabel: { fontSize:12, fontWeight:"700", color:"#333" },
  cfNetValue: { fontSize:14, fontWeight:"900" },

  coaSection: { backgroundColor:"#fff", borderRadius:12, padding:14, marginBottom:10, borderLeftWidth:4, elevation:1 },
  coaHeader: { flexDirection:"row", alignItems:"center", gap:10, marginBottom:10 },
  coaIconBox: { width:32, height:32, borderRadius:8, alignItems:"center", justifyContent:"center" },
  coaTitle: { flex:1, fontSize:14, fontWeight:"800" },
  coaTotal: { fontSize:14, fontWeight:"900" },
  coaRow: { flexDirection:"row", alignItems:"center", paddingVertical:5, borderBottomWidth:1, borderBottomColor:"#f8f8f8" },
  coaDot: { width:6, height:6, borderRadius:3, backgroundColor:"#ddd", marginRight:10 },
  coaAccount: { flex:1, fontSize:13, color:"#444" },
  coaBal: { fontSize:12, fontWeight:"700" },

  aiHeader: { alignItems:"center", marginBottom:16 },
  aiTitle: { fontSize:17, fontWeight:"800", color:"#222", marginTop:8 },
  aiSub: { fontSize:12, color:"#888", marginTop:2 },
  aiSummaryRow: { flexDirection:"row", gap:8, marginBottom:14 },
  aiMetric: { flex:1, backgroundColor:"#fff", borderRadius:12, padding:12, alignItems:"center", elevation:1 },
  aiMetricValue: { fontSize:15, fontWeight:"900" },
  aiMetricLabel: { fontSize:10, color:"#888", marginTop:2 },
  aiBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", backgroundColor:"#6C5CE7", borderRadius:12, padding:14, gap:8, marginBottom:14 },
  aiBtnText: { color:"#fff", fontSize:14, fontWeight:"800" },
  aiInsightBox: { backgroundColor:"#fff", borderRadius:12, padding:16, marginBottom:14, borderLeftWidth:4, borderLeftColor:"#6C5CE7", elevation:2 },
  aiInsightHeader: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 },
  aiInsightTitle: { fontSize:13, fontWeight:"800", color:"#6C5CE7" },
  aiInsightText: { fontSize:13, color:"#333", lineHeight:21 },
  aiPlaceholder: { alignItems:"center", padding:30, backgroundColor:"#fff", borderRadius:12, marginBottom:14 },
  aiPlaceholderText: { fontSize:13, color:"#bbb", textAlign:"center", marginTop:12, lineHeight:20 },

  miniChartRow: { flexDirection:"row", alignItems:"flex-end", height:100, gap:4 },
  miniChartItem: { flex:1, alignItems:"center" },
  miniChartBars: { flexDirection:"row", alignItems:"flex-end", height:90 },
  miniBar: { width:14, borderRadius:4 },
  miniBarLabel: { fontSize:9, color:"#888", marginTop:4 },
  miniLegend: { flexDirection:"row", gap:12, justifyContent:"center", marginTop:8 },
  legendItem: { flexDirection:"row", alignItems:"center", gap:4 },
  legendDot: { width:8, height:8, borderRadius:4 },
  legendText: { fontSize:10, color:"#666" },

  primaryBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", backgroundColor:"#4B3F72", borderRadius:12, padding:14, gap:6 },
  primaryBtnText: { color:"#fff", fontSize:14, fontWeight:"800" },
  cancelBtn: { alignItems:"center", padding:12 },
  cancelBtnText: { color:"#888", fontSize:13 },

  modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"flex-end" },
  modalSheet: { backgroundColor:"#fff", borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, maxHeight:"90%" },
  modalTitle: { fontSize:18, fontWeight:"800", color:"#222", marginBottom:4, textAlign:"center" },
  modalHint: { fontSize:12, color:"#888", textAlign:"center", marginBottom:16 },
  fieldLabel: { fontSize:12, fontWeight:"700", color:"#888", textTransform:"uppercase", marginBottom:4, marginTop:10 },
  input: { backgroundColor:"#f5f5f5", borderRadius:10, padding:11, fontSize:13, color:"#222", borderWidth:1.5, borderColor:"#eee" },

  entryRow: { flexDirection:"row", alignItems:"center", gap:6, marginBottom:8 },
  entryTypePill: { borderRadius:8, padding:6, minWidth:52, alignItems:"center" },
  entryTypeText: { fontSize:10, fontWeight:"800" },
  entryAccount: { flex:2, marginBottom:0 },
  entryAmt: { flex:1, marginBottom:0 },
  addLineBtn: { flexDirection:"row", alignItems:"center", gap:6, paddingVertical:8 },
  addLineBtnText: { color:"#4B3F72", fontSize:13, fontWeight:"700" },
  balanceCheck: { borderRadius:10, padding:12, alignItems:"center", marginTop:8 },

  emptyState: { alignItems:"center", padding:40 },
  emptyText: { color:"#bbb", marginTop:10, fontSize:13 },
  
  tabGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: "#f4f6fb",
  },

tabCard: {
  width: "31%",
  backgroundColor: "#fff",
  borderRadius: 16,
  paddingVertical: 16,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
  minHeight: 85,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},

tabCardActive: {
  borderWidth: 2,
  borderColor: "#4B3F72",
  shadowColor: "#4B3F72",
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 6,
},

tabIconWrap: {
  width: 44,
  height: 44,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 8,
},


tabLabel: {
  fontSize: 11,
  fontWeight: "700",
  color: "#666",
  textAlign: "center",},

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
  shadowColor: "#4B3F72",
shadowOpacity: 0.2,
shadowRadius: 10,
elevation: 6,
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



});

