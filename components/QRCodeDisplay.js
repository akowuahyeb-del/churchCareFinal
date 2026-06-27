// components/QRCodeDisplay.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Share } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";

export default function QRCodeDisplay({ value, title, subtitle, size = 220, onClose }) {
  const handleShare = () => {
    Share.share({ message: value }).catch(() => {});
  };

  return (
    <View style={styles.box}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.qrWrap}>
        <QRCode value={value} size={size} backgroundColor="#fff" color="#222" />
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share-outline" size={15} color="#fff" />
        <Text style={styles.shareBtnText}>Share / Display</Text>
      </TouchableOpacity>

      {onClose && (
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", padding: 16 },
  title: { fontSize: 15, fontWeight: "800", color: "#222", textAlign: "center" },
  subtitle: { fontSize: 12, color: "#888", marginTop: 4, textAlign: "center", marginBottom: 14 },
  qrWrap: { backgroundColor: "#fff", padding: 16, borderRadius: 16, elevation: 2 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4B3F72",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16
  },
  shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  closeText: { color: "#888", marginTop: 12, fontSize: 13 }
});