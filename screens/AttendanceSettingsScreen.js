// screens/AttendanceSettingsScreen.js
//
// ✅ Replaces every hardcoded attendance constant in AttendanceScreen.js
// with values that live in Firestore and update in real time. A church
// in Tamale and a church in Accra now have different geo coordinates
// and can tune their own absence thresholds — not share one hardcoded
// set of values compiled into the app.
//
// All settings are stored at:
// organizations/{orgId}/entities/{entityId}/settings/attendanceSettings
//
// AttendanceScreen reads from this doc via useAttendanceSettings() hook
// (see file 2 below).

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AppHeader from "../components/AppHeader";
import DateTimePicker from "@react-native-community/datetimepicker";

// ─────────────────────────────────────────────────────────────────
// DEFAULTS — what a brand-new entity gets before an admin configures it
// ─────────────────────────────────────────────────────────────────
export const ATTENDANCE_SETTINGS_DEFAULTS = {
  // Geo
  geoEnabled:           true,
  geoRadiusMeters:      150,
  geoLatitude:          5.6037,    // Accra fallback
  geoLongitude:         -0.1870,
  geoAddress:           "",

  // Session defaults
  defaultService:       "Sunday",
  defaultType:          "First Service",
  defaultStartTime:     "9:00 AM",
  defaultEvent:         "None",
  // Dynamic master data
serviceOptions: [
  "Sunday",
  "Wednesday",
  "Friday",
  "Saturday",
  "Special",
],

typeOptions: [
  "First Service",
  "Second Service",
  "Third Service",
  "Evening Service",
  "Youth",
  "Children",
],

timeOptions: [
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "6:00 PM",
],

  // Absence alerts
  absenceWarningCount:  2,         // contacts modal after this many absences
  absenceFlagCount:     3,         // red-flag modal after this many

  // Session behaviour
  lockAfterEnd:         true,      // non-admins can't edit after session ends
  allowSelfCheckin:     true,      // Self QR mode available
  qrSessionTimeoutMins: 120,       // QR codes expire after this many minutes
  requireSessionNote:   false,     // force admin to write a note at session end

  // Offline queue
  offlineSyncEnabled:   true,
  offlineSyncIntervalSecs: 10,
};

export default function AttendanceSettingsScreen() {
  const navigation = useNavigation();

  const [activeEntity, setActiveEntity] = useState(null);
  const organizationId = activeEntity?.organizationId;
  const entityId       = activeEntity?.entityId;

  const [settings, setSettings] = useState(ATTENDANCE_SETTINGS_DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [locating, setLocating] = useState(false);
  const [dirty,    setDirty]    = useState(false); 
  // Service Defaults Modal
const [itemModalVisible, setItemModalVisible] = useState(false);

const [editingMode, setEditingMode] = useState("service");


const [editingIndex, setEditingIndex] = useState(null);

const [itemName, setItemName] = useState("");

const [timeValue, setTimeValue] = useState(new Date());

const [showTimePicker, setShowTimePicker] = useState(false);

  // ── BOOTSTRAP ──
  useEffect(() => {
    AsyncStorage.getItem("activeEntity").then(data => {
      if (data) { try { setActiveEntity(JSON.parse(data)); } catch (_) {} }
    });
  }, []);

  useEffect(() => {
    if (!organizationId || !entityId) return;
    loadSettings();
  }, [organizationId, entityId]);

  // ─────────────────────────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────────────────────────
  const loadSettings = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "settings", "attendanceSettings")
      );
      if (snap.exists()) {
        setSettings({ ...ATTENDANCE_SETTINGS_DEFAULTS, ...snap.data() });
      }
    } catch (e) {
      console.log("❌ loadSettings:", e);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────────────────────────
  const saveSettings = async () => {
    if (!organizationId || !entityId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "organizations", organizationId, "entities", entityId, "settings", "attendanceSettings"),
        { ...settings, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setDirty(false);
      Alert.alert("✅ Saved", "Attendance settings updated.");
    } catch (e) {
      Alert.alert("Error", "Could not save settings.");
      console.log("❌ saveSettings:", e);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // UPDATE HELPER — tracks dirty state
  // ─────────────────────────────────────────────────────────────────
  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };
// ─────────────────────────────────────────────────────────────────
// SESSION DEFAULT MODAL HANDLERS
// ─────────────────────────────────────────────────────────────────

const openAddService = () => {
  setEditingMode("service");
  setEditingIndex(null);
  setItemName("");
  setItemModalVisible(true);
};

const openAddType = () => {
  setEditingMode("type");
  setEditingIndex(null);
  setItemName("");
  setItemModalVisible(true);
};

const openAddTime = () => {
  setEditingMode("time");
  setEditingIndex(null);
  setTimeValue(new Date());
  setItemModalVisible(true);
};

const editItem = (mode, value, index) => {
  setEditingMode(mode);
  setEditingIndex(index);

  if (mode === "time") {
    setTimeValue(new Date());
  } else {
    setItemName(value);
  }

  setItemModalVisible(true);
};
const saveItem = () => {
  const s = { ...settings };

  if (editingMode === "service") {
    const list = [...s.serviceOptions];

    if (editingIndex === null) {
      list.push(itemName.trim());
    } else {
      list[editingIndex] = itemName.trim();
    }

    update("serviceOptions", list);

    // First item becomes default automatically
    if (!settings.defaultService && list.length > 0) {
      update("defaultService", list[0]);
    }
  }

  if (editingMode === "type") {
    const list = [...s.typeOptions];

    if (editingIndex === null) {
      list.push(itemName.trim());
    } else {
      list[editingIndex] = itemName.trim();
    }

    update("typeOptions", list);

    if (!settings.defaultType && list.length > 0) {
      update("defaultType", list[0]);
    }
  }

  if (editingMode === "time") {
    const formattedTime =
      timeValue.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

    const list = [...s.timeOptions];

    if (editingIndex === null) {
      list.push(formattedTime);
    } else {
      list[editingIndex] = formattedTime;
    }

    update("timeOptions", list);

    if (!settings.defaultStartTime && list.length > 0) {
      update("defaultStartTime", list[0]);
    }
  }

  setItemModalVisible(false);
};

const deleteItem = () => {
  const s = { ...settings };

  if (editingMode === "service") {
    const list = [...s.serviceOptions];
    list.splice(editingIndex, 1);

    update("serviceOptions", list);
  }

  if (editingMode === "type") {
    const list = [...s.typeOptions];
    list.splice(editingIndex, 1);

    update("typeOptions", list);
  }

  if (editingMode === "time") {
    const list = [...s.timeOptions];
    list.splice(editingIndex, 1);

    update("timeOptions", list);
  }

  setItemModalVisible(false);
};
  // ─────────────────────────────────────────────────────────────────
  // DETECT CURRENT GPS — so admin doesn't have to look up coordinates
  // ✅ This is the "smart" part: tap a button and your church's real
  // coordinates are filled in automatically instead of guessing.
  // ─────────────────────────────────────────────────────────────────
  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable location access to detect your church coordinates.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // Reverse geocode to get a human-readable address
      let address = "";
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        if (geocode.length > 0) {
          const g = geocode[0];
          address = [g.streetNumber, g.street, g.city, g.region]
            .filter(Boolean).join(", ");
        }
      } catch (_) {}

      setSettings(prev => ({
        ...prev,
        geoLatitude:  loc.coords.latitude,
        geoLongitude: loc.coords.longitude,
        geoAddress:   address,
      }));
      setDirty(true);

      Alert.alert(
        "✅ Location Detected",
        `Lat: ${loc.coords.latitude.toFixed(5)}\nLon: ${loc.coords.longitude.toFixed(5)}\n\n${address}\n\nSave settings to apply.`
      );
    } catch (e) {
      Alert.alert("Error", "Could not detect location.");
    } finally {
      setLocating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RADIUS PREVIEW — shows what the current radius feels like in
  // real-world terms so admins can make an informed decision
  // ─────────────────────────────────────────────────────────────────
  const radiusDescription = (r) => {
    if (r <= 50)  return "Very tight — members must be inside the building.";
    if (r <= 100) return "Building + immediate surroundings.";
    if (r <= 200) return "Entire church compound (recommended).";
    if (r <= 500) return "Church + neighbouring streets.";
    return "Very wide — reduces accuracy significantly.";
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#4B3F72" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance Settings"
        subtitle="Session & check-in configuration"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* UNSAVED CHANGES BANNER */}
      {dirty && (
        <View style={styles.dirtyBanner}>
          <Ionicons name="alert-circle-outline" size={14} color="#fff" />
          <Text style={styles.dirtyBannerText}>Unsaved changes</Text>
          <TouchableOpacity style={styles.dirtyBannerBtn} onPress={saveSettings} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.dirtyBannerBtnText}>Save Now</Text>}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ══ GEO CHECK-IN ══ */}
        <SectionHeader
          icon="location-outline"
          color="#27ae60"
          title="Geo Check-in"
          subtitle="Members must be physically at the church to be auto-marked present"
        />

        <SettingRow label="Enable Geo Check-in" description="Allow GPS-based attendance verification">
          <Switch
            value={settings.geoEnabled}
            onValueChange={v => update("geoEnabled", v)}
            trackColor={{ true: "#27ae60" }}
          />
        </SettingRow>

        {settings.geoEnabled && (
          <>
            {/* RADIUS SLIDER */}
            <View style={styles.radiusCard}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusLabel}>Geo Fence Radius</Text>
                <View style={styles.radiusValuePill}>
                  <Text style={styles.radiusValue}>{settings.geoRadiusMeters}m</Text>
                </View>
              </View>

              {/* Manual slider using preset buttons */}
              <View style={styles.radiusPresets}>
                {[50, 100, 150, 200, 300, 500].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusPreset,
                      settings.geoRadiusMeters === r && styles.radiusPresetActive
                    ]}
                    onPress={() => update("geoRadiusMeters", r)}
                  >
                    <Text style={[styles.radiusPresetText, settings.geoRadiusMeters === r && styles.radiusPresetTextActive]}>
                      {r}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.radiusCustomInput}
                placeholder="Or type a custom value in metres"
                keyboardType="numeric"
                value={settings.geoRadiusMeters.toString()}
                onChangeText={v => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n > 0 && n <= 2000) update("geoRadiusMeters", n);
                }}
              />

              <View style={styles.radiusDescBox}>
                <Ionicons name="information-circle-outline" size={13} color="#4B3F72" />
                <Text style={styles.radiusDescText}>{radiusDescription(settings.geoRadiusMeters)}</Text>
              </View>
            </View>

            {/* CHURCH COORDINATES */}
            <View style={styles.coordCard}>
              <View style={styles.coordCardHeader}>
                <Text style={styles.coordCardTitle}>Church GPS Coordinates</Text>
                <TouchableOpacity
                  style={styles.detectBtn}
                  onPress={detectLocation}
                  disabled={locating}
                >
                  {locating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="locate-outline" size={13} color="#fff" />
                        <Text style={styles.detectBtnText}>Detect Now</Text>
                      </>}
                </TouchableOpacity>
              </View>

              {settings.geoAddress ? (
                <View style={styles.addressTag}>
                  <Ionicons name="location" size={12} color="#4B3F72" />
                  <Text style={styles.addressTagText}>{settings.geoAddress}</Text>
                </View>
              ) : null}

              <View style={styles.coordRow}>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel}>Latitude</Text>
                  <TextInput
                    style={styles.coordInput}
                    value={settings.geoLatitude.toString()}
                    onChangeText={v => update("geoLatitude", parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 5.6037"
                  />
                </View>
                <View style={styles.coordField}>
                  <Text style={styles.coordLabel}>Longitude</Text>
                  <TextInput
                    style={styles.coordInput}
                    value={settings.geoLongitude.toString()}
                    onChangeText={v => update("geoLongitude", parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="e.g. -0.1870"
                  />
                </View>
              </View>

              <Text style={styles.coordHint}>
                Tip: open Google Maps, long-press your church building, and copy the coordinates that appear at the bottom of the screen.
              </Text>
            </View>
          </>
        )}

        {/* ══ SESSION DEFAULTS ══ */}
        <SectionHeader
          icon="calendar-outline"
          color="#4B3F72"
          title="Session Defaults"
          subtitle="Pre-filled values when starting a new attendance session"
        />

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Default Service</Text>
          <ChipPicker
            options={["Sunday", "Wednesday", "Friday", "Saturday", "Special"]}
            value={settings.defaultService}
            onChange={v => update("defaultService", v)}
          />

          <Text style={styles.fieldLabel}>Default Type</Text>
          <ChipPicker
            options={["First Service", "Second Service", "Third Service", "Evening Service", "Youth", "Children"]}
            value={settings.defaultType}
            onChange={v => update("defaultType", v)}
          />

          <Text style={styles.fieldLabel}>Default Start Time</Text>
          <ChipPicker
            options={["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "6:00 PM"]}
            value={settings.defaultStartTime}
            onChange={v => update("defaultStartTime", v)}
          />
        </View>

        {/* ══ ABSENCE ALERTS ══ */}
        <SectionHeader
          icon="notifications-outline"
          color="#e67e22"
          title="Absence Alerts"
          subtitle="When to prompt pastoral follow-up"
        />

        <View style={styles.card}>
          <View style={styles.thresholdRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.thresholdLabel}>Contact Prompt</Text>
              <Text style={styles.thresholdSub}>Show "follow-up suggested" after this many absences</Text>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => update("absenceWarningCount", Math.max(1, settings.absenceWarningCount - 1))}
              >
                <Ionicons name="remove" size={16} color="#4B3F72" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{settings.absenceWarningCount}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => update("absenceWarningCount", Math.min(10, settings.absenceWarningCount + 1))}
              >
                <Ionicons name="add" size={16} color="#4B3F72" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.thresholdRow, { marginTop: 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.thresholdLabel}>Red Flag Alert</Text>
              <Text style={styles.thresholdSub}>Show pastoral red flag after this many absences</Text>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => update("absenceFlagCount", Math.max(settings.absenceWarningCount + 1, settings.absenceFlagCount - 1))}
              >
                <Ionicons name="remove" size={16} color="#e74c3c" />
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: "#e74c3c" }]}>{settings.absenceFlagCount}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => update("absenceFlagCount", Math.min(20, settings.absenceFlagCount + 1))}
              >
                <Ionicons name="add" size={16} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ══ SESSION BEHAVIOUR ══ */}
        <SectionHeader
          icon="shield-checkmark-outline"
          color="#0984E3"
          title="Session Behaviour"
          subtitle="Rules and permissions during a live session"
        />

        <SettingRow label="Lock After Session Ends" description="Only admins can edit attendance records once a session is ended">
          <Switch value={settings.lockAfterEnd} onValueChange={v => update("lockAfterEnd", v)} trackColor={{ true: "#0984E3" }} />
        </SettingRow>
        <SettingRow label="Allow Self Check-in (Self QR)" description="Members can scan a QR code to mark themselves present">
          <Switch value={settings.allowSelfCheckin} onValueChange={v => update("allowSelfCheckin", v)} trackColor={{ true: "#0984E3" }} />
        </SettingRow>
        <SettingRow label="Require Session Note" description="Force a summary note before a session can be ended">
          <Switch value={settings.requireSessionNote} onValueChange={v => update("requireSessionNote", v)} trackColor={{ true: "#0984E3" }} />
        </SettingRow>

        <View style={styles.card}>
          <View style={styles.thresholdRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.thresholdLabel}>QR Code Timeout</Text>
              <Text style={styles.thresholdSub}>Session QR codes stop working after this many minutes</Text>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => update("qrSessionTimeoutMins", Math.max(30, settings.qrSessionTimeoutMins - 30))}>
                <Ionicons name="remove" size={16} color="#4B3F72" />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{settings.qrSessionTimeoutMins}m</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => update("qrSessionTimeoutMins", Math.min(480, settings.qrSessionTimeoutMins + 30))}>
                <Ionicons name="add" size={16} color="#4B3F72" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ══ OFFLINE QUEUE ══ */}
        <SectionHeader
          icon="cloud-offline-outline"
          color="#7C3AED"
          title="Offline Queue"
          subtitle="Handle attendance marks when church signal is poor"
        />

        <SettingRow label="Enable Offline Queue" description="Save marks locally and sync to Firestore when signal returns">
          <Switch value={settings.offlineSyncEnabled} onValueChange={v => update("offlineSyncEnabled", v)} trackColor={{ true: "#7C3AED" }} />
        </SettingRow>

        {settings.offlineSyncEnabled && (
          <View style={styles.card}>
            <View style={styles.thresholdRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.thresholdLabel}>Sync Interval</Text>
                <Text style={styles.thresholdSub}>How often to retry syncing queued marks (seconds)</Text>
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => update("offlineSyncIntervalSecs", Math.max(5, settings.offlineSyncIntervalSecs - 5))}>
                  <Ionicons name="remove" size={16} color="#7C3AED" />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, { color: "#7C3AED" }]}>{settings.offlineSyncIntervalSecs}s</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => update("offlineSyncIntervalSecs", Math.min(60, settings.offlineSyncIntervalSecs + 5))}>
                  <Ionicons name="add" size={16} color="#7C3AED" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={[styles.saveBtn, (!dirty || saving) && { opacity: 0.6 }]}
          onPress={saveSettings}
          disabled={!dirty || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>{dirty ? "Save Settings" : "All Saved"}</Text>
              </>}
        </TouchableOpacity>

        {/* RESET */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            Alert.alert(
              "Reset to Defaults?",
              "This will undo all your customisations and restore the original values.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => {
                  setSettings(ATTENDANCE_SETTINGS_DEFAULTS);
                  setDirty(true);
                }}
              ]
            );
          }}
        >
          <Text style={styles.resetBtnText}>Reset to Defaults</Text>
        </TouchableOpacity>

      </ScrollView>
      
<Modal
  visible={itemModalVisible}
  transparent
  animationType="slide"
>
  <View style={styles.overlay}>
    <View style={styles.modalCard}>

      <Text style={styles.modalTitle}>
        {editingIndex === null ? "Add" : "Edit"}{" "}
        {editingMode === "service"
          ? "Service"
          : editingMode === "type"
          ? "Session Type"
          : "Service Time"}
      </Text>

      {editingMode !== "time" ? (
        <TextInput
          style={styles.modalInput}
          value={itemName}
          onChangeText={setItemName}
          placeholder="Enter value"
        />
      ) : (
        <>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeButtonText}>
              {timeValue.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={timeValue}
              mode="time"
              is24Hour={false}
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);

                if (selectedDate) {
                  setTimeValue(selectedDate);
                }
              }}
            />
          )}
        </>
      )}

      <View style={styles.modalActions}>

        {editingIndex !== null && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={deleteItem}
          >
            <Text style={styles.deleteText}>
              Delete
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setItemModalVisible(false)}
        >
          <Text>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveModalBtn}
          onPress={saveItem}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            Save
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  </View>
</Modal>


    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SMALL REUSABLES
// ─────────────────────────────────────────────────────────────────
function SectionHeader({ icon, color, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDesc}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}

function ChipPicker({ options, value, onChange }) {
  return (
    <View style={styles.chipRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, value === o && styles.chipActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },
  body: { padding: 14, paddingBottom: 60 },

  dirtyBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#e67e22", paddingHorizontal: 14, paddingVertical: 10 },
  dirtyBannerText: { flex: 1, color: "#fff", fontSize: 12, fontWeight: "700" },
  dirtyBannerBtn: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  dirtyBannerBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 8 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#222" },
  sectionSubtitle: { fontSize: 11, color: "#888", marginTop: 1 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },

  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 6, elevation: 1 },
  settingLabel: { fontSize: 13, fontWeight: "700", color: "#222" },
  settingDesc: { fontSize: 11, color: "#999", marginTop: 2 },

  radiusCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },
  radiusHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  radiusLabel: { fontSize: 13, fontWeight: "700", color: "#222" },
  radiusValuePill: { backgroundColor: "#4B3F72", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  radiusValue: { color: "#fff", fontSize: 14, fontWeight: "900" },
  radiusPresets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  radiusPreset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f0f0f0", borderWidth: 1.5, borderColor: "transparent" },
  radiusPresetActive: { backgroundColor: "#EEF0FA", borderColor: "#4B3F72" },
  radiusPresetText: { fontSize: 12, color: "#666", fontWeight: "700" },
  radiusPresetTextActive: { color: "#4B3F72" },
  radiusCustomInput: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 10 },
  radiusDescBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#EEF0FA", borderRadius: 8, padding: 10 },
  radiusDescText: { flex: 1, fontSize: 11, color: "#4B3F72", lineHeight: 16 },

  coordCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },
  coordCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  coordCardTitle: { fontSize: 13, fontWeight: "700", color: "#222" },
  detectBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#4B3F72", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  detectBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  addressTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EEF0FA", borderRadius: 8, padding: 8, marginBottom: 10 },
  addressTagText: { fontSize: 11, color: "#4B3F72", fontWeight: "600", flex: 1 },
  coordRow: { flexDirection: "row", gap: 10 },
  coordField: { flex: 1 },
  coordLabel: { fontSize: 11, fontWeight: "700", color: "#888", marginBottom: 4 },
  coordInput: { borderWidth: 1, borderColor: "#eee", borderRadius: 8, padding: 10, fontSize: 13 },
  coordHint: { fontSize: 10, color: "#aaa", marginTop: 8, lineHeight: 14 },

  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 6, marginTop: 10 },

  thresholdRow: { flexDirection: "row", alignItems: "center" },
  thresholdLabel: { fontSize: 13, fontWeight: "700", color: "#222" },
  thresholdSub: { fontSize: 11, color: "#888", marginTop: 2 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepperBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  stepperValue: { fontSize: 15, fontWeight: "900", color: "#4B3F72", minWidth: 40, textAlign: "center" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f0f0f0" },
  chipActive: { backgroundColor: "#4B3F72" },
  chipText: { fontSize: 11, color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4B3F72", borderRadius: 14, padding: 16, marginTop: 20 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  resetBtn: { alignItems: "center", padding: 14 },
  resetBtnText: { color: "#e74c3c", fontSize: 13, fontWeight: "600" },

overlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  padding: 20,
},

modalCard: {
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 20,
},

modalTitle: {
  fontSize: 18,
  fontWeight: "800",
  marginBottom: 16,
  color: "#222",
},

modalInput: {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  padding: 14,
},

timeButton: {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  padding: 16,
  alignItems: "center",
},

timeButtonText: {
  fontSize: 16,
  fontWeight: "700",
},

modalActions: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 20,
},

saveModalBtn: {
  backgroundColor: "#4B3F72",
  borderRadius: 10,
  paddingHorizontal: 18,
  paddingVertical: 12,
},

cancelBtn: {
  paddingHorizontal: 18,
  paddingVertical: 12,
  marginRight: 8,
},

deleteBtn: {
  backgroundColor: "#FDEDED",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginRight: "auto",
},

deleteText: {
  color: "#E74C3C",
  fontWeight: "700",
},


});