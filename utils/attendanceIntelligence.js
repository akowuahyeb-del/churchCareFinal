// utils/attendanceIntelligence.js
//
// Category-aware attendance intelligence.
//
// Not every church gathering carries the same weight for "was this
// member here." This module defines how different kinds of sessions
// are grouped and interpreted when computing a member's continuous-
// absence streak — the number that drives the pastoral care alert.
//
// SESSION CATEGORIES
//   regular     The normal recurring gathering (Sunday First/Second
//               Service, Wednesday Prayer). Counts fully both ways:
//               present resets the streak, absent extends it.
//   celebration High-attendance Sundays that still sit on the regular
//               calendar (Easter, Christmas). Presence resets the
//               streak — real evidence someone isn't estranged. A miss
//               is invisible: it neither extends nor resets it.
//   revival     A multi-day special series. The whole series collapses
//               into ONE occurrence: present on any night resets the
//               streak; missing every night counts as a single absence
//               occurrence, not one per missed night.
//   special     One-off events most members aren't expected at
//               (weddings, funerals). Never enters the streak
//               calculation, no matter how many "absent" records exist
//               for it.
//
// GROUPING
//   "regular" and "celebration" sessions are grouped by
//   (attendanceTrack, date) — attending EITHER First or Second Service
//   on a given Sunday counts as one present occurrence for that date,
//   not two separate obligations.
//
//   "revival" sessions are grouped by seriesId, regardless of date —
//   every night of the same revival collapses into one occurrence.

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export const SESSION_CATEGORIES = [
  { key: "worship", label: "Worship" },
  { key: "special_worship", label: "Special Worship" },
  { key: "revival", label: "Revival / Conference" },
  { key: "ministry", label: "Ministry Activity" },
  { key: "administrative", label: "Administrative Meeting" },
  { key: "one_off", label: "One-Off Event" },

  // Legacy categories (keep for migration)
  { key: "regular", label: "Regular Service (Legacy)" },
  { key: "celebration", label: "Celebration (Legacy)" },
  { key: "special", label: "Special Event (Legacy)" },
];


export const WINDOW_BEHAVIOURS = {
  // NEW MODEL
  worship: {
    resetOnPresence: true,
    countAbsence: true,
    affectsChurchAttendance: true,
    affectsPastoralCare: true,
    affectsInactiveReview: true,
  },

  special_worship: {
    resetOnPresence: true,
    countAbsence: false,
    affectsChurchAttendance: true,
    affectsPastoralCare: false,
    affectsInactiveReview: false,
  },

  revival: {
    resetOnPresence: true,
    countAbsence: true,
    affectsChurchAttendance: true,
    affectsPastoralCare: true,
    affectsInactiveReview: false,
  },

  ministry: {
    resetOnPresence: false,
    countAbsence: true,
    affectsChurchAttendance: false,
    affectsPastoralCare: false,
    affectsInactiveReview: false,
  },

  administrative: {
    resetOnPresence: false,
    countAbsence: false,
    affectsChurchAttendance: false,
    affectsPastoralCare: false,
    affectsInactiveReview: false,
  },

  one_off: {
    resetOnPresence: false,
    countAbsence: false,
    affectsChurchAttendance: false,
    affectsPastoralCare: false,
    affectsInactiveReview: false,
  },

  // BACKWARD COMPATIBILITY
  regular: {
    resetOnPresence: true,
    countAbsence: true,
    affectsChurchAttendance: true,
    affectsPastoralCare: true,
    affectsInactiveReview: true,
  },

  celebration: {
    resetOnPresence: true,
    countAbsence: false,
    affectsChurchAttendance: true,
    affectsPastoralCare: false,
    affectsInactiveReview: false,
  },

  special: {
    resetOnPresence: false,
    countAbsence: false,
    affectsChurchAttendance: false,
    affectsPastoralCare: false,
    affectsInactiveReview: false,
  },
};

export const DEFAULT_PARTICIPATION_WINDOWS = {
  worship: {
    id: "worship",
    attendanceRule: "attend_any",
  },

  special_worship: {
    id: "special_worship",
    attendanceRule: "attend_any",
  },

  revival: {
    id: "revival",
    attendanceRule: "attend_any",
  },

  ministry: {
    id: "ministry",
    attendanceRule: "attend_any",
  },

  administrative: {
    id: "administrative",
    attendanceRule: "attend_any",
  },

  one_off: {
    id: "one_off",
    attendanceRule: "attend_any",
  },
};

export const CATEGORY_MIGRATION_MAP = {
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

export function normalizeCategory(category) {
  return (
    CATEGORY_MIGRATION_MAP[category] ||
    "worship"
  );
}

export const DEFAULT_ATTENDANCE_POLICY = {
  worship: {
    warningThreshold: 2,
    concernThreshold: 4,
    criticalThreshold: 8,
  },

  ministry: {
    warningThreshold: 3,
    concernThreshold: 6,
    criticalThreshold: 12,
  },
};

export const DEFAULT_WINDOW_MAPPINGS = {
  sunday: {
    windowId: "sunday_worship",
    windowType: "worship",
  },

  midweek: {
    windowId: "midweek_worship",
    windowType: "worship",
  },

  revival: {
    windowId: "revival",
    windowType: "revival",
  },
};

export function resolveWindowMapping(session) {
  const track = resolveAttendanceTrack(session);

  return (
    DEFAULT_WINDOW_MAPPINGS[track] || {
      windowId: track,
      windowType: normalizeCategory(
        session?.windowType ||
        session?.sessionCategory ||
        "worship"
      ),
    }
  );
}


// Fallback track derivation: group by the service name itself, so
// "Sunday" First/Second Service collapse together even on records
// written before attendanceTrack was explicitly set.
export const resolveAttendanceTrack = (session) =>
  (session.attendanceTrack || session.service || "unknown")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

export function resolveWindowId(session) {
  if (session?.windowId) {
    return session.windowId;
  }

  return resolveAttendanceTrack({
    service: session?.service,
  });
}

export function resolveParticipationWindow(session) {
  const category = normalizeCategory(
    session?.windowType ||
    session?.sessionCategory ||
    "worship"
  );

  const windowId =
    resolveWindowId(session);

  return {
    id: windowId,
    type: category,
    policy:
      DEFAULT_ATTENDANCE_POLICY[
        category
      ] || null,
  };
}

export function getAttendanceThreshold(
  category,
  threshold = "warningThreshold"
) {
  const normalized =
    normalizeCategory(category);

  return (
    DEFAULT_ATTENDANCE_POLICY[
      normalized
    ]?.[threshold] ?? null
  );
}


    

// Fetch every attendance record for a member relevant to a track,
// then collapse into "occurrences" per the category rules above.
// Returns an array ordered most-recent-first:
//   [{ key, category, date, status: "present" | "absent" }, ...]
export async function getMemberOccurrences({
  organizationId,
  entityId,
  memberId,
  track,
}) {
  const attendanceRef = collection(
    db,
    "organizations",
    organizationId,
    "entities",
    entityId,
    "attendance"
  );

  // Regular + celebration sessions on this track.
  const trackSnap = await getDocs(
    query(
      attendanceRef,
      where("memberId", "==", memberId),
      where("attendanceTrack", "==", track)
    )
  );

  // Revival sessions are grouped by seriesId, not track — pull them
  // separately so a revival that happens to share a track value isn't
  // missed, and isn't double-obligated either.
  const revivalSnap = await getDocs(
    query(
      attendanceRef,
      where("memberId", "==", memberId),
      where("sessionCategory", "==", "revival")
    )
  );

  const occurrenceMap = new Map(); // key -> { category, date, sawPresent }

  const ingest = (docs) => {
    docs.forEach((d) => {
      const data = d.data();
      const category = normalizeCategory(
  data.sessionCategory || "worship"
);

      // Special events never enter the streak at all, regardless of
      // how many "absent" records exist for them.
      const behaviour =
  WINDOW_BEHAVIOURS[category] ||
  WINDOW_BEHAVIOURS.worship;

// Categories that never contribute to attendance intelligence
if (!behaviour.countAbsence && !behaviour.resetOnPresence) {
  return;
}

   const mapping = resolveWindowMapping(data);

const windowId = mapping.windowId;


const key =
  category === "revival"
    ? `revival:${data.seriesId || data.sessionId}`
    : `${category}:${windowId}:${data.date}`;

      const existing = occurrenceMap.get(key) || {
        key,
        category,
        date: data.date,
        sawPresent: false,
      };

      if (data.status === "present") existing.sawPresent = true;
      if (!existing.date || (data.date || "") > existing.date) {
        existing.date = data.date;
      }

      occurrenceMap.set(key, existing);
    });
  };

  ingest(trackSnap.docs);
  ingest(revivalSnap.docs);

  return Array.from(occurrenceMap.values())
    .map((o) => ({
      key: o.key,
      category: o.category,
      date: o.date,
      status: o.sawPresent ? "present" : "absent",
    }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Walk occurrences most-recent-first and compute the current
// consecutive-absence streak.
export function computeStreakFromOccurrences(occurrences) {
  let streak = 0;

  for (const occ of occurrences) {
   const category = normalizeCategory(occ.category);

const behaviour =
  WINDOW_BEHAVIOURS[category] ||
  WINDOW_BEHAVIOURS.worship;

    // Presence that should reset the streak
    if (occ.status === "present" && behaviour.resetOnPresence) {
      break;
    }

    // Ignore categories that should not contribute to absence
    if (!behaviour.countAbsence) {
      continue;
    }

    // Count qualifying absence
    streak += 1;
  }

  return streak;
}

export async function computeAbsenceStreak({
  organizationId,
  entityId,
  memberId,
  track,
}) {
  const occurrences = await getMemberOccurrences({
    organizationId,
    entityId,
    memberId,
    track,
  });
  return computeStreakFromOccurrences(occurrences);
}