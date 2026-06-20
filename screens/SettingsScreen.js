
import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Modal, TextInput, Alert, SafeAreaView, StatusBar,
  Platform, Share, Image, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import AppHeader from "../components/AppHeader";

import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebase";


// ── Role config ───────────────────────────────────────────────────
const USER_ROLE  = "admin";
const USER_NAME  = "Kwame Mensah";
const USER_EMAIL = "kwame@churchcare.app";
const CHURCH_ID  = "church_001";
const CHURCH_NAME = "Grace Community Church";

const ROLE_LEVEL = { admin: 5, pastor: 4, elder: 3, deacon: 2, member: 1 };
const canDo = (minRole) => ROLE_LEVEL[USER_ROLE] >= ROLE_LEVEL[minRole];

// ── QR types — dynamic, tied to church activity ───────────────────
const QR_TYPES = [
  { key: "attendance",  label: "Attendance Check-In", icon: "checkmark-circle-outline", color: "#4B3F72",
    buildValue: (cId, _label) => `churchcare://attendance?church=${cId}&session=${Date.now()}` },
  { key: "donate",      label: "Donation Link",       icon: "heart-outline",            color: "#E11D48",
    buildValue: (cId)         => `churchcare://donate?church=${cId}` },
  { key: "register",    label: "Member Registration", icon: "person-add-outline",       color: "#0984E3",
    buildValue: (cId)         => `churchcare://register?church=${cId}` },
  { key: "event",       label: "Event Registration",  icon: "calendar-outline",         color: "#00B894",
    buildValue: (cId, label)  => `churchcare://event?church=${cId}&event=${encodeURIComponent(label || "event")}` },
  { key: "prayer",      label: "Prayer Request",      icon: "prism-outline",            color: "#6C5CE7",
    buildValue: (cId)         => `churchcare://prayer?church=${cId}` },
  { key: "custom",      label: "Custom URL / Text",   icon: "link-outline",             color: "#636e72",
    buildValue: (_, label)    => label || "https://churchcare.app" },
];

// ── Reusable rows ─────────────────────────────────────────────────
function ToggleRow({ icon, label, sub, value, onChange, disabled, color = "#4B3F72" }) {
  return (
    <View style={[styles.settingRow, disabled && { opacity: 0.4 }]}>
      <View style={[styles.settingIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled}
        trackColor={{ false: "#ddd", true: color }} thumbColor="#fff" />
    </View>
  );
}

function TapRow({ icon, label, sub, onPress, danger, color = "#4B3F72", badge }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={[styles.settingIcon, { backgroundColor: (danger ? "#e74c3c" : color) + "18" }]}>
        <Ionicons name={icon} size={18} color={danger ? "#e74c3c" : color} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, danger && { color: "#e74c3c" }]}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
        <Ionicons name="chevron-forward" size={15} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ModalSheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();

  // ── Notifications ──
  const [notifService,    setNotifService]    = useState(true);
  const [notifAnnounce,   setNotifAnnounce]   = useState(true);
  const [notifAttendance, setNotifAttendance] = useState(false);
  const [notifFinance,    setNotifFinance]    = useState(false);
  const [notifBirthday,   setNotifBirthday]   = useState(true);
  const [notifPrayer,     setNotifPrayer]     = useState(true);

  // ── Display ──
  const [darkMode,    setDarkMode]    = useState(false);
  const [fontSize,    setFontSize]    = useState("medium");
  const [language,    setLanguage]    = useState("English");
  const [offlineMode, setOfflineMode] = useState(false);

  // ── Privacy ──
  const [biometric,     setBiometric]     = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showPhone,     setShowPhone]     = useState(false);

  // ── Admin ──
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [guestAttendance,  setGuestAttendance]  = useState(true);
  const [autoLockService,  setAutoLockService]  = useState(true);
  const [requireApproval,  setRequireApproval]  = useState(true);
  const [maintenanceMode,  setMaintenanceMode]  = useState(false);

  // ── Profile (with photo upload) ──
  const [profileModal,  setProfileModal]  = useState(false);
  const [editName,      setEditName]      = useState(USER_NAME);
  const [editEmail,     setEditEmail]     = useState(USER_EMAIL);
  const [profilePhoto,  setProfilePhoto]  = useState(null);
  const [uploadingPhoto,setUploadingPhoto]= useState(false);

  // ── PIN ──
  const [pinModal,    setPinModal]    = useState(false);
  const [oldPin,      setOldPin]      = useState("");
  const [newPin,      setNewPin]      = useState("");
  const [confirmPin,  setConfirmPin]  = useState("");

  // ── Font / Language ──
  const [fontModal, setFontModal] = useState(false);
  const [langModal, setLangModal] = useState(false);

  // ── Church info ──
  const [churchInfoModal,  setChurchInfoModal]  = useState(false);
  const [editChurchName,   setEditChurchName]   = useState(CHURCH_NAME);
  const [editChurchAddr,   setEditChurchAddr]   = useState("123 Faith Avenue, Accra");
  const [editChurchPhone,  setEditChurchPhone]  = useState("+233 20 123 4567");
  const [editChurchWeb,    setEditChurchWeb]    = useState("www.gracechurch.org");

  // ── Data / account ──
  const [clearDataModal,  setClearDataModal]  = useState(false);
  const [signOutModal,    setSignOutModal]    = useState(false);
  const [dataExportModal, setDataExportModal] = useState(false);
  const [aboutModal,      setAboutModal]      = useState(false);

  // ── NEW: QR Generator ──
  const [qrModal,       setQrModal]       = useState(false);
  const [qrType,        setQrType]        = useState(QR_TYPES[0]);
  const [qrLabel,       setQrLabel]       = useState("");
  const [qrGenerated,   setQrGenerated]   = useState(false);
  const [qrValue,       setQrValue]       = useState("");

  // ── NEW: Member Account Status (admin) ──
  const [accountStatusModal, setAccountStatusModal] = useState(false);
  const [deactivateReason,   setDeactivateReason]   = useState("");
  const [reinstateReason,    setReinstateReason]     = useState("");
  const [accountStatus,      setAccountStatus]       = useState("active"); // active | deactivated
  const [statusAction,       setStatusAction]        = useState("deactivate"); // deactivate | reinstate

  const roleBadgeColor = { admin:"#4B3F72", pastor:"#0984E3", elder:"#00B894", deacon:"#FDCB6E", member:"#aaa" }[USER_ROLE] || "#aaa";

  // ── Profile photo upload ──────────────────────────────────────
  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access to upload a profile picture."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8
    });
    if (!result.canceled) {
      setUploadingPhoto(true);
      // Replace with actual Firebase Storage upload in production
      await new Promise(r => setTimeout(r, 800));
      setProfilePhoto(result.assets[0].uri);
      setUploadingPhoto(false);
    }
  };

  const takeProfilePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) {
      setUploadingPhoto(true);
      await new Promise(r => setTimeout(r, 800));
      setProfilePhoto(result.assets[0].uri);
      setUploadingPhoto(false);
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert("Profile Photo", "Choose a source", [
      { text: "Photo Library", onPress: pickProfilePhoto },
      { text: "Take Photo",    onPress: takeProfilePhoto },
      profilePhoto ? { text: "Remove Photo", style: "destructive", onPress: () => setProfilePhoto(null) } : null,
      { text: "Cancel", style: "cancel" },
    ].filter(Boolean));
  };

  // ── QR generation ─────────────────────────────────────────────
  const generateQR = () => {
    if (qrType.key === "custom" && !qrLabel.trim()) {
      Alert.alert("Required", "Please enter the custom URL or text for this QR code.");
      return;
    }
    if (qrType.key === "event" && !qrLabel.trim()) {
      Alert.alert("Required", "Please enter the event name.");
      return;
    }
    const value = qrType.buildValue(CHURCH_ID, qrLabel.trim());
    setQrValue(value);
    setQrGenerated(true);
  };

  const shareQR = async () => {
    try {
      await Share.share({
        message: `ChurchCare QR Code — ${qrType.label}\n\n${CHURCH_NAME}\n\nScan with ChurchCare app:\n${qrValue}`,
        title: `${qrType.label} QR Code`,
      });
    } catch (e) { Alert.alert("Share failed", e.message); }
  };

  const resetQR = () => { setQrGenerated(false); setQrLabel(""); setQrType(QR_TYPES[0]); setQrValue(""); };

  // ── Account status actions ─────────────────────────────────────
  const confirmAccountAction = () => {
    const reason = statusAction === "deactivate" ? deactivateReason : reinstateReason;
    if (!reason.trim()) { Alert.alert("Required", "Please provide a reason."); return; }
    const newStatus = statusAction === "deactivate" ? "deactivated" : "active";
    setAccountStatus(newStatus);
    Alert.alert(
      statusAction === "deactivate" ? "Account Deactivated" : "Account Reinstated",
      `The member account has been ${newStatus}.\nReason recorded: "${reason}"`
    );
    setDeactivateReason(""); setReinstateReason("");
    setAccountStatusModal(false);
  };

  // ── Handlers (unchanged) ──────────────────────────────────────
  const handleSavePin = () => {
    if (!oldPin) { Alert.alert("Enter current PIN"); return; }
    if (newPin.length < 4) { Alert.alert("Minimum 4 digits"); return; }
    if (newPin !== confirmPin) { Alert.alert("PINs do not match"); return; }
    Alert.alert("✅ PIN updated");
    setPinModal(false); setOldPin(""); setNewPin(""); setConfirmPin("");
  };
  const handleSaveProfile = () => {
    if (!editName.trim()) { Alert.alert("Name required"); return; }
    Alert.alert("✅ Profile updated");
    setProfileModal(false);
  };
  const handleSaveChurchInfo = () => { Alert.alert("✅ Church info updated"); setChurchInfoModal(false); };
  const handleClearData  = () => { Alert.alert("✅ Local data cleared"); setClearDataModal(false); };
  
  const handleSignOut = async () => {
  try {
    // ✅ 1. Sign out Firebase
    await signOut(auth);

    // ✅ 2. Clear all stored session data
    await AsyncStorage.multiRemove([
      "isLoggedIn",
      "currentUser",
      "activeEntity"
    ]);

    // ✅ 3. Close modal
    setSignOutModal(false);

    // ✅ 4. Navigate to Login screen
    navigation.replace("Login");

  } catch (e) {
    console.log("❌ LOGOUT ERROR:", e);
    Alert.alert("Error", "Failed to log out");
  }
};

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      <AppHeader title="Settings" subtitle="App preferences & controls" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── PROFILE CARD ── */}
        <TouchableOpacity style={styles.profileCard} onPress={() => setProfileModal(true)}>
          {profilePhoto
            ? <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
            : <View style={styles.avatar}><Text style={styles.avatarText}>{USER_NAME.split(" ").map(n=>n[0]).join("").toUpperCase()}</Text></View>
          }
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{USER_NAME}</Text>
            <Text style={styles.profileEmail}>{USER_EMAIL}</Text>
            <View style={[styles.rolePill, { backgroundColor: roleBadgeColor + "22" }]}>
              <Text style={[styles.roleText, { color: roleBadgeColor }]}>{USER_ROLE.toUpperCase()}</Text>
            </View>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Ionicons name="create-outline" size={18} color="#4B3F72" />
            <Text style={{ fontSize: 9, color: "#4B3F72", fontWeight: "700" }}>Edit</Text>
          </View>
        </TouchableOpacity>

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <ToggleRow icon="megaphone-outline"    label="Service Announcements" sub="Upcoming services"         value={notifService}    onChange={setNotifService}    color="#4B3F72" />
          <ToggleRow icon="notifications-outline" label="General Announcements" sub="Church notices"           value={notifAnnounce}   onChange={setNotifAnnounce}   color="#0984E3" />
          <ToggleRow icon="calendar-outline"      label="Attendance Reminders"  sub="Before service"          value={notifAttendance} onChange={setNotifAttendance} color="#00B894" disabled={!canDo("deacon")} />
          <ToggleRow icon="cash-outline"          label="Financial Alerts"      sub="Donations & reports"     value={notifFinance}    onChange={setNotifFinance}    color="#D97706" disabled={!canDo("elder")} />
          <ToggleRow icon="gift-outline"          label="Birthday Wishes"       sub="Auto birthday messages"  value={notifBirthday}   onChange={setNotifBirthday}   color="#E11D48" />
          <ToggleRow icon="prism-outline"         label="Prayer Requests"       sub="New prayer requests"     value={notifPrayer}     onChange={setNotifPrayer}     color="#6C5CE7" />
        </View>

        {/* ── DISPLAY ── */}
        <SectionHeader title="Display & Appearance" />
        <View style={styles.card}>
          <ToggleRow icon="moon-outline"           label="Dark Mode"     sub="Switch to dark theme"        value={darkMode}    onChange={setDarkMode}    color="#222" />
          <TapRow    icon="text-outline"           label="Font Size"     sub={`Current: ${fontSize}`}      onPress={() => setFontModal(true)} color="#4B3F72" />
          <TapRow    icon="language-outline"       label="Language"      sub={`Current: ${language}`}      onPress={() => setLangModal(true)} color="#0984E3" />
          <ToggleRow icon="cloud-offline-outline"  label="Offline Mode"  sub="Cache data locally"          value={offlineMode} onChange={setOfflineMode} color="#888" />
        </View>

        {/* ── PRIVACY & SECURITY ── */}
        <SectionHeader title="Privacy & Security" />
        <View style={styles.card}>
          <ToggleRow icon="finger-print-outline"     label="Biometric Login"     sub="Fingerprint / Face ID"           value={biometric}     onChange={setBiometric}     color="#4B3F72" />
          <ToggleRow icon="eye-outline"              label="Public Profile"       sub="Visible to other members"        value={profilePublic} onChange={setProfilePublic} color="#0984E3" />
          <ToggleRow icon="call-outline"             label="Show Phone Number"    sub="Visible to church leaders"       value={showPhone}     onChange={setShowPhone}     color="#00B894" />
          <TapRow    icon="key-outline"              label="Change Admin PIN"     sub="Update attendance lock PIN"      onPress={() => setPinModal(true)} color="#D97706" />
          <TapRow    icon="shield-checkmark-outline" label="Data & Privacy Policy"sub="How your data is used"          onPress={() => Alert.alert("Privacy Policy", "Your data is securely stored and never shared.")} color="#6C5CE7" />
        </View>

        {/* ── CHURCH INFORMATION ── */}
        {canDo("pastor") && (
          <>
            <SectionHeader title="Church Information" />
            <View style={styles.card}>
              <TapRow icon="business-outline"   label="Church Details"   sub="Name, address, contact"    onPress={() => setChurchInfoModal(true)} color="#4B3F72" />
              <TapRow icon="people-outline"     label="Manage Roles"     sub="Assign roles to members"   onPress={() => Alert.alert("Manage Roles", "Role management is in the Members section.")} color="#0984E3" />
              <TapRow icon="git-branch-outline" label="Manage Branches"  sub="Add or edit branches"      onPress={() => Alert.alert("Coming Soon", "Branch management coming soon.")} color="#00B894" />
            </View>
          </>
        )}

        {/* ── ADMIN CONTROLS ── */}
        {canDo("admin") && (
          <>
            <SectionHeader title="Admin Controls" />
            <View style={styles.card}>
              <ToggleRow icon="person-add-outline"  label="Open Registration"  sub="Allow new registrations"       value={registrationOpen} onChange={setRegistrationOpen} color="#4B3F72" />
              <ToggleRow icon="walk-outline"        label="Guest Attendance"   sub="Guests can mark attendance"    value={guestAttendance}  onChange={setGuestAttendance}  color="#0984E3" />
              <ToggleRow icon="lock-closed-outline" label="Auto-Lock Service"  sub="Lock attendance on end"        value={autoLockService}  onChange={setAutoLockService}  color="#D97706" />
              <ToggleRow icon="shield-outline"      label="Require Approval"   sub="Multi-role approval required"  value={requireApproval}  onChange={setRequireApproval}  color="#6C5CE7" />
              <ToggleRow icon="construct-outline"   label="Maintenance Mode"   sub="Restrict all user access"      value={maintenanceMode}  onChange={(v) => {
                if (v) Alert.alert("⚠️ Maintenance Mode", "This restricts all users. Continue?", [
                  { text: "Cancel" },
                  { text: "Enable", style: "destructive", onPress: () => setMaintenanceMode(true) }
                ]);
                else setMaintenanceMode(false);
              }} color="#e74c3c" />
              {/* ── NEW: Member Account Status ── */}
              <TapRow
                icon={accountStatus === "active" ? "person-remove-outline" : "person-add-outline"}
                label={accountStatus === "active" ? "Deactivate Member Account" : "Reinstate Member Account"}
                sub={accountStatus === "active" ? "Suspend a member's access" : "Restore a member's access"}
                onPress={() => { setStatusAction(accountStatus === "active" ? "deactivate" : "reinstate"); setAccountStatusModal(true); }}
                color={accountStatus === "active" ? "#e74c3c" : "#00B894"}
              />
            </View>
          </>
        )}

        {/* ── NEW: QR CODE GENERATOR ── */}
        {canDo("deacon") && (
          <>
            <SectionHeader title="QR Code Generator" />
            <View style={styles.card}>
              <TapRow
                icon="qr-code-outline"
                label="Generate Church QR Code"
                sub="Dynamic QR for attendance, events, donations & more"
                onPress={() => { resetQR(); setQrModal(true); }}
                color="#4B3F72"
                badge="New"
              />
            </View>
          </>
        )}

        {/* ── DATA MANAGEMENT ── */}
        <SectionHeader title="Data Management" />
        <View style={styles.card}>
          <TapRow icon="download-outline"        label="Export My Data"      sub="Download personal records"    onPress={() => setDataExportModal(true)} color="#0984E3" />
          {canDo("admin") && (
            <TapRow icon="cloud-download-outline" label="Backup Church Data" sub="Export full church database"  onPress={() => Alert.alert("Backup", "Backup initiated. Download link will be emailed.")} color="#00B894" />
          )}
          <TapRow icon="trash-outline"           label="Clear Local Cache"   sub="Remove offline device data"  onPress={() => setClearDataModal(true)} color="#e74c3c" />
        </View>

        {/* ── ABOUT ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <TapRow icon="information-circle-outline" label="About ChurchCare" sub="Version 1.0.0 · Built with ❤️"   onPress={() => setAboutModal(true)} color="#4B3F72" badge="v1.0" />
          <TapRow icon="star-outline"               label="Rate the App"     sub="Leave a review"                   onPress={() => Alert.alert("Thank you!", "Redirecting to App Store…")} color="#D97706" />
          <TapRow icon="document-text-outline"      label="Terms of Service" sub="Read our terms"                   onPress={() => Alert.alert("Terms of Service", "By using ChurchCare, you agree to our terms.")} color="#0984E3" />
          <TapRow icon="mail-outline"               label="Contact Support"  sub="Get help from our team"           onPress={() => Alert.alert("Contact Support", "Email: support@churchcare.app")} color="#00B894" />
        </View>

        {/* ── ACCOUNT ── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <TapRow icon="log-out-outline" label="Sign Out" sub="Log out of this device" onPress={() => setSignOutModal(true)} danger />
        </View>

      </ScrollView>

      {/* ══ PROFILE MODAL (with photo upload) ══ */}
      <ModalSheet visible={profileModal} onClose={() => setProfileModal(false)}>
        <Text style={styles.modalTitle}>Edit Profile</Text>

        {/* Photo section */}
        <TouchableOpacity style={styles.photoSection} onPress={handlePhotoOptions}>
          {uploadingPhoto ? (
            <View style={styles.avatarLg}><ActivityIndicator color="#fff" /></View>
          ) : profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatarLgImg} />
          ) : (
            <View style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{USER_NAME.split(" ").map(n=>n[0]).join("").toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
          </View>
          <Text style={styles.photoHint}>Tap to change photo</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Full Name</Text>
        <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Your name" />

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" />

        <View style={[styles.roleInfoBox, { borderColor: roleBadgeColor }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={roleBadgeColor} />
          <Text style={[styles.roleInfoText, { color: roleBadgeColor }]}>
            Role: <Text style={{ fontWeight: "800" }}>{USER_ROLE.toUpperCase()}</Text> — changes require an admin.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveProfile}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Save Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelTxt} onPress={() => setProfileModal(false)}>
          <Text style={styles.cancelTxtText}>Cancel</Text>
        </TouchableOpacity>
      </ModalSheet>

      {/* ══ QR CODE GENERATOR MODAL ══ */}
      <Modal visible={qrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "92%" }]}>
            <View style={styles.handleRow}><View style={styles.handle} /></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>QR Code Generator</Text>
              <Text style={styles.modalSub}>Generate dynamic QR codes for church activities</Text>

              {!qrGenerated ? (
                <>
                  {/* QR Type selector */}
                  <Text style={styles.fieldLabel}>QR Code Type</Text>
                  <View style={styles.qrTypeGrid}>
                    {QR_TYPES.map(type => (
                      <TouchableOpacity key={type.key}
                        style={[styles.qrTypeCard, qrType.key === type.key && { borderColor: type.color, backgroundColor: type.color + "10" }]}
                        onPress={() => { setQrType(type); setQrLabel(""); }}>
                        <View style={[styles.qrTypeIcon, { backgroundColor: type.color + "20" }]}>
                          <Ionicons name={type.icon} size={18} color={type.color} />
                        </View>
                        <Text style={[styles.qrTypeLabel, qrType.key === type.key && { color: type.color, fontWeight: "800" }]}
                          numberOfLines={2}>{type.label}</Text>
                        {qrType.key === type.key && (
                          <View style={[styles.qrTypeCheck, { backgroundColor: type.color }]}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Dynamic label input */}
                  {(qrType.key === "event" || qrType.key === "custom") && (
                    <>
                      <Text style={styles.fieldLabel}>
                        {qrType.key === "event" ? "Event Name *" : "Custom URL or Text *"}
                      </Text>
                      <TextInput style={styles.input}
                        placeholder={qrType.key === "event" ? "e.g. Youth Conference 2025" : "https://yourlink.com or any text"}
                        value={qrLabel} onChangeText={setQrLabel} autoCapitalize="none" />
                    </>
                  )}

                  {/* Church tag */}
                  <View style={styles.qrChurchTag}>
                    <Ionicons name="business-outline" size={13} color="#4B3F72" />
                    <Text style={styles.qrChurchTagText}>{CHURCH_NAME} · {CHURCH_ID}</Text>
                  </View>

                  <Text style={styles.qrNote}>
                    Each QR code is uniquely tied to your church ID. Attendance QR codes include a timestamp for security.
                  </Text>

                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: qrType.color }]} onPress={generateQR}>
                    <Ionicons name="qr-code-outline" size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>Generate QR Code</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Generated QR display */}
                  <View style={styles.qrResult}>
                    <View style={[styles.qrResultBadge, { backgroundColor: qrType.color + "18" }]}>
                      <Ionicons name={qrType.icon} size={14} color={qrType.color} />
                      <Text style={[styles.qrResultBadgeText, { color: qrType.color }]}>{qrType.label}</Text>
                    </View>

                    {/* QR placeholder — replace with <QRCode value={qrValue} size={180} /> from react-native-qrcode-svg */}
                    <View style={styles.qrDisplay}>
                      <Ionicons name="qr-code-outline" size={130} color="#4B3F72" />
                      <Text style={styles.qrInstall}>Install react-native-qrcode-svg{"\n"}for live QR rendering</Text>
                    </View>

                    <Text style={styles.qrChurchLabel}>{CHURCH_NAME}</Text>
                    <Text style={styles.qrTypeDisplay}>{qrType.label}</Text>
                    {qrLabel ? <Text style={styles.qrSubLabel}>{qrLabel}</Text> : null}

                    <View style={styles.qrValueBox}>
                      <Text style={styles.qrValueLabel}>QR Data</Text>
                      <Text style={styles.qrValueText} selectable numberOfLines={3}>{qrValue}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.qrActions}>
                    <TouchableOpacity style={[styles.qrActionBtn, { backgroundColor: "#4B3F72" }]} onPress={shareQR}>
                      <Ionicons name="share-outline" size={16} color="#fff" />
                      <Text style={styles.qrActionBtnText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.qrActionBtn, { backgroundColor: "#0984E3" }]}
                      onPress={() => Alert.alert("Saved", "QR image saved to your gallery.")}>
                      <Ionicons name="download-outline" size={16} color="#fff" />
                      <Text style={styles.qrActionBtnText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.qrActionBtn, { backgroundColor: "#00B894" }]}
                      onPress={() => Alert.alert("Printed", "Sending to printer…")}>
                      <Ionicons name="print-outline" size={16} color="#fff" />
                      <Text style={styles.qrActionBtnText}>Print</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#888", marginTop: 8 }]} onPress={resetQR}>
                    <Ionicons name="refresh-outline" size={15} color="#fff" />
                    <Text style={styles.primaryBtnText}>Generate Another</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.cancelTxt} onPress={() => setQrModal(false)}>
                <Text style={styles.cancelTxtText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ MEMBER ACCOUNT STATUS MODAL ══ */}
      <ModalSheet visible={accountStatusModal} onClose={() => setAccountStatusModal(false)}>
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Ionicons
            name={statusAction === "deactivate" ? "person-remove" : "person-add"}
            size={36}
            color={statusAction === "deactivate" ? "#e74c3c" : "#00B894"}
          />
        </View>
        <Text style={styles.modalTitle}>
          {statusAction === "deactivate" ? "Deactivate Member Account" : "Reinstate Member Account"}
        </Text>
        <Text style={styles.modalSub}>
          {statusAction === "deactivate"
            ? "The member will lose access to the app. A reason must be recorded."
            : "Restore the member's access to the app. A reason must be recorded."
          }
        </Text>

        <View style={styles.accountStatusBadge}>
          <View style={[styles.statusDot, { backgroundColor: accountStatus === "active" ? "#00B894" : "#e74c3c" }]} />
          <Text style={styles.accountStatusText}>
            Current status: <Text style={{ fontWeight: "800" }}>{accountStatus.toUpperCase()}</Text>
          </Text>
        </View>

        <Text style={styles.fieldLabel}>
          {statusAction === "deactivate" ? "Reason for Deactivation *" : "Reason for Reinstatement *"}
        </Text>
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: "top" }]}
          placeholder={statusAction === "deactivate"
            ? "e.g. Disciplinary action, extended leave, false information…"
            : "e.g. Issue resolved, membership restored after review…"}
          value={statusAction === "deactivate" ? deactivateReason : reinstateReason}
          onChangeText={statusAction === "deactivate" ? setDeactivateReason : setReinstateReason}
          multiline
        />

        <View style={styles.accountWarning}>
          <Ionicons name="information-circle-outline" size={14} color="#D97706" />
          <Text style={styles.accountWarningText}>
            This action is logged with your name, timestamp, and reason for audit purposes.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: statusAction === "deactivate" ? "#e74c3c" : "#00B894" }]}
          onPress={confirmAccountAction}>
          <Ionicons name={statusAction === "deactivate" ? "lock-closed-outline" : "lock-open-outline"} size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {statusAction === "deactivate" ? "Confirm Deactivation" : "Confirm Reinstatement"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelTxt} onPress={() => setAccountStatusModal(false)}>
          <Text style={styles.cancelTxtText}>Cancel</Text>
        </TouchableOpacity>
      </ModalSheet>

      {/* ══ PIN MODAL ══ */}
      <ModalSheet visible={pinModal} onClose={() => setPinModal(false)}>
        <Text style={styles.modalTitle}>Change Admin PIN</Text>
        <Text style={styles.modalSub}>Your PIN locks/unlocks attendance after service ends.</Text>
        {[["Current PIN","password",oldPin,setOldPin],["New PIN","numeric-pad",newPin,setNewPin],["Confirm PIN","numeric-pad",confirmPin,setConfirmPin]].map(([label,kb,val,setter]) => (
          <View key={label}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput style={styles.input} secureTextEntry keyboardType={kb} value={val} onChangeText={setter} placeholder="••••" maxLength={8} />
          </View>
        ))}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePin}><Text style={styles.primaryBtnText}>Update PIN</Text></TouchableOpacity>
        <TouchableOpacity style={styles.cancelTxt} onPress={() => setPinModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
      </ModalSheet>

      {/* ══ CHURCH INFO MODAL ══ */}
      <ModalSheet visible={churchInfoModal} onClose={() => setChurchInfoModal(false)}>
        <Text style={styles.modalTitle}>Church Information</Text>
        {[["Church Name",editChurchName,setEditChurchName],["Address",editChurchAddr,setEditChurchAddr],["Phone",editChurchPhone,setEditChurchPhone],["Website",editChurchWeb,setEditChurchWeb]].map(([label,val,setter]) => (
          <View key={label}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput style={styles.input} value={val} onChangeText={setter} placeholder={label} />
          </View>
        ))}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveChurchInfo}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
        <TouchableOpacity style={styles.cancelTxt} onPress={() => setChurchInfoModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
      </ModalSheet>

      {/* ══ FONT SIZE MODAL ══ */}
      <Modal visible={fontModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={[styles.modalSheet,{paddingBottom:20}]}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <Text style={styles.modalTitle}>Font Size</Text>
          {["small","medium","large"].map(size => (
            <TouchableOpacity key={size} style={[styles.choiceRow, fontSize===size&&styles.choiceRowActive]}
              onPress={() => { setFontSize(size); setFontModal(false); }}>
              <Text style={[styles.choiceText, {fontSize:size==="small"?12:size==="medium"?14:17}, fontSize===size&&{color:"#4B3F72",fontWeight:"800"}]}>
                {size.charAt(0).toUpperCase()+size.slice(1)} — Sample text
              </Text>
              {fontSize===size && <Ionicons name="checkmark-circle" size={18} color="#4B3F72"/>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelTxt} onPress={() => setFontModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* ══ LANGUAGE MODAL ══ */}
      <Modal visible={langModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={[styles.modalSheet,{paddingBottom:20}]}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <Text style={styles.modalTitle}>Language</Text>
          {["English","Twi","Ga","Hausa","French"].map(lang => (
            <TouchableOpacity key={lang} style={[styles.choiceRow, language===lang&&styles.choiceRowActive]}
              onPress={() => { setLanguage(lang); setLangModal(false); }}>
              <Text style={[styles.choiceText, language===lang&&{color:"#4B3F72",fontWeight:"800"}]}>{lang}</Text>
              {language===lang && <Ionicons name="checkmark-circle" size={18} color="#4B3F72"/>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelTxt} onPress={() => setLangModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* ══ ABOUT MODAL ══ */}
      <Modal visible={aboutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalSheet}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <View style={{ alignItems:"center", marginBottom:16 }}>
            <View style={styles.aboutIcon}><Ionicons name="church-outline" size={36} color="#4B3F72"/></View>
            <Text style={styles.aboutTitle}>ChurchCare</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          </View>
          <Text style={styles.aboutText}>A complete church management platform for attendance, members, finances, and communications.</Text>
          <View style={styles.aboutDivider}/>
          <Text style={styles.aboutText}>Built with ❤️ for the body of Christ.</Text>
          <TouchableOpacity style={[styles.primaryBtn,{marginTop:16}]} onPress={() => setAboutModal(false)}><Text style={styles.primaryBtnText}>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* ══ CLEAR DATA ══ */}
      <Modal visible={clearDataModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalSheet}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <View style={{alignItems:"center",marginBottom:12}}><Ionicons name="warning" size={36} color="#e74c3c"/></View>
          <Text style={styles.modalTitle}>Clear Local Data?</Text>
          <Text style={styles.modalSub}>Removes offline cached data. Server data is not affected.</Text>
          <TouchableOpacity style={[styles.primaryBtn,{backgroundColor:"#e74c3c"}]} onPress={handleClearData}><Text style={styles.primaryBtnText}>Yes, Clear Data</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelTxt} onPress={() => setClearDataModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* ══ SIGN OUT ══ */}
      <Modal visible={signOutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalSheet}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <View style={{alignItems:"center",marginBottom:12}}><Ionicons name="log-out" size={36} color="#e74c3c"/></View>
          <Text style={styles.modalTitle}>Sign Out?</Text>
          <Text style={styles.modalSub}>You will need to sign in again.</Text>
          <TouchableOpacity style={[styles.primaryBtn,{backgroundColor:"#e74c3c"}]} onPress={handleSignOut}><Text style={styles.primaryBtnText}>Yes, Sign Out</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelTxt} onPress={() => setSignOutModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* ══ DATA EXPORT ══ */}
      <Modal visible={dataExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalSheet}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <Text style={styles.modalTitle}>Export My Data</Text>
          <Text style={styles.modalSub}>Select what to include:</Text>
          {["Attendance Records","Contribution History","Profile Information","Communication Logs"].map(item => (
            <View key={item} style={styles.choiceRow}>
              <Ionicons name="checkmark-circle" size={16} color="#4B3F72"/>
              <Text style={[styles.choiceText,{marginLeft:8}]}>{item}</Text>
            </View>
          ))}
          <TouchableOpacity style={[styles.primaryBtn,{marginTop:14}]} onPress={() => { Alert.alert("Export started","Data will be emailed to "+USER_EMAIL); setDataExportModal(false); }}><Text style={styles.primaryBtnText}>Export to Email</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelTxt} onPress={() => setDataExportModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  body: { flex: 1, backgroundColor: "#f4f6fb" },

  sectionHeader: { fontSize: 11, fontWeight: "800", color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  card: { backgroundColor: "#fff", marginHorizontal: 14, borderRadius: 14, overflow: "hidden", elevation: 1 },

  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#222" },
  settingSub: { fontSize: 11, color: "#888", marginTop: 2 },
  badge: { backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // Profile card
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 14, padding: 16, borderRadius: 16, gap: 12, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "#4B3F72" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  profileName: { fontSize: 15, fontWeight: "800", color: "#222" },
  profileEmail: { fontSize: 12, color: "#888", marginTop: 2 },
  rolePill: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  roleText: { fontSize: 10, fontWeight: "800" },

  // Photo upload in profile modal
  photoSection: { alignItems: "center", marginBottom: 16, position: "relative" },
  avatarLg: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center" },
  avatarLgImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#4B3F72" },
  avatarLgText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  photoEditBadge: { position: "absolute", bottom: 20, right: "33%", width: 22, height: 22, borderRadius: 11, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  photoHint: { fontSize: 11, color: "#4B3F72", fontWeight: "600", marginTop: 6 },

  // QR Generator
  qrTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  qrTypeCard: { width: "30%", backgroundColor: "#f9f9f9", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1.5, borderColor: "#eee", position: "relative" },
  qrTypeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  qrTypeLabel: { fontSize: 10, fontWeight: "600", color: "#555", textAlign: "center" },
  qrTypeCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qrChurchTag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF0FA", borderRadius: 10, padding: 10, marginBottom: 8 },
  qrChurchTagText: { fontSize: 12, color: "#4B3F72", fontWeight: "600" },
  qrNote: { fontSize: 11, color: "#888", lineHeight: 17, marginBottom: 12 },
  qrResult: { alignItems: "center", paddingVertical: 8 },
  qrResultBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  qrResultBadgeText: { fontSize: 12, fontWeight: "700" },
  qrDisplay: { width: 200, height: 200, backgroundColor: "#f5f5f5", borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#eee", borderStyle: "dashed", marginBottom: 12 },
  qrInstall: { fontSize: 10, color: "#bbb", textAlign: "center", marginTop: 6, lineHeight: 15 },
  qrChurchLabel: { fontSize: 14, fontWeight: "800", color: "#222" },
  qrTypeDisplay: { fontSize: 12, color: "#4B3F72", fontWeight: "600", marginTop: 2 },
  qrSubLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  qrValueBox: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, marginTop: 10, width: "100%" },
  qrValueLabel: { fontSize: 10, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginBottom: 4 },
  qrValueText: { fontSize: 11, color: "#555", lineHeight: 16 },
  qrActions: { flexDirection: "row", gap: 8, marginTop: 14, width: "100%" },
  qrActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 10, padding: 11, gap: 5 },
  qrActionBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Account status
  accountStatusBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, marginBottom: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  accountStatusText: { fontSize: 13, color: "#333" },
  accountWarning: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFFBEB", borderRadius: 10, padding: 10, marginTop: 10 },
  accountWarningText: { flex: 1, fontSize: 11, color: "#D97706", lineHeight: 17 },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  handleRow: { alignItems: "center", marginBottom: 12 },
  handle: { width: 36, height: 4, backgroundColor: "#ddd", borderRadius: 2 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#222", marginBottom: 4, textAlign: "center" },
  modalSub: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 14, lineHeight: 18 },

  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12, fontSize: 13, color: "#222", borderWidth: 1.5, borderColor: "#eee" },

  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", borderRadius: 12, padding: 14, marginTop: 12, gap: 6 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cancelTxt: { alignItems: "center", padding: 12, marginTop: 4 },
  cancelTxtText: { color: "#888", fontSize: 13 },

  choiceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  choiceRowActive: { backgroundColor: "#EEF0FA", borderRadius: 8, paddingHorizontal: 8 },
  choiceText: { fontSize: 14, color: "#333" },

  roleInfoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1.5, borderRadius: 10, padding: 10, marginTop: 10, backgroundColor: "#fafafa" },
  roleInfoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  aboutIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#EEF0FA", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  aboutTitle: { fontSize: 20, fontWeight: "800", color: "#222" },
  aboutVersion: { fontSize: 12, color: "#888", marginTop: 2 },
  aboutText: { fontSize: 13, color: "#555", lineHeight: 20, textAlign: "center" },
  aboutDivider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 },
});