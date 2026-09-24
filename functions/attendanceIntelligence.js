// functions/attendanceIntelligence.js

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { getApps, initializeApp } = require("firebase-admin/app");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// ---------------------------------------------------------------------
// PURE CLASSIFICATION LOGIC (ported from utils/attendanceIntelligence.js)
// ---------------------------------------------------------------------

const ATTENDANCE_HEALTH = {
  HEALTHY: "healthy",
  FOLLOW_UP: "follow_up",
  AT_RISK: "at_risk",
  INACTIVE_CANDIDATE: "inactive_candidate",
};

const CATEGORY_MIGRATION_MAP = {
  regular: "worship",
  celebration: "special_worship",
  special: "one_off",
  worship: "worship",
  special_worship: "special_worship",
  revival: "revival",
  ministry: "ministry",
  administrative: "administrative",
  one_off: "one_off",
};

function normalizeCategory(category) {
  return CATEGORY_MIGRATION_MAP[category] || "worship";
}

const WINDOW_BEHAVIOURS = {
  worship: { resetOnPresence: true, countAbsence: true },
  special_worship: { resetOnPresence: true, countAbsence: false },
  revival: { resetOnPresence: true, countAbsence: true },
  ministry: { resetOnPresence: false, countAbsence: true },
  administrative: { resetOnPresence: false, countAbsence: false },
  one_off: { resetOnPresence: false, countAbsence: false },
};

function resolveAttendanceTrack(session) {
  return (session.attendanceTrack || session.service || "unknown")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function computeStreakFromOccurrences(occurrences) {
  let streak = 0;

  for (const occ of occurrences) {
    const category = normalizeCategory(occ.category);
    const behaviour = WINDOW_BEHAVIOURS[category] || WINDOW_BEHAVIOURS.worship;

    if (occ.status === "present" && behaviour.resetOnPresence) {
      break;
    }

    if (!behaviour.countAbsence) {
      continue;
    }

    streak += 1;
  }

  return streak;
}

function classifyAttendanceHealth(streak, policy) {
  if (!policy) return ATTENDANCE_HEALTH.HEALTHY;

  if (streak >= Number(policy.inactiveCandidateThreshold || 999)) {
    return ATTENDANCE_HEALTH.INACTIVE_CANDIDATE;
  }
  if (streak >= Number(policy.atRiskThreshold || 999)) {
    return ATTENDANCE_HEALTH.AT_RISK;
  }
  if (streak >= Number(policy.followUpThreshold || 999)) {
    return ATTENDANCE_HEALTH.FOLLOW_UP;
  }
  return ATTENDANCE_HEALTH.HEALTHY;
}

function buildAttendanceRecommendation(streak, policy) {
  const health = classifyAttendanceHealth(streak, policy);

  switch (health) {
    case ATTENDANCE_HEALTH.FOLLOW_UP:
      return { health, action: "follow_up", priority: "medium" };
    case ATTENDANCE_HEALTH.AT_RISK:
      return { health, action: "pastoral_review", priority: "high" };
    case ATTENDANCE_HEALTH.INACTIVE_CANDIDATE:
      return { health, action: "inactive_review", priority: "critical" };
    default:
      return { health: ATTENDANCE_HEALTH.HEALTHY, action: "none", priority: "none" };
  }
}

function buildAttendanceIntelligenceSnapshot({ streak, attendancePolicy }) {
  const recommendation = buildAttendanceRecommendation(streak, attendancePolicy);

  return {
    health: recommendation.health,
    absenceStreak: streak,
    action: recommendation.action,
    priority: recommendation.priority,
    followUpRequired: recommendation.health === "follow_up",
    atRisk: recommendation.health === "at_risk",
    inactiveCandidate: recommendation.health === "inactive_candidate",
    lastAttendanceDate: null,
    lastCalculatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------
// MOBILITY (exact port of constants/memberMobility.js — client and
// server must classify "local"/"away"/"alert-excluded" identically, or
// this function and the app's own attendance rate would disagree)
// ---------------------------------------------------------------------

const MOBILITY_STATUS = {
  PERMANENT: "permanent",
  SEASONAL: "seasonal",
  TRANSIENT: "transient",
  VISITING: "visiting",
};

// FIX: category-based, NOT date-based — a visiting member has no
// active awayPeriod (isMemberAway returns false for them) but should
// still never feed pastoral intelligence or trigger alerts. My first
// draft of this function omitted this list entirely, which would have
// pulled visiting members into streak tracking and follow-up alerts.
const EXCLUDED_FROM_ABSENCE_ALERTS = [
  MOBILITY_STATUS.SEASONAL,
  MOBILITY_STATUS.TRANSIENT,
  MOBILITY_STATUS.VISITING,
];

// FIX: exact port — my first draft only checked awayPeriods, missing
// the mobilityStatus !== permanent gate. Without it, a permanent
// member with a stray/leftover awayPeriods entry (e.g. old data,
// mobility status reset to permanent but periods not cleared) would
// have been incorrectly treated as away.
function isMemberAway(member, dateStr) {
  if (!member.mobilityStatus || member.mobilityStatus === MOBILITY_STATUS.PERMANENT) {
    return false;
  }

  if (!Array.isArray(member.awayPeriods) || member.awayPeriods.length === 0) {
    return false;
  }

  const normalizedDate = dateStr.replace(/-/g, "");

  return member.awayPeriods.some((p) => {
    const from = String(p.from || "").replace(/-/g, "");
    const to = String(p.to || "").replace(/-/g, "");
    return from <= normalizedDate && normalizedDate <= to;
  });
}

function trueLocalMembers(members, dateStr) {
  return members.filter((m) => !isMemberAway(m, dateStr));
}

// ---------------------------------------------------------------------
// FIRESTORE-BACKED LOGIC
// ---------------------------------------------------------------------

async function getMemberOccurrences({ organizationId, entityId, memberId, track }) {
  const attendanceRef = db
    .collection("organizations").doc(organizationId)
    .collection("entities").doc(entityId)
    .collection("attendance");

  const [trackSnap, revivalSnap] = await Promise.all([
    attendanceRef.where("memberId", "==", memberId).where("attendanceTrack", "==", track).get(),
    attendanceRef.where("memberId", "==", memberId).where("sessionCategory", "==", "revival").get(),
  ]);

  const occurrenceMap = new Map();

  const ingest = (docs) => {
    docs.forEach((d) => {
      const data = d.data();
      const category = normalizeCategory(data.sessionCategory || "worship");
      const behaviour = WINDOW_BEHAVIOURS[category] || WINDOW_BEHAVIOURS.worship;

      if (!behaviour.countAbsence && !behaviour.resetOnPresence) return;

      const key =
        category === "revival"
          ? `revival:${data.seriesId || data.sessionId}`
          : `${category}:${data.attendanceTrack || track}:${data.date}`;

      const existing = occurrenceMap.get(key) || {
        key, category, date: data.date, sawPresent: false,
      };

      if (data.status === "present") existing.sawPresent = true;
      if (!existing.date || (data.date || "") > existing.date) existing.date = data.date;

      occurrenceMap.set(key, existing);
    });
  };

  ingest(trackSnap.docs);
  ingest(revivalSnap.docs);

  return Array.from(occurrenceMap.values())
    .map((o) => ({ key: o.key, category: o.category, date: o.date, status: o.sawPresent ? "present" : "absent" }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

async function computeAbsenceStreak({ organizationId, entityId, memberId, track }) {
  const occurrences = await getMemberOccurrences({ organizationId, entityId, memberId, track });
  return computeStreakFromOccurrences(occurrences);
}

async function resolveMemberTrack({ organizationId, entityId, memberId, fallbackTrack }) {
  try {
    const snap = await db
      .collection("organizations").doc(organizationId)
      .collection("entities").doc(entityId)
      .collection("attendance")
      .where("memberId", "==", memberId)
      .where("status", "==", "present")
      .get();

    const tally = {};

    snap.docs.forEach((d) => {
      const data = d.data();
      const category = data.sessionCategory || "regular";
      if (category !== "regular" && category !== "celebration") return;

      const track = data.attendanceTrack;
      if (!track) return;

      const existing = tally[track] || { count: 0, lastDate: "" };
      existing.count += 1;
      if ((data.date || "") > existing.lastDate) existing.lastDate = data.date || "";
      tally[track] = existing;
    });

    const ranked = Object.entries(tally).sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return (b[1].lastDate || "").localeCompare(a[1].lastDate || "");
    });

    return ranked.length ? ranked[0][0] : fallbackTrack;
  } catch (e) {
    console.error("resolveMemberTrack", e);
    return fallbackTrack;
  }
}

// ---------------------------------------------------------------------
// TRIGGER
// ---------------------------------------------------------------------

exports.onAttendanceSessionEnded = onDocumentUpdated(
  "organizations/{organizationId}/entities/{entityId}/sessions/{sessionId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;

    if (before.status === "ended" || after.status !== "ended") return;

    const { organizationId, entityId, sessionId } = event.params;

    const membersSnap = await db
      .collection("organizations").doc(organizationId)
      .collection("entities").doc(entityId)
      .collection("members").get();

    const allMembers = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const settingsSnap = await db
      .collection("organizations").doc(organizationId)
      .collection("entities").doc(entityId)
      .collection("settings").doc("attendanceSettings").get();

   const attendanceSettings =
  settingsSnap.exists
    ? settingsSnap.data()
    : null;

const attendancePolicy =
  attendanceSettings?.attendancePolicy ||
  null;

if (!attendancePolicy) {

  console.log(
    "ATTENDANCE POLICY NOT CONFIGURED",
    {
      organizationId,
      entityId,
    }
  );

  return;

}

    const currentTrack = resolveAttendanceTrack(after);
    const sessionCategory =
  after.sessionCategory || "regular";

    if (!currentTrack || currentTrack === "unknown") {

  console.log(
    "ATTENDANCE TRACK NOT RESOLVED",
    {
      organizationId,
      entityId,
      sessionId,
    }
  );

  return;

}

    // FIX: same "local" definition the client used for auto-marking —
    // based on active away periods only, unchanged from before.
  const local = trueLocalMembers(
  allMembers,
  after.date
).filter((member) => {

  return [
    "member",
    "active_user",
  ].includes(
    member.lifecycleStatus
  );

}).filter((member) => {

  return member.active !== false;

});




    for (const member of local) {
      const attendanceDocId = `${sessionId}_${member.id}`;
      const attendanceRef = db
        .collection("organizations").doc(organizationId)
        .collection("entities").doc(entityId)
        .collection("attendance").doc(attendanceDocId);

      const attendanceSnap = await attendanceRef.get();
if (!attendanceSnap.exists) {

  await attendanceRef.set({
    memberId: member.id,
    memberCode: member.memberCode || "",
    name: member.name,
    phone: member.phone || "",
    ministry: member.ministry || "",
    entityId,
    organizationId,
    sessionId,
    service: after.service,
    type: after.type,
    event: after.event,
    date: after.date,
    status: "absent",
    method: "auto",
    autoMarked: true,
    sessionCategory: after.sessionCategory || "regular",
    attendanceTrack: currentTrack,
    seriesId:
      after.sessionCategory === "revival"
        ? after.seriesId || null
        : null,
    timestamp: new Date().toISOString(),
  });

}

      // FIX: category-based exclusion, separate from and in addition
      // to the date-based "local" check above. A visiting/seasonal/
      // transient member can still get an auto-marked absence record
      // (for attendance-history completeness) without ever feeding
      // pastoral intelligence, audit, or notifications.
      if (EXCLUDED_FROM_ABSENCE_ALERTS.includes(member.mobilityStatus)) {
        continue;
      }

      try {
        const memberTrack =
  sessionCategory === "revival"
    ? currentTrack
    : await resolveMemberTrack({
        organizationId,
        entityId,
        memberId: member.id,
        fallbackTrack: currentTrack,
      });

        const streak = await computeAbsenceStreak({
          organizationId, entityId, memberId: member.id, track: memberTrack,
        });

        const newSnapshot = buildAttendanceIntelligenceSnapshot({ streak, attendancePolicy });
       const previousHealth =
  member.attendanceIntelligence?.health || null;

const previousStreak =
  member.attendanceIntelligence?.absenceStreak ?? 0;

const healthChanged =
  previousHealth !== newSnapshot.health;

const streakChanged =
  previousStreak !== streak;

const intelligenceChanged =
  healthChanged ||
  streakChanged;


        const memberRef = db
          .collection("organizations").doc(organizationId)
          .collection("entities").doc(entityId)
          .collection("members").doc(member.id);

       if (intelligenceChanged) {

  await memberRef.update({
    attendanceIntelligence: newSnapshot,

    attendanceHealth:
      newSnapshot.health,

    attendanceAbsenceStreak:
      newSnapshot.absenceStreak,

    attendanceFollowUpRequired:
      newSnapshot.followUpRequired,

    attendanceAtRisk:
      newSnapshot.atRisk,

    attendanceInactiveCandidate:
      newSnapshot.inactiveCandidate,

    attendanceLastCalculatedAt:
      newSnapshot.lastCalculatedAt,

  });

}



        if (healthChanged || streakChanged) {
         await db
  .collection("organizations").doc(organizationId)
  .collection("entities").doc(entityId)
  .collection("attendanceIntelligenceAudit")
  .add({
    memberId: member.id,
    memberName: member.name,

    previousHealth,
    newHealth: newSnapshot.health,

    previousStreak,
    newStreak: streak,

    track: memberTrack,

    sessionId,

    changedAt:
      new Date().toISOString(),
  });

          const rank = { healthy: 0, follow_up: 1, at_risk: 2, inactive_candidate: 3 };
          const worsening = (rank[newSnapshot.health] ?? 0) > (rank[previousHealth] ?? 0);

          if (worsening) {

  await db
    .collection("organizations").doc(organizationId)
    .collection("entities").doc(entityId)
    .collection("notifications")
    .add({
      type: "attendance_health_change",
      recipientUid: null,
      title: "⚠️ Attendance follow-up needed",
      message:
        `${member.name} moved from ${previousHealth || "no record"} ` +
        `to ${newSnapshot.health.replace("_", " ")}.`,
      memberId: member.id,
      newHealth: newSnapshot.health,
      read: false,
      createdAt: new Date().toISOString(),
    });

}
        }
      } catch (e) {
        console.error("attendance intelligence error for member", member.id, e);
      }
    }
  }
);