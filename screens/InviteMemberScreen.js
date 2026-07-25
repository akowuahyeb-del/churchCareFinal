// screens/InviteMemberScreen.js
//
// Reached from MembersScreen's "Invite" action. Lets an admin send an
// app invite through whichever channel actually works for this person:
// WhatsApp (opens the device's WhatsApp app with a pre-filled message),
// a QR code the member can scan themselves later, or just the raw
// Member ID to read out / write down for manual entry.
//
// Expects route.params: { organizationId, entityId, memberId }

import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  SafeAreaView, StatusBar, ActivityIndicator, Share
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import AppHeader from "../components/AppHeader";

 import {
  generateMemberInvite,
  shareInviteViaWhatsApp,
} from "../utils/memberIntake";

export default function InviteMemberScreen({ navigation, route }) {
  const { organizationId, entityId, memberId } = route.params || {};
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        console.log("INVITE REQUEST", {
  organizationId,
  entityId,
  memberId,
});

const data = await generateMemberInvite({
  organizationId,
  entityId,
  memberId,
  channel: "whatsapp",
});

console.log("INVITE RESPONSE", data);

setInvite(data);
        console.log("INVITE DATA:", data);
        setInvite(data);
      } catch (e) {
  console.log("INVITE ERROR", e);
  console.log("INVITE ERROR MESSAGE", e?.message);
  console.log("INVITE ERROR CODE", e?.code);

  Alert.alert(
    "Invite Error",
    e?.message || JSON.stringify(e)
  );
}
      
      finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleWhatsApp = async () => {
    if (!invite?.memberPhone) {
      Alert.alert("No phone number", "This member has no phone number on file — try copying the Member ID instead.");
      return;
    }
    setSending(true);
    try {
      await shareInviteViaWhatsApp({
        phone: invite.memberPhone,
        memberName: invite.memberName,
        memberCode: invite.memberCode,
        inviteLink: invite.inviteLink,
      });
    } catch (e) {
      Alert.alert("Couldn't open WhatsApp", e.message);
    } finally {
      setSending(false);
    }
  };

  const handleCopyCode = async () => {
  if (!invite?.memberCode) {
    Alert.alert(
      "No Member ID",
      "This member does not yet have a Member ID."
    );
    return;
  }

  await Clipboard.setStringAsync(invite.memberCode);

  Alert.alert(
    "Copied",
    "Member ID copied to clipboard."
  );
};

  const handleGenericShare = async () => {
    try {
      await Share.share({
        message: `Hi ${invite.memberName}! Set up your ChurchCare account with Member ID: ${invite.memberCode}\n${invite.inviteLink}`,
      });
    } catch (e) { /* user cancelled — no-op */ }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
        <AppHeader title="Invite Member" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color="#4B3F72" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
      <AppHeader title="Invite Member" subtitle={invite?.memberName} onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <View style={styles.qrCard}>
  {invite && (
    <>
      <QRCode
        value={JSON.stringify({
          memberCode: invite.memberCode,
          entityId,
        })}
        size={180}
      />

      <Text style={styles.codeLabel}>
        Member ID
      </Text>

      <Text style={styles.code}>
        {invite.memberCode}
      </Text>

      <Text style={styles.hint}>
        They can scan this in-app under "I have a Member ID", or type the code in manually.
      </Text>
    </>
  )}
</View>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#25D366" }, sending && { opacity: 0.6 }]}
          onPress={handleWhatsApp}
          disabled={sending}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>{sending ? "Opening WhatsApp…" : "Send via WhatsApp"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#4B3F72" }]} onPress={handleCopyCode}>
          <Ionicons name="copy-outline" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Copy Member ID</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#0984E3" }]} onPress={handleGenericShare}>
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Share another way</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, backgroundColor: "#f4f6fb", padding: 16 },
  qrCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 16, elevation: 1 },
  codeLabel: { fontSize: 11, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginTop: 16 },
  code: { fontSize: 20, fontWeight: "800", color: "#4B3F72", letterSpacing: 1, marginTop: 4 },
  hint: { fontSize: 11, color: "#999", textAlign: "center", marginTop: 10, lineHeight: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, marginBottom: 10 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});