import { findOpenSession } from "./findOpenSession";
const APP_SCHEME = "churchcare://";

// ✅ ATTENDANCE
export const buildAttendanceSessionLink = (sessionId, orgId, entityId) => {
  return `${APP_SCHEME}attendance?org=${orgId}&entity=${entityId}&session=${sessionId}`;
};

// ✅ EVENT
export const buildEventQR = (eventId, orgId, entityId) => {
  return `${APP_SCHEME}event?eventId=${eventId}&entity=${entityId}&org=${orgId}`;
};

// ✅ REGISTER
export const buildRegistrationQR = (orgId, entityId) => {
  return `${APP_SCHEME}register?org=${orgId}&entity=${entityId}`;
};

// ✅ CHURCH
export const buildChurchQR = (orgId, entityId) => {
  return `${APP_SCHEME}church?org=${orgId}&entity=${entityId}`;

};


// ───────────────────────────────────────────────────────────────────
// ✅ NEW — added below, nothing above this line was changed.
//
// SettingsScreen.js's "Generate Dynamic QR" imports buildRegisterLink,
// buildEventLink, buildDonateLink, and buildPrayerLink — none of which
// existed in this file. These auto-derive organizationId/entityId from
// AsyncStorage("activeEntity") instead of requiring them as arguments,
// then reuse the existing builders above wherever possible.
// ───────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";

const getActiveEntityIds = async () => {
  const data = await AsyncStorage.getItem("activeEntity");
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return { organizationId: parsed.organizationId, entityId: parsed.entityId };
  } catch {
    return null;
  }
};

export const buildRegisterLink = async () => {
  const ids = await getActiveEntityIds();
  if (!ids) return null;
  return buildRegistrationQR(ids.organizationId, ids.entityId);
};

export const buildEventLink = async (eventId) => {
  const ids = await getActiveEntityIds();
  if (!ids) return null;
  return buildEventQR(eventId, ids.organizationId, ids.entityId);
};

// ✅ Didn't exist in any form before
export const buildDonateLink = async ({ amount, category } = {}) => {
  const ids = await getActiveEntityIds();
  if (!ids) return null;
  const params = [`org=${ids.organizationId}`, `entity=${ids.entityId}`];
  if (amount)   params.push(`amount=${encodeURIComponent(amount)}`);
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  return `${APP_SCHEME}donate?${params.join("&")}`;
};

// ✅ Didn't exist in any form before
export const buildPrayerLink = async () => {
  const ids = await getActiveEntityIds();
  if (!ids) return null;
  return `${APP_SCHEME}prayer?org=${ids.organizationId}&entity=${ids.entityId}`;

};