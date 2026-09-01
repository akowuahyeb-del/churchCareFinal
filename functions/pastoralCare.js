const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { getApps, initializeApp } = require("firebase-admin/app");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

// Categories that require restricted, assigned-staff-only visibility.
const SENSITIVE_CATEGORIES = ["counselling", "bereavement"];

const VALID_CATEGORIES = [
  "prayer",
  "counselling",
  "bereavement",
  "financial",
  "general",
];

// Keyword lists for lightweight, rule-based urgency detection.
// Not a substitute for human judgement — this only decides routing
// priority and who gets notified immediately.
const CRISIS_KEYWORDS = [
  "suicide", "suicidal", "kill myself", "end my life", "end it all",
  "harm myself", "hurt myself", "want to die", "no reason to live",
  "overdose", "can't go on", "cant go on",
];

const URGENT_KEYWORDS = [
  "emergency", "hospital", "icu", "critical condition", "passed away",
  "just died", "accident", "urgent", "crisis", "abuse", "domestic violence",
  "eviction", "cut off", "no food", "homeless",
];

// A duplicate follow-up within this window merges into the existing
// open ticket instead of creating a new one.
const DUPLICATE_WINDOW_HOURS = 48;

// A ticket with no staff activity for this long gets escalated.
const STALE_HOURS_BY_URGENCY = {
  crisis: 2,
  urgent: 12,
  normal: 72,
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function detectUrgency(text) {
  const normalized = (text || "").toLowerCase();
  if (CRISIS_KEYWORDS.some((k) => normalized.includes(k))) return "crisis";
  if (URGENT_KEYWORDS.some((k) => normalized.includes(k))) return "urgent";
  return "normal";
}

function isSensitive(category) {
  return SENSITIVE_CATEGORIES.includes(category);
}

async function findAssignee(organizationId, entityId, category) {
  const teamRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("pastoralTeam");

  const teamSnap = await teamRef
    .where("active", "==", true)
    .where("categories", "array-contains", category)
    .get();

  if (teamSnap.empty) return null;

  const candidates = teamSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

  // Load-balance: assign to whoever has the fewest currently-open tickets.
  const openSnap = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("pastoralRequests")
    .where("status", "in", ["new", "assigned", "in_progress"])
    .get();

  const loadCounts = {};
  openSnap.docs.forEach((d) => {
    const assignedTo = d.data().assignedToUid;
    if (assignedTo) loadCounts[assignedTo] = (loadCounts[assignedTo] || 0) + 1;
  });

  candidates.sort((a, b) => (loadCounts[a.uid] || 0) - (loadCounts[b.uid] || 0));
  return candidates[0];
}

async function notify(organizationId, entityId, payload) {
  try {
    await db
      .collection("organizations")
      .doc(organizationId)
      .collection("entities")
      .doc(entityId)
      .collection("notifications")
      .add({ ...payload, read: false, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error("PASTORAL NOTIFICATION FAILED", e);
  }
}

// ---------------------------------------------------------------------------
// SUBMIT REQUEST (member-facing)
// ---------------------------------------------------------------------------

exports.submitPastoralRequest = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const {
    organizationId,
    entityId,
    memberId,
    memberName,
    memberPhone,
    category,
    description,
    anonymous,
  } = request.data || {};

  if (!organizationId || !entityId || !category || !description?.trim()) {
    throw new HttpsError(
      "invalid-argument",
      "Missing organizationId, entityId, category, or description"
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw new HttpsError("invalid-argument", "Unknown request category");
  }

  const sensitive = isSensitive(category);
  const urgency = detectUrgency(description);
  const now = new Date().toISOString();

  const requestsRef = db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("pastoralRequests");

  // --------------------------------------------------
  // Duplicate / follow-up detection — avoid opening a second ticket
  // for the same member + category while one is still open.
  // --------------------------------------------------
  const windowStart = new Date(
    Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const recentSnap = await requestsRef
    .where("memberId", "==", memberId || request.auth.uid)
    .where("category", "==", category)
    .where("status", "in", ["new", "assigned", "in_progress"])
    .get();

  const existingOpen = recentSnap.docs.find(
    (d) => (d.data().createdAt || "") >= windowStart
  );

  if (existingOpen) {
    await existingOpen.ref.collection("notes").add({
      authorUid: request.auth.uid,
      authorName: memberName || "Member",
      body: description,
      fromMember: true,
      internal: false,
      createdAt: now,
    });

    const bumpedUrgency =
      urgency === "crisis" ? "crisis" : existingOpen.data().urgency;

    await existingOpen.ref.update({
      lastActivityAt: now,
      updatedAt: now,
      urgency: bumpedUrgency,
      status:
        existingOpen.data().status === "resolved"
          ? "assigned"
          : existingOpen.data().status,
    });

    if (existingOpen.data().assignedToUid) {
      await notify(organizationId, entityId, {
        type: "pastoral_followup",
        recipientUid: existingOpen.data().assignedToUid,
        title: "Follow-up on an open pastoral request",
        message: `${memberName || "A member"} added an update to an existing ${category} request.`,
        requestId: existingOpen.id,
      });
    }

    return {
      success: true,
      requestId: existingOpen.id,
      merged: true,
      urgency: bumpedUrgency,
    };
  }

  // --------------------------------------------------
  // Create a new ticket
  // --------------------------------------------------
  const assignee = await findAssignee(organizationId, entityId, category);

  const newRequest = {
    memberId: memberId || request.auth.uid,
    memberName: anonymous ? null : memberName || null,
    memberPhone: anonymous ? null : memberPhone || null,
    anonymous: !!anonymous,
    category,
    sensitive,
    description: description.trim(),
    urgency,
    status: assignee ? "assigned" : "new",
    assignedToUid: assignee?.uid || null,
    assignedToName: assignee?.name || null,
    source: "member_app",
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };

  const ref = await requestsRef.add(newRequest);

  const notifyTitle =
    urgency === "crisis"
      ? "🚨 Urgent pastoral request"
      : urgency === "urgent"
      ? "⚠️ Pastoral request needs attention"
      : "New pastoral request";

  const notifyMessage = anonymous
    ? `An anonymous ${category} request was submitted.`
    : `${memberName || "A member"} submitted a ${category} request.`;

  if (assignee) {
    await notify(organizationId, entityId, {
      type: "pastoral_request_assigned",
      recipientUid: assignee.uid,
      title: notifyTitle,
      message: notifyMessage,
      requestId: ref.id,
      urgency,
    });
  } else {
    await notify(organizationId, entityId, {
      type: "pastoral_request_unassigned",
      recipientUid: null,
      title: notifyTitle,
      message: `${notifyMessage} No staff member is currently configured for "${category}" requests.`,
      requestId: ref.id,
      urgency,
    });
  }

  // Crisis requests always additionally page every senior pastor,
  // regardless of category assignment.
  if (urgency === "crisis") {
    const seniorSnap = await db
      .collection("organizations")
      .doc(organizationId)
      .collection("entities")
      .doc(entityId)
      .collection("pastoralTeam")
      .where("active", "==", true)
      .where("isSeniorPastor", "==", true)
      .get();

    for (const seniorDoc of seniorSnap.docs) {
      if (seniorDoc.id === assignee?.uid) continue;
      await notify(organizationId, entityId, {
        type: "pastoral_crisis_alert",
        recipientUid: seniorDoc.id,
        title: "🚨 Crisis-flagged pastoral request",
        message: notifyMessage,
        requestId: ref.id,
        urgency,
      });
    }
  }

  return { success: true, requestId: ref.id, merged: false, urgency };
});

// ---------------------------------------------------------------------------
// ASSIGN / REASSIGN (staff-facing)
// ---------------------------------------------------------------------------

exports.assignPastoralRequest = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { organizationId, entityId, requestId, assigneeUid, assigneeName } =
    request.data || {};

  if (!organizationId || !entityId || !requestId || !assigneeUid) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const ref = db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("pastoralRequests")
    .doc(requestId);

  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Request not found");
  }

  const now = new Date().toISOString();

  await ref.update({
    assignedToUid: assigneeUid,
    assignedToName: assigneeName || null,
    status: snap.data().status === "new" ? "assigned" : snap.data().status,
    updatedAt: now,
    lastActivityAt: now,
  });

  await notify(organizationId, entityId, {
    type: "pastoral_request_assigned",
    recipientUid: assigneeUid,
    title: "Pastoral request assigned to you",
    message: `A ${snap.data().category} request was assigned to you.`,
    requestId,
    urgency: snap.data().urgency,
  });

  return { success: true };
});

// ---------------------------------------------------------------------------
// UPDATE STATUS (staff-facing)
// ---------------------------------------------------------------------------

exports.updatePastoralRequestStatus = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { organizationId, entityId, requestId, status } = request.data || {};
  const VALID_STATUSES = ["new", "assigned", "in_progress", "resolved", "closed"];

  if (!organizationId || !entityId || !requestId || !VALID_STATUSES.includes(status)) {
    throw new HttpsError("invalid-argument", "Missing or invalid fields");
  }

  const ref = db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("pastoralRequests")
    .doc(requestId);

  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Request not found");
  }

  const now = new Date().toISOString();

  await ref.update({
    status,
    updatedAt: now,
    lastActivityAt: now,
    ...(status === "resolved" || status === "closed"
      ? { resolvedAt: now, resolvedByUid: request.auth.uid }
      : {}),
  });

  await ref.collection("notes").add({
    authorUid: request.auth.uid,
    body: `Status changed to "${status}"`,
    system: true,
    internal: true,
    createdAt: now,
  });

  return { success: true };
});

// ---------------------------------------------------------------------------
// ADD NOTE (staff-facing)
// ---------------------------------------------------------------------------

exports.addPastoralNote = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { organizationId, entityId, requestId, body, authorName, internal } =
    request.data || {};

  if (!organizationId || !entityId || !requestId || !body?.trim()) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const ref = db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("pastoralRequests")
    .doc(requestId);

  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Request not found");
  }

  const now = new Date().toISOString();

  await ref.collection("notes").add({
    authorUid: request.auth.uid,
    authorName: authorName || "Staff",
    body: body.trim(),
    internal: !!internal,
    fromMember: false,
    createdAt: now,
  });

  await ref.update({ updatedAt: now, lastActivityAt: now });

  return { success: true };
});

// ---------------------------------------------------------------------------
// ESCALATE STALE TICKETS (scheduled — runs every 2 hours)
// Flags tickets with no staff activity within their urgency's threshold,
// bumps priority, and pages senior pastors so nothing falls through.
// ---------------------------------------------------------------------------

exports.escalateStalePastoralRequests = onSchedule("every 2 hours", async () => {
  const orgsSnap = await db.collection("organizations").get();

  for (const orgDoc of orgsSnap.docs) {
    const entitiesSnap = await orgDoc.ref.collection("entities").get();

    for (const entityDoc of entitiesSnap.docs) {
      const openSnap = await entityDoc.ref
        .collection("pastoralRequests")
        .where("status", "in", ["new", "assigned", "in_progress"])
        .get();

      for (const reqDoc of openSnap.docs) {
        const data = reqDoc.data();
        if (data.escalated) continue;

        const staleThresholdHours =
          STALE_HOURS_BY_URGENCY[data.urgency] || STALE_HOURS_BY_URGENCY.normal;

        const lastActivity = new Date(data.lastActivityAt || data.createdAt);
        const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);

        if (hoursSince < staleThresholdHours) continue;

        await reqDoc.ref.update({
          escalated: true,
          escalatedAt: new Date().toISOString(),
          urgency: data.urgency === "normal" ? "urgent" : data.urgency,
        });

        const seniorSnap = await entityDoc.ref
          .collection("pastoralTeam")
          .where("active", "==", true)
          .where("isSeniorPastor", "==", true)
          .get();

        for (const seniorDoc of seniorSnap.docs) {
          await notify(orgDoc.id, entityDoc.id, {
            type: "pastoral_request_stale",
            recipientUid: seniorDoc.id,
            title: "⏰ Pastoral request needs attention",
            message: `A ${data.category} request has had no activity for over ${staleThresholdHours}h.`,
            requestId: reqDoc.id,
            urgency: data.urgency,
          });
        }
      }
    }
  }
});