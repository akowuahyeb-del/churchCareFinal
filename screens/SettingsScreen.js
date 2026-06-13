import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Modal, TextInput, Alert, SafeAreaView, StatusBar,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// ── Role simulation (replace with auth context) ───────────────────
const USER_ROLE  = "admin"; // admin | pastor | elder | deacon | member
const USER_NAME  = "Kwame Mensah";
const USER_EMAIL = "kwame@churchcare.app";

const ROLE_LEVEL = { admin: 5, pastor: 4, elder: 3, deacon: 2, member: 1 };
const canDo = (minRole) => ROLE_LEVEL[USER_ROLE] >= ROLE_LEVEL[minRole];

// ── Setting toggle row ─────────────────────────────────────────────
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
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#ddd", true: color }}
        thumbColor="#fff"
      />
    </View>
  );
}

// ── Tappable setting row ──────────────────────────────────────────
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

// ── Section header ────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const navigation = useNavigation();

  /* ── Notification settings ── */
  const [notifService,     setNotifService]     = useState(true);
  const [notifAnnounce,    setNotifAnnounce]    = useState(true);
  const [notifAttendance,  setNotifAttendance]  = useState(false);
  const [notifFinance,     setNotifFinance]     = useState(false);
  const [notifBirthday,    setNotifBirthday]    = useState(true);
  const [notifPrayer,      setNotifPrayer]      = useState(true);

  /* ── Display settings ── */
  const [darkMode,    setDarkMode]    = useState(false);
  const [fontSize,    setFontSize]    = useState("medium"); // small|medium|large
  const [language,    setLanguage]    = useState("English");
  const [offlineMode, setOfflineMode] = useState(false);

  /* ── Privacy & security ── */
  const [biometric,    setBiometric]    = useState(false);
  const [profilePublic,setProfilePublic]= useState(true);
  const [showPhone,    setShowPhone]    = useState(false);

  /* ── Admin controls ── */
  const [registrationOpen,   setRegistrationOpen]   = useState(true);
  const [guestAttendance,    setGuestAttendance]    = useState(true);
  const [autoLockService,    setAutoLockService]    = useState(true);
  const [requireApproval,    setRequireApproval]    = useState(true);
  const [maintenanceMode,    setMaintenanceMode]    = useState(false);

  /* ── Modals ── */
  const [pinModal,         setPinModal]         = useState(false);
  const [oldPin,           setOldPin]           = useState("");
  const [newPin,           setNewPin]           = useState("");
  const [confirmPin,       setConfirmPin]       = useState("");
  const [profileModal,     setProfileModal]     = useState(false);
  const [editName,         setEditName]         = useState(USER_NAME);
  const [editEmail,        setEditEmail]        = useState(USER_EMAIL);
  const [fontModal,        setFontModal]        = useState(false);
  const [langModal,        setLangModal]        = useState(false);
  const [aboutModal,       setAboutModal]       = useState(false);
  const [churchInfoModal,  setChurchInfoModal]  = useState(false);
  const [churchName,       setChurchName]       = useState("Grace Community Church");
  const [churchAddress,    setChurchAddress]    = useState("123 Faith Avenue, Accra");
  const [churchPhone,      setChurchPhone]      = useState("+233 20 123 4567");
  const [churchWebsite,    setChurchWebsite]    = useState("www.gracechurch.org");
  const [clearDataModal,   setClearDataModal]   = useState(false);
  const [signOutModal,     setSignOutModal]     = useState(false);
  const [dataExportModal,  setDataExportModal]  = useState(false);

  const handleSavePin = () => {
    if (!oldPin) { Alert.alert("Enter current PIN"); return; }
    if (newPin.length < 4) { Alert.alert("PIN must be at least 4 digits"); return; }
    if (newPin !== confirmPin) { Alert.alert("PINs do not match"); return; }
    Alert.alert("✅ PIN updated successfully");
    setPinModal(false); setOldPin(""); setNewPin(""); setConfirmPin("");
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) { Alert.alert("Name is required"); return; }
    Alert.alert("✅ Profile updated");
    setProfileModal(false);
  };

  const handleSaveChurchInfo = () => {
    Alert.alert("✅ Church info updated");
    setChurchInfoModal(false);
  };

  const handleClearData = () => {
    Alert.alert("✅ Local data cleared");
    setClearDataModal(false);
  };

  const handleSignOut = () => {
    Alert.alert("Signed out");
    setSignOutModal(false);
  };

  const roleBadgeColor = { admin:"#4B3F72", pastor:"#0984E3", elder:"#00B894", deacon:"#FDCB6E", member:"#aaa" }[USER_ROLE] || "#aaa";

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />
      <View style={styles.topSpacer} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
  style={styles.backBtn}
  onPress={() =>
    navigation.navigate("MainTabs", { screen: "Home" })
  }
  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 6 }}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>App preferences & controls</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── PROFILE CARD ── */}
        <TouchableOpacity style={styles.profileCard} onPress={() => setProfileModal(true)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{USER_NAME.split(" ").map(n => n[0]).join("").toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{USER_NAME}</Text>
            <Text style={styles.profileEmail}>{USER_EMAIL}</Text>
            <View style={[styles.rolePill, { backgroundColor: roleBadgeColor + "22" }]}>
              <Text style={[styles.roleText, { color: roleBadgeColor }]}>{USER_ROLE.toUpperCase()}</Text>
            </View>
          </View>
          <Ionicons name="create-outline" size={18} color="#4B3F72" />
        </TouchableOpacity>

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <ToggleRow icon="megaphone-outline"    label="Service Announcements" sub="Get notified of upcoming services"     value={notifService}    onChange={setNotifService}    color="#4B3F72" />
          <ToggleRow icon="notifications-outline" label="General Announcements" sub="Church notices and updates"          value={notifAnnounce}   onChange={setNotifAnnounce}   color="#0984E3" />
          <ToggleRow icon="calendar-outline"      label="Attendance Reminders"  sub="Reminders before service"            value={notifAttendance} onChange={setNotifAttendance} color="#00B894" disabled={!canDo("deacon")} />
          <ToggleRow icon="cash-outline"          label="Financial Alerts"      sub="Donation confirmations & reports"    value={notifFinance}    onChange={setNotifFinance}    color="#D97706" disabled={!canDo("elder")} />
          <ToggleRow icon="gift-outline"          label="Birthday Wishes"       sub="Auto-send birthday messages"         value={notifBirthday}   onChange={setNotifBirthday}   color="#E11D48" />
          <ToggleRow icon="prism-outline"         label="Prayer Requests"       sub="Notify when prayer requests are added" value={notifPrayer}   onChange={setNotifPrayer}     color="#6C5CE7" />
        </View>

        {/* ── DISPLAY ── */}
        <SectionHeader title="Display & Appearance" />
        <View style={styles.card}>
          <ToggleRow icon="moon-outline"   label="Dark Mode"    sub="Switch to dark theme"          value={darkMode}    onChange={setDarkMode}    color="#222" />
          <TapRow    icon="text-outline"   label="Font Size"    sub={`Current: ${fontSize}`}        onPress={() => setFontModal(true)}            color="#4B3F72" />
          <TapRow    icon="language-outline" label="Language"   sub={`Current: ${language}`}        onPress={() => setLangModal(true)}            color="#0984E3" />
          <ToggleRow icon="cloud-offline-outline" label="Offline Mode" sub="Cache data for offline access" value={offlineMode} onChange={setOfflineMode} color="#888" />
        </View>

        {/* ── PRIVACY & SECURITY ── */}
        <SectionHeader title="Privacy & Security" />
        <View style={styles.card}>
          <ToggleRow icon="finger-print-outline"  label="Biometric Login"        sub="Use fingerprint or Face ID"                value={biometric}     onChange={setBiometric}     color="#4B3F72" />
          <ToggleRow icon="eye-outline"           label="Public Profile"          sub="Allow other members to see your profile"   value={profilePublic} onChange={setProfilePublic} color="#0984E3" />
          <ToggleRow icon="call-outline"          label="Show Phone Number"       sub="Visible to church leaders"                 value={showPhone}     onChange={setShowPhone}     color="#00B894" />
          <TapRow    icon="key-outline"           label="Change Admin PIN"        sub="Update your attendance lock PIN"           onPress={() => setPinModal(true)} color="#D97706" />
          <TapRow    icon="shield-checkmark-outline" label="Data & Privacy Policy" sub="View how your data is used"             onPress={() => Alert.alert("Privacy Policy", "Your data is securely stored and never shared with third parties.")} color="#6C5CE7" />
        </View>

        {/* ── CHURCH INFORMATION (admin/pastor only) ── */}
        {canDo("pastor") && (
          <>
            <SectionHeader title="Church Information" />
            <View style={styles.card}>
              <TapRow icon="business-outline"  label="Church Details"     sub="Name, address, contact info" onPress={() => setChurchInfoModal(true)} color="#4B3F72" />
              <TapRow icon="people-outline"    label="Manage Roles"       sub="Assign roles to members"    onPress={() => Alert.alert("Manage Roles", "Role management is available in the Members section.")} color="#0984E3" />
              <TapRow icon="git-branch-outline" label="Manage Branches"   sub="Add or edit church branches" onPress={() => Alert.alert("Coming Soon", "Branch management is coming in a future update.")} color="#00B894" />
            </View>
          </>
        )}

        {/* ── ADMIN CONTROLS (admin only) ── */}
        {canDo("admin") && (
          <>
            <SectionHeader title="Admin Controls" />
            <View style={styles.card}>
              <ToggleRow icon="person-add-outline"  label="Open Registration"    sub="Allow new member registration"           value={registrationOpen} onChange={setRegistrationOpen} color="#4B3F72" />
              <ToggleRow icon="walk-outline"        label="Guest Attendance"     sub="Allow guests to mark attendance"         value={guestAttendance}  onChange={setGuestAttendance}  color="#0984E3" />
              <ToggleRow icon="lock-closed-outline" label="Auto-Lock Service"    sub="Lock attendance when service ends"       value={autoLockService}  onChange={setAutoLockService}  color="#D97706" />
              <ToggleRow icon="shield-outline"      label="Require Approval"     sub="Major actions need multi-role approval"  value={requireApproval}  onChange={setRequireApproval}  color="#6C5CE7" />
              <ToggleRow icon="construct-outline"   label="Maintenance Mode"     sub="Restrict app access for all users"       value={maintenanceMode}  onChange={(v) => {
                if (v) Alert.alert("⚠️ Maintenance Mode", "This will restrict access for all users. Continue?", [
                  { text: "Cancel" },
                  { text: "Enable", style: "destructive", onPress: () => setMaintenanceMode(true) }
                ]);
                else setMaintenanceMode(false);
              }} color="#e74c3c" />
            </View>
          </>
        )}

        {/* ── DATA MANAGEMENT ── */}
        <SectionHeader title="Data Management" />
        <View style={styles.card}>
          <TapRow icon="download-outline"    label="Export My Data"      sub="Download your personal records"     onPress={() => setDataExportModal(true)} color="#0984E3" />
          {canDo("admin") && (
            <TapRow icon="cloud-download-outline" label="Backup Church Data" sub="Export full church database"   onPress={() => Alert.alert("Backup", "Backup initiated. You will receive a download link.")} color="#00B894" />
          )}
          <TapRow icon="trash-outline"       label="Clear Local Cache"   sub="Remove offline data from device"  onPress={() => setClearDataModal(true)}  color="#e74c3c" />
        </View>

        {/* ── ABOUT ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <TapRow icon="information-circle-outline" label="About ChurchCare" sub="Version 1.0.0 · Built with ❤️"    onPress={() => setAboutModal(true)}                                                                    color="#4B3F72" badge="v1.0" />
          <TapRow icon="star-outline"               label="Rate the App"     sub="Leave a review on the app store"  onPress={() => Alert.alert("Thank you!", "Redirecting to App Store…")}                                color="#D97706" />
          <TapRow icon="document-text-outline"      label="Terms of Service" sub="Read our terms and conditions"    onPress={() => Alert.alert("Terms of Service", "By using ChurchCare, you agree to our terms.")}       color="#0984E3" />
          <TapRow icon="mail-outline"               label="Contact Support"  sub="Get help from our team"           onPress={() => Alert.alert("Contact Support", "Email: support@churchcare.app\nPhone: +233 20 000 0000")} color="#00B894" />
        </View>

        {/* ── ACCOUNT ── */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <TapRow icon="log-out-outline" label="Sign Out" sub="Log out of this device" onPress={() => setSignOutModal(true)} danger />
        </View>

      </ScrollView>

      {/* ══ PIN MODAL ══ */}
      <Modal visible={pinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Change Admin PIN</Text>
            <Text style={styles.modalSub}>Your PIN locks/unlocks attendance after service ends.</Text>
            {[["Current PIN","password",oldPin,setOldPin],["New PIN","numeric-pad",newPin,setNewPin],["Confirm New PIN","numeric-pad",confirmPin,setConfirmPin]].map(([label,kb,val,setter]) => (
              <View key={label}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput style={styles.input} secureTextEntry keyboardType={kb} value={val} onChangeText={setter} placeholder="••••" maxLength={8} />
              </View>
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePin}><Text style={styles.primaryBtnText}>Update PIN</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setPinModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ PROFILE MODAL ══ */}
      <Modal visible={profileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Your name" />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="your@email.com" keyboardType="email-address" />
            <View style={[styles.roleInfoBox, { borderColor: roleBadgeColor }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={roleBadgeColor} />
              <Text style={[styles.roleInfoText, { color: roleBadgeColor }]}>Your role is <Text style={{ fontWeight: "800" }}>{USER_ROLE.toUpperCase()}</Text>. Role changes must be made by an admin.</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveProfile}><Text style={styles.primaryBtnText}>Save Profile</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setProfileModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ CHURCH INFO MODAL ══ */}
      <Modal visible={churchInfoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Church Information</Text>
            {[["Church Name",churchName,setChurchName],["Address",churchAddress,setChurchAddress],["Phone",churchPhone,setChurchPhone],["Website",churchWebsite,setChurchWebsite]].map(([label,val,setter]) => (
              <View key={label}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput style={styles.input} value={val} onChangeText={setter} placeholder={label} />
              </View>
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveChurchInfo}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setChurchInfoModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ FONT SIZE MODAL ══ */}
      <Modal visible={fontModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 20 }]}>
            <Text style={styles.modalTitle}>Font Size</Text>
            {["small","medium","large"].map(size => (
              <TouchableOpacity key={size} style={[styles.choiceRow, fontSize===size && styles.choiceRowActive]}
                onPress={() => { setFontSize(size); setFontModal(false); }}>
                <Text style={[styles.choiceText, { fontSize: size==="small"?12:size==="medium"?14:17 }, fontSize===size&&{color:"#4B3F72",fontWeight:"800"}]}>
                  {size.charAt(0).toUpperCase()+size.slice(1)} — Sample text
                </Text>
                {fontSize===size && <Ionicons name="checkmark-circle" size={18} color="#4B3F72"/>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setFontModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ LANGUAGE MODAL ══ */}
      <Modal visible={langModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: 20 }]}>
            <Text style={styles.modalTitle}>Language</Text>
            {["English","Twi","Ga","Hausa","French"].map(lang => (
              <TouchableOpacity key={lang} style={[styles.choiceRow, language===lang && styles.choiceRowActive]}
                onPress={() => { setLanguage(lang); setLangModal(false); }}>
                <Text style={[styles.choiceText, language===lang&&{color:"#4B3F72",fontWeight:"800"}]}>{lang}</Text>
                {language===lang && <Ionicons name="checkmark-circle" size={18} color="#4B3F72"/>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setLangModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ ABOUT MODAL ══ */}
      <Modal visible={aboutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={styles.aboutIcon}><Ionicons name="church-outline" size={36} color="#4B3F72"/></View>
              <Text style={styles.aboutTitle}>ChurchCare</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            </View>
            <Text style={styles.aboutText}>ChurchCare is a complete church management platform built to help churches manage attendance, members, finances, and communications all in one place.</Text>
            <View style={styles.aboutDivider}/>
            <Text style={styles.aboutText}>Built with ❤️ for the body of Christ.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => setAboutModal(false)}><Text style={styles.primaryBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ CLEAR DATA MODAL ══ */}
      <Modal visible={clearDataModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems: "center", marginBottom: 12 }}><Ionicons name="warning" size={36} color="#e74c3c"/></View>
            <Text style={styles.modalTitle}>Clear Local Data?</Text>
            <Text style={styles.modalSub}>This removes offline cached data from your device. Your data on the server will not be affected.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#e74c3c" }]} onPress={handleClearData}><Text style={styles.primaryBtnText}>Yes, Clear Data</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setClearDataModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ SIGN OUT MODAL ══ */}
      <Modal visible={signOutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems: "center", marginBottom: 12 }}><Ionicons name="log-out" size={36} color="#e74c3c"/></View>
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalSub}>You will need to sign in again to access the app.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#e74c3c" }]} onPress={handleSignOut}><Text style={styles.primaryBtnText}>Yes, Sign Out</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setSignOutModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ DATA EXPORT MODAL ══ */}
      <Modal visible={dataExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Export My Data</Text>
            <Text style={styles.modalSub}>Choose what to include in your export:</Text>
            {["Attendance Records","Contribution History","Profile Information","Communication Logs"].map(item => (
              <View key={item} style={styles.choiceRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4B3F72"/>
                <Text style={[styles.choiceText, { marginLeft: 8 }]}>{item}</Text>
              </View>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 14 }]} onPress={() => { Alert.alert("Export started", "Your data will be emailed to "+USER_EMAIL); setDataExportModal(false); }}><Text style={styles.primaryBtnText}>Export to Email</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelTxt} onPress={() => setDataExportModal(false)}><Text style={styles.cancelTxtText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },
  
header: {
  flexDirection: "row",
  alignItems: "center",
  paddingLeft: 20,
  paddingRight: 14,
  paddingBottom: 12,
  paddingTop: Platform.OS === "android" ? 18 : 10, 
},
  backBtn: {
  width: 40,            
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.15)",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},
  headerTitle: {
  color: "#fff",
  fontSize: 17,
  fontWeight: "800",
  letterSpacing: 0.3,   
},

  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 11 },

  body: { flex: 1, backgroundColor: "#f4f6fb" },

  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 14, padding: 16, borderRadius: 16, gap: 12, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  profileName: { fontSize: 15, fontWeight: "800", color: "#222" },
  profileEmail: { fontSize: 12, color: "#888", marginTop: 2 },
  rolePill: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  roleText: { fontSize: 10, fontWeight: "800" },

  sectionHeader: { fontSize: 11, fontWeight: "800", color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },

  card: { backgroundColor: "#fff", marginHorizontal: 14, borderRadius: 14, overflow: "hidden", elevation: 1 },

  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", gap: 12 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#222" },
  settingSub: { fontSize: 11, color: "#888", marginTop: 2 },
  badge: { backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
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
