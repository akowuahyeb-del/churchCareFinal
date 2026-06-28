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
``