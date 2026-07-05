// constants/memberMobility.js

export const MOBILITY_STATUS = {
  PERMANENT:  "permanent",   // always lives locally, full membership
  SEASONAL:   "seasonal",    // away predictably (students, seasonal workers)
  TRANSIENT:  "transient",   // moved away but not formally transferred
  VISITING:   "visiting",    // here temporarily from another congregation
};

export const MOBILITY_LABELS = {
  permanent:  { label: "Permanent",        color: "#27ae60", icon: "home-outline" },
  seasonal:   { label: "Seasonal",         color: "#0984E3", icon: "calendar-outline" },
  transient:  { label: "Transient",        color: "#e67e22", icon: "swap-horizontal-outline" },
  visiting:   { label: "Visiting Member",  color: "#7C3AED", icon: "airplane-outline" },
};

// ✅ When calculating "true attendance rate" for a congregation, members
// in these statuses during an away period are excluded from the
// denominator — they can't be absent from a service they're not expected
// to attend.
export const EXCLUDED_FROM_QUORUM = [MOBILITY_STATUS.SEASONAL, MOBILITY_STATUS.TRANSIENT];

// ✅ When deciding whether to trigger a pastoral red-flag for absence,
// skip members who have an active away period.
export const EXCLUDED_FROM_ABSENCE_ALERTS = [
  MOBILITY_STATUS.SEASONAL,
  MOBILITY_STATUS.TRANSIENT,
  MOBILITY_STATUS.VISITING,
];

export const getMobilityLabel = (status) =>
  MOBILITY_LABELS[status] || MOBILITY_LABELS.permanent;

// ✅ Check if a member's mobility makes them "effectively away" on a
// given date (defaults to today). Uses their awayPeriods array:
// [{ from: "2026-05-01", to: "2026-08-31", reason: "On vacation" }]
export const isMemberAway = (
  member,
  date = new Date().toISOString().split("T")[0]
) => {
  if (
    !member.mobilityStatus ||
    member.mobilityStatus === MOBILITY_STATUS.PERMANENT
  ) {
    return false;
  }

  if (
    !Array.isArray(member.awayPeriods) ||
    member.awayPeriods.length === 0
  ) {
    return false;
  }

  const normalizedDate = date.replace(/-/g, "");

  return member.awayPeriods.some((p) => {
    const from = String(p.from || "").replace(/-/g, "");
    const to = String(p.to || "").replace(/-/g, "");

    return (
      from <= normalizedDate &&
      normalizedDate <= to
    );
  });
};

// ✅ True member count — those who are expected to be in the building
export const trueLocalMembers = (members, date) =>
  members.filter(m => !isMemberAway(m, date));