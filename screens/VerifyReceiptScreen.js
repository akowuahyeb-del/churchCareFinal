import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, Alert,
  TouchableOpacity, ScrollView, Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { db } from "../firebase";
import {
  doc, getDoc, collection, query, where, onSnapshot
} from "firebase/firestore";

import { findMethod } from "../constants/donationMethods";

export default function VerifyReceiptScreen({ navigation }) {

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId = activeEntity?.entityId;

  // ✅ FIXED: was useState for hasPermission + the old, removed
  // Camera.requestCameraPermissionsAsync() API. useCameraPermissions is
  // the same hook AttendanceScreen already uses elsewhere in this app —
  // matching it means this screen runs on whatever expo-camera version
  // is actually installed, instead of an API that no longer exists.
  const [permission, requestPermission] = useCameraPermissions();

  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // ✅ NEW — "display donations received at any point in time": a live
  // feed of acknowledged contributions, not just a one-off scan result.
  const [donations, setDonations] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) {
        try { setActiveEntity(JSON.parse(data)); } catch (_) {}
      }
    });
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // ✅ Live feed — updates in real time as new donations are acknowledged
  useEffect(() => {
    if (!organizationId || !entityId) return;

    const q = query(
      collection(db, "organizations", organizationId, "entities", entityId, "contributions"),
      where("status", "==", "acknowledged")
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDonations(data);
      setFeedLoading(false);
    }, (e) => {
      console.log("❌ Donations feed error:", e);
      setFeedLoading(false);
    });

    return () => unsub();
  }, [organizationId, entityId]);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const parts = data.split("|");

      if (parts.length < 4 || parts[0] !== "CHURCHCARE") {
        Alert.alert("Invalid QR", "Not a valid ChurchCare receipt.");
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      const [, scannedOrgId, scannedEntityId, receiptId] = parts;

      if (scannedOrgId !== organizationId || scannedEntityId !== entityId) {
        Alert.alert("Different Church", "This receipt belongs to a different church.");
        setTimeout(() => setScanned(false), 1500);
        return;
      }

      setLoading(true);

      const ref = doc(
        db, "organizations", scannedOrgId, "entities", scannedEntityId, "contributions", receiptId
      );
      const snap = await getDoc(ref);

      setResult(!snap.exists() ? { valid: false } : { valid: true, data: snap.data() });
    } catch (e) {
      console.log("❌ Verify error:", e);
      Alert.alert("Error", "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const openScanner = () => {
    setResult(null);
    setScanned(false);
    setScanModalVisible(true);
  };

  const closeScanner = () => {
    setScanModalVisible(false);
    setResult(null);
    setScanned(false);
  };

  const totalReceived = donations.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Donations Received</Text>
          <Text style={styles.headerSub}>{activeEntity?.name || "Church"}</Text>
        </View>
        <TouchableOpacity style={styles.scanIconBtn} onPress={openScanner}>
          <Ionicons name="qr-code-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>Total Received</Text>
        <Text style={styles.totalAmt}>GH₵ {totalReceived.toLocaleString()}</Text>
        <Text style={styles.totalCount}>{donations.length} acknowledged donation{donations.length !== 1 ? "s" : ""}</Text>
      </View>

      {/* ── LIVE FEED ── */}
      {feedLoading ? (
        <ActivityIndicator color="#4B3F72" size="large" style={{ marginTop: 30 }} />
      ) : donations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={42} color="#ccc" />
          <Text style={styles.emptyText}>No acknowledged donations yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {donations.map(item => {
            const methodInfo = findMethod(item.method) || { icon: "cash-outline", color: "#888", label: "Cash" };
            return (
              <View key={item.id} style={styles.donationRow}>
                <View style={[styles.donationIcon, { backgroundColor: methodInfo.color + "18" }]}>
                  <Ionicons name={methodInfo.icon} size={18} color={methodInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.donationName}>{item.memberName || "Anonymous"}</Text>
                  <Text style={styles.donationMeta}>
                    {item.type} · {item.date} · {item.methodLabel || methodInfo.label}
                  </Text>
                  {item.acknowledgedByName && (
                    <Text style={styles.donationAck}>
                      ✓ Acknowledged by {item.acknowledgedByName}
                    </Text>
                  )}
                </View>
                <Text style={styles.donationAmt}>GH₵ {item.amount?.toLocaleString()}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── SCAN-TO-VERIFY MODAL ── */}
      <Modal visible={scanModalVisible} animationType="slide" onRequestClose={closeScanner}>
        <View style={styles.scanContainer}>
          <View style={styles.scanHeader}>
            <Text style={styles.scanTitle}>Verify Receipt</Text>
            <TouchableOpacity onPress={closeScanner}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ✅ FIXED: properly guards on permission state instead of
             rendering the camera unconditionally */}
          {!permission ? (
            <View style={styles.scanCenter}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          ) : !permission.granted ? (
            <View style={styles.scanCenter}>
              <Ionicons name="camera-off-outline" size={48} color="#fff" />
              <Text style={styles.permissionText}>Camera access is required to scan receipts.</Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.permissionBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              />

              {loading && (
                <View style={styles.scanOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}

              {result && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultTitle}>
                    {result.valid ? "✅ Valid Receipt" : "❌ Invalid Receipt"}
                  </Text>

                  {result.valid && (
                    <>
                      <Text style={styles.resultRow}>Member: {result.data.memberName}</Text>
                      <Text style={styles.resultRow}>Amount: GH₵ {result.data.amount}</Text>
                      <Text style={styles.resultRow}>Type: {result.data.type}</Text>
                      <Text style={styles.resultRow}>Date: {result.data.date}</Text>
                      <Text style={styles.resultRow}>
                        Status: {result.data.status === "acknowledged" ? "✓ Acknowledged" : "⏳ Pending"}
                      </Text>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={() => { setResult(null); setScanned(false); }}
                  >
                    <Text style={styles.rescanBtnText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  header: { backgroundColor: "#4B3F72", paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backBtn: { marginRight: 12 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 1 },
  scanIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  totalBanner: { backgroundColor: "#fff", margin: 14, borderRadius: 14, padding: 18, alignItems: "center", elevation: 2 },
  totalLabel: { fontSize: 11, color: "#888", fontWeight: "700", textTransform: "uppercase" },
  totalAmt: { fontSize: 28, fontWeight: "900", color: "#27ae60", marginTop: 4 },
  totalCount: { fontSize: 12, color: "#aaa", marginTop: 4 },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: "#bbb", marginTop: 10, fontSize: 13 },

  donationRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, gap: 12, elevation: 1 },
  donationIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  donationName: { fontSize: 13, fontWeight: "700", color: "#222" },
  donationMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  donationAck: { fontSize: 10, color: "#27ae60", marginTop: 2, fontWeight: "600" },
  donationAmt: { fontSize: 15, fontWeight: "800", color: "#27ae60" },

  scanContainer: { flex: 1, backgroundColor: "#000" },
  scanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  scanTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  scanCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  permissionText: { color: "#fff", textAlign: "center", marginTop: 12, fontSize: 13 },
  permissionBtn: { backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 16 },
  permissionBtnText: { color: "#fff", fontWeight: "700" },

  scanOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },

  resultBox: { backgroundColor: "#fff", padding: 20, position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  resultTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  resultRow: { fontSize: 13, color: "#333", marginBottom: 4 },
  rescanBtn: { backgroundColor: "#4B3F72", borderRadius: 10, padding: 12, alignItems: "center", marginTop: 12 },
  rescanBtnText: { color: "#fff", fontWeight: "700" },
});