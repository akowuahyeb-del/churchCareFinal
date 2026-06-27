const APP_SCHEME = "churchcare://";

export const buildAttendanceSessionLink = (sessionId, organizationId, entityId) => {
  return `${APP_SCHEME}attendance?org=${organizationId}&entity=${entityId}&session=${sessionId}`;
};