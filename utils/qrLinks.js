const APP_SCHEME = "churchcare://";

// ✅ 1. ATTENDANCE QR
export const buildAttendanceSessionLink = (sessionId, organizationId, entityId) => {
  return `${APP_SCHEME}attendance?org=${organizationId}&entity=${entityId}&session=${sessionId}`;
};

// ✅ 2. CHURCH QR (Settings / Entry Point)
export const buildChurchQR = (organizationId, entityId) => {
  return `${APP_SCHEME}church?org=${organizationId}&entity=${entityId}`;
};

// ✅ 3. EVENT QR
export const buildEventQR = (eventId, organizationId, entityId) => {
  return `${APP_SCHEME}event?eventId=${eventId}&entity=${entityId}&org=${organizationId}`;
};

// ✅ 4. MEMBER REGISTRATION QR
export const buildRegistrationQR = (organizationId, entityId) => {
  return `${APP_SCHEME}register?org=${organizationId}&entity=${entityId}`;
};

// ✅ 5. MEMBER PROFILE QR
export const buildMemberQR = (memberId, organizationId, entityId) => {
  return `${APP_SCHEME}member?memberId=${memberId}&entity=${entityId}&org=${organizationId}`;
};
