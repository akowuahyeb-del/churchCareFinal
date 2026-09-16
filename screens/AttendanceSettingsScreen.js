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
import { hashPin } from "../utils/pinHash";

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
  defaultOccasion: "None",

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

  occasionOptions: [
    "None",
    "Easter",
    "Christmas",
    "Harvest",
    "Founders Day",
    "Convention",
  ],

 // Attendance Intelligence Policy
attendancePolicy: {
  followUpThreshold: null,
  atRiskThreshold: null,
  inactiveCandidateThreshold: null,
},

  // Session behaviour
  lockAfterEnd:         true,
  allowSelfCheckin:     true,
  qrSessionTimeoutMins: 120,
  requireSessionNote:   false,
  requireAttendancePin: false,

  // Offline queue
  offlineSyncEnabled:   true,
  offlineSyncIntervalSecs: 10,
};

// FIX: was missing entirely — editItem() reset the time picker to
// "now" instead of the value actually being edited. Parses strings
// like "9:00 AM" (the exact format saveItem produces) back into a
// Date so the picker opens pre-filled with the real value.
const parseTimeString = (str) => {
  if (!str) return new Date();
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return new Date();
  let [, h, m, ampm] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (/pm/i.test(ampm) && h !== 12) h += 12;
  if (/am/i.test(ampm) && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
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
  // FIX: needed so saveItem can tell whether the item being edited was
  // the current default, and keep the default in sync if its name changes.
  const [editingOriginalValue, setEditingOriginalValue] = useState(null);
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
    setEditingOriginalValue(null);
    setItemName("");
    setItemModalVisible(true);
  };

  const openAddType = () => {
    setEditingMode("type");
    setEditingIndex(null);
    setEditingOriginalValue(null);
    setItemName("");
    setItemModalVisible(true);
  };

  const openAddTime = () => {
    setEditingMode("time");
    setEditingIndex(null);
    setEditingOriginalValue(null);
    setTimeValue(new Date());
    setItemModalVisible(true);
  };

  const openAddOccasion = () => {
    setEditingMode("occasion");
    setEditingIndex(null);
    setEditingOriginalValue(null);
    setItemName("");
    setItemModalVisible(true);
  };

  const editItem = (mode, value, index) => {
    setEditingMode(mode);
    setEditingIndex(index);
    setEditingOriginalValue(value);

    if (mode === "time") {
      // FIX: was `new Date()` — always reset to "now" instead of the
      // time actually being edited.
      setTimeValue(parseTimeString(value));
    } else {
      setItemName(value);
    }

    setItemModalVisible(true);
  };

  const defaultKeyFor = (mode) => ({
    service: "defaultService",
    type: "defaultType",
    time: "defaultStartTime",
    occasion: "defaultOccasion",
  }[mode]);

  const listKeyFor = (mode) => ({
    service: "serviceOptions",
    type: "typeOptions",
    time: "timeOptions",
    occasion: "occasionOptions",
  }[mode]);

  const saveItem = () => {
    const listKey = listKeyFor(editingMode);
    const defaultKey = defaultKeyFor(editingMode);
    const list = [...(settings[listKey] || [])];

    const newValue =
      editingMode === "time"
        ? timeValue.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : itemName.trim();

    if (editingIndex === null) {
      list.push(newValue);
    } else {
      list[editingIndex] = newValue;
    }

    update(listKey, list);

    if (!settings[defaultKey] && list.length > 0) {
      update(defaultKey, list[0]);
    } else if (
      // FIX: if the item being edited WAS the current default, keep
      // the default pointing at it under its new name instead of
      // leaving it referencing a value that no longer exists in the list.
      editingIndex !== null &&
      editingOriginalValue !== null &&
      settings[defaultKey] === editingOriginalValue
    ) {
      update(defaultKey, newValue);
    }

    setItemModalVisible(false);
  };

  const deleteItem = () => {
    const listKey = listKeyFor(editingMode);
    const defaultKey = defaultKeyFor(editingMode);
    const list = [...(settings[listKey] || [])];
    const removed = list[editingIndex];

    list.splice(editingIndex, 1);
    update(listKey, list);

    // FIX: if the deleted item was the current default, it was left
    // pointing at a value no longer in the list — nothing would show
    // as selected, and AttendanceScreen would pre-fill a session with
    // a nonexistent option.
    if (settings[defaultKey] === removed) {
      update(defaultKey, list[0] || "");
    }

    setItemModalVisible(false);
  };

  // ─────────────────────────────────────────────────────────────────
  // DETECT CURRENT GPS
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
            <View style={styles.radiusCard}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusLabel}>Geo Fence Radius</Text>
                <View style={styles.radiusValuePill}>
                  <Text style={styles.radiusValue}>{settings.geoRadiusMeters}m</Text>
                </View>
              </View>

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

        {/* FIX: header moved to precede the card it actually describes,
            instead of trailing it with nothing underneath. */}
        <SectionHeader
          icon="calendar-outline"
          color="#4B3F72"
          title="Session Configuration"
          subtitle="Manage services, types, occasions and times"
        />

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Service</Text>

          <View style={styles.dynamicList}>
            {(settings.serviceOptions || []).map((service, index) => (
              <View key={`${service}-${index}`} style={styles.dynamicListRow}>
                <TouchableOpacity
                  style={[
                    styles.dynamicChip,
                    settings.defaultService === service && styles.dynamicChipActive,
                  ]}
                  onPress={() => update("defaultService", service)}
                >
                  <Text
                    style={[
                      styles.dynamicChipText,
                      settings.defaultService === service && styles.dynamicChipTextActive,
                    ]}
                  >
                    {service}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => editItem("service", service, index)}>
                  <Ionicons name="create-outline" size={18} color="#4B3F72" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.manageBtn} onPress={openAddService}>
            <Ionicons name="add-circle-outline" size={16} color="#4B3F72" />
            <Text style={styles.manageBtnText}>Add Service</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Type</Text>

          <View style={styles.dynamicList}>
            {(settings.typeOptions || []).map((type, index) => (
              <View key={`${type}-${index}`} style={styles.dynamicListRow}>
                <TouchableOpacity
                  style={[
                    styles.dynamicChip,
                    settings.defaultType === type && styles.dynamicChipActive,
                  ]}
                  onPress={() => update("defaultType", type)}
                >
                  <Text
                    style={[
                      styles.dynamicChipText,
                      settings.defaultType === type && styles.dynamicChipTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => editItem("type", type, index)}>
                  <Ionicons name="create-outline" size={18} color="#4B3F72" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.manageBtn} onPress={openAddType}>
            <Ionicons name="add-circle-outline" size={16} color="#4B3F72" />
            <Text style={styles.manageBtnText}>Add Type</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Occasion</Text>

          <View style={styles.dynamicList}>
            {(settings.occasionOptions || []).map((occasion, index) => (
              <View key={`${occasion}-${index}`} style={styles.dynamicListRow}>
                <TouchableOpacity
                  style={[
                    styles.dynamicChip,
                    settings.defaultOccasion === occasion && styles.dynamicChipActive,
                  ]}
                  onPress={() => update("defaultOccasion", occasion)}
                >
                  <Text
                    style={[
                      styles.dynamicChipText,
                      settings.defaultOccasion === occasion && styles.dynamicChipTextActive,
                    ]}
                  >
                    {occasion}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => editItem("occasion", occasion, index)}>
                  <Ionicons name="create-outline" size={18} color="#4B3F72" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.manageBtn} onPress={openAddOccasion}>
            <Ionicons name="add-circle-outline" size={16} color="#4B3F72" />
            <Text style={styles.manageBtnText}>Add Occasion</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Start Time</Text>

          <View style={styles.dynamicList}>
            {(settings.timeOptions || []).map((time, index) => (
              <View key={`${time}-${index}`} style={styles.dynamicListRow}>
                <TouchableOpacity
                  style={[
                    styles.dynamicChip,
                    settings.defaultStartTime === time && styles.dynamicChipActive,
                  ]}
                  onPress={() => update("defaultStartTime", time)}
                >
                  <Text
                    style={[
                      styles.dynamicChipText,
                      settings.defaultStartTime === time && styles.dynamicChipTextActive,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => editItem("time", time, index)}>
                  <Ionicons name="create-outline" size={18} color="#4B3F72" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.manageBtn} onPress={openAddTime}>
            <Ionicons name="time-outline" size={16} color="#4B3F72" />
            <Text style={styles.manageBtnText}>Add Time</Text>
          </TouchableOpacity>
        </View>
{/* ══ ATTENDANCE INTELLIGENCE POLICY ══ */}
<SectionHeader
  icon="analytics-outline"
  color="#e67e22"
  title="Attendance Intelligence Policy"
  subtitle="Configure attendance review thresholds"
/>

<View style={styles.card}>

  <View style={styles.thresholdRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.thresholdLabel}>
        Follow-Up Threshold
      </Text>
      <Text style={styles.thresholdSub}>
        Number of consecutive absences before a follow-up is recommended.
      </Text>
    </View>

    <TextInput
      style={styles.coordInput}
      keyboardType="numeric"
      value={
        settings.attendancePolicy?.followUpThreshold?.toString() || ""
      }
      onChangeText={(v) =>
        update("attendancePolicy", {
          ...settings.attendancePolicy,
          followUpThreshold:
            v === "" ? null : Number(v),
        })
      }
      placeholder="Not configured"
    />
  </View>

  <View
    style={[
      styles.thresholdRow,
      { marginTop: 16 },
    ]}
  >
    <View style={{ flex: 1 }}>
      <Text style={styles.thresholdLabel}>
        At Risk Threshold
      </Text>
      <Text style={styles.thresholdSub}>
        Number of consecutive absences before a member is considered at risk.
      </Text>
    </View>

    <TextInput
      style={styles.coordInput}
      keyboardType="numeric"
      value={
        settings.attendancePolicy?.atRiskThreshold?.toString() || ""
      }
      onChangeText={(v) =>
        update("attendancePolicy", {
          ...settings.attendancePolicy,
          atRiskThreshold:
            v === "" ? null : Number(v),
        })
      }
      placeholder="Not configured"
    />
  </View>

  <View
    style={[
      styles.thresholdRow,
      { marginTop: 16 },
    ]}
  >
    <View style={{ flex: 1 }}>
      <Text style={styles.thresholdLabel}>
        Inactive Candidate Threshold
      </Text>
      <Text style={styles.thresholdSub}>
        Number of consecutive absences before inactivity review is triggered.
      </Text>
    </View>

    <TextInput
      style={styles.coordInput}
      keyboardType="numeric"
      value={
        settings.attendancePolicy?.inactiveCandidateThreshold?.toString() || ""
      }
      onChangeText={(v) =>
        update("attendancePolicy", {
          ...settings.attendancePolicy,
          inactiveCandidateThreshold:
            v === "" ? null : Number(v),
        })
      }
      placeholder="Not configured"
    />
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
        <SettingRow
          label="Require Attendance PIN"
          description="Users must verify their Attendance PIN before joining or ending a session"
        >
          <Switch
            value={settings.requireAttendancePin || false}
            onValueChange={v => update("requireAttendancePin", v)}
            trackColor={{ true: "#0984E3" }}
          />
        </SettingRow>
        {settings.requireAttendancePin && (
          <View style={styles.card}>
            <Text style={styles.thresholdLabel}>Session Security PIN</Text>
            <Text style={[styles.thresholdSub, { marginBottom: 16 }]}>
              Used to authorise session closure and other attendance security actions.
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={styles.detectBtn}
                onPress={() => navigation.navigate("PinSetup", { mode: "attendance" })}
              >
                <Ionicons name="key-outline" size={14} color="#fff" />
                <Text style={styles.detectBtnText}>Setup Attendance PIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attendanceResetBtn}
                onPress={() => navigation.navigate("Login", { resetPinMode: "attendance" })}
              >
                <Ionicons name="refresh-circle-outline" size={18} color="#E67E22" />
                <Text style={styles.attendanceResetText}>Reset PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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

      <Modal visible={itemModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>
              {editingIndex === null ? "Add" : "Edit"}{" "}
              {/* FIX: missing "occasion" case — editing/adding an
                  Occasion mislabeled the modal "Service Time". */}
              {editingMode === "service" ? "Service"
                : editingMode === "type" ? "Session Type"
                : editingMode === "occasion" ? "Occasion"
                : "Service Time"}
            </Text>

            {editingMode === "time" ? (
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
            ) : (
              <TextInput
                style={styles.modalInput}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Enter value"
              />
            )}

            <View style={styles.modalActions}>
              {editingIndex !== null && (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setItemModalVisible(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveModalBtn} onPress={saveItem}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
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

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16, color: "#222" },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14 },
  timeButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, alignItems: "center" },
  timeButtonText: { fontSize: 16, fontWeight: "700" },
  modalActions: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  saveModalBtn: { backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 12, marginRight: 8 },
  deleteBtn: { backgroundColor: "#FDEDED", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginRight: "auto" },
  deleteText: { color: "#E74C3C", fontWeight: "700" },

  dynamicList: { marginBottom: 10 },
  dynamicListRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  dynamicChip: { flex: 1, backgroundColor: "#f0f0f0", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10 },
  dynamicChipActive: { backgroundColor: "#4B3F72" },
  dynamicChipText: { color: "#555", fontWeight: "600" },
  dynamicChipTextActive: { color: "#fff" },

  // FIX: referenced in JSX for the four "Add" buttons (Service, Type,
  // Occasion, Time) but never actually defined — they rendered as
  // bare unstyled text with no background or spacing, easy to
  // overlook entirely.
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EEF0FA",
    borderWidth: 1,
    borderColor: "#4B3F72",
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 16,
  },
  manageBtnText: {
    color: "#4B3F72",
    fontWeight: "700",
    fontSize: 13,
  },

  manageLink: { color: "#4B3F72", fontSize: 12, fontWeight: "600", marginTop: 4, marginBottom: 10 },
  manageHint: { fontSize: 11, color: "#4B3F72", marginTop: 6, marginBottom: 12, fontWeight: "600" },

  attendanceResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E67E22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attendanceResetText: { color: "#E67E22", fontSize: 11, fontWeight: "700" },
});