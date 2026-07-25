export async function getAttendanceSummary(
  organizationId,
  entityId,
  dateRange = "4w"
) {
  
  return {
    membersCount,
    localMemberCount,
    awayCount,
    avgPresent,
    avgRate,
    peakPresent,
    sessionsCount,
  };
}
