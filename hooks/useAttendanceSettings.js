// hooks/useAttendanceSettings.js
//
// ✅ Reads the settings doc in real time. AttendanceScreen imports this
// instead of using hardcoded constants — geo radius, church coordinates,
// absence thresholds, and lock behaviour all update live the moment
// an admin saves new values in AttendanceSettingsScreen.

import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ATTENDANCE_SETTINGS_DEFAULTS } from "../screens/AttendanceSettingsScreen";

export function useAttendanceSettings(organizationId, entityId) {
  const [settings, setSettings] = useState(ATTENDANCE_SETTINGS_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!organizationId || !entityId) return;

    const unsub = onSnapshot(
      doc(db, "organizations", organizationId, "entities", entityId, "settings", "attendanceSettings"),
      snap => {
        if (snap.exists()) {
          setSettings({ ...ATTENDANCE_SETTINGS_DEFAULTS, ...snap.data() });
        }
        setLoaded(true);
      },
      e => {
        console.log("❌ useAttendanceSettings:", e);
        setLoaded(true); // use defaults on error
      }
    );

    return () => unsub();
  }, [organizationId, entityId]);

  return { settings, loaded };
}