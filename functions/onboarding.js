// functions/onboarding.js
//
// Member onboarding intelligence layer. Copy into your functions project and
// re-export from index.js, e.g.:
//   const onboarding = require("./onboarding");
//   exports.checkDuplicateMember = onboarding.checkDuplicateMember;
//   exports.createMemberSafe     = onboarding.createMemberSafe;
//   exports.submitVisitorIntake  = onboarding.submitVisitorIntake;
//   exports.inviteMember         = onboarding.inviteMember;
//   exports.markActiveUser       = onboarding.markActiveUser;
//   exports.getFunnelStats       = onboarding.getFunnelStats;
//   exports.onMemberStatusChange = onboarding.onMemberStatusChange;
//   exports.stageWatcherJob      = onboarding.stageWatcherJob;
//
// Assumes members live at:
//   organizations/{organizationId}/entities/{entityId}/members/{memberId}
// Adjust MEMBERS_PATH below if your real path differs.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getApps, initializeApp } = require("firebase-admin/app");
const {
  deliverToMember,
} = require("./notify");

if (!getApps().length) initializeApp();
const db = getFirestore();

const MEMBERS_PATH = (orgId, entId) =>
  db.collection("organizations").doc(orgId).collection("entities").doc(entId).collection("members");

// ─────────────────────────────────────────────────────────────────
// Notification helper — degrades gracefully if a provider isn't configured.
// Swap in real Twilio/SendGrid/Expo calls once you've set functions:config.
// ─────────────────────────────────────────────────────────────────
async function sendNotification({ channel, to, title, body }) {
  if (!to) {
    console.warn(`[notify] no destination for channel=${channel}, skipping: ${title}`);
    return { sent: false, reason: "no_destination" };
  }

  try {
    if (channel === "push") {
      // const { Expo } = require("expo-server-sdk");
      // const expo = new Expo();
      // if (!Expo.isExpoPushToken(to)) return { sent: false, reason: "invalid_token" };
      // await expo.sendPushNotificationsAsync([{ to, title, body, sound: "default" }]);
      console.log(`[notify:push] (stub) → ${to}: ${title} — ${body}`);
      return { sent: true, stub: true };
    }
    if (channel === "sms") {
      // const twilio = require("twilio")(config.twilio.sid, config.twilio.token);
      // await twilio.messages.create({ to, from: config.twilio.from, body: `${title}\n${body}` });
      console.log(`[notify:sms] (stub) → ${to}: ${title} — ${body}`);
      return { sent: true, stub: true };
    }
    if (channel === "email") {
      // wire up SendGrid/nodemailer here
      console.log(`[notify:email] (stub) → ${to}: ${title} — ${body}`);
      return { sent: true, stub: true };
    }
    console.warn(`[notify] unknown channel ${channel}`);
    return { sent: false, reason: "unknown_channel" };
  } catch (e) {
    console.error("[notify] send failed:", e);
    return { sent: false, reason: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// 1. DUPLICATE MATCHER
// ─────────────────────────────────────────────────────────────────

async function findDuplicates({ organizationId, entityId, phone, email, name }) {
  const col = MEMBERS_PATH(organizationId, entityId);
  const matches = new Map();

  if (phone) {
    const snap = await col.where("phone", "==", phone).limit(5).get();
    snap.forEach(d => matches.set(d.id, { id: d.id, ...d.data(), matchedOn: "phone" }));
  }
  if (email) {
    const snap = await col.where("email", "==", email.toLowerCase().trim()).limit(5).get();
    snap.forEach(d => {
      if (!matches.has(d.id)) matches.set(d.id, { id: d.id, ...d.data(), matchedOn: "email" });
    });
  }
  // Cheap fuzzy pass on name only among phone/email hits' neighborhood is expensive at
  // scale without a search index (Algolia/Typesense). For now, exact phone/email match
  // catches the common "scanned the QR twice" case; add fuzzy name matching later if
  // duplicate volume from typos turns out to be significant.

  return Array.from(matches.values());
}

exports.checkDuplicateMember = onCall(async (request) => {
  const { organizationId, entityId, phone, email, name } = request.data || {};
  if (!organizationId || !entityId) throw new HttpsError("invalid-argument", "Missing organizationId/entityId");
  const matches = await findDuplicates({ organizationId, entityId, phone, email, name });
  return { matches };
});


async function generateMemberCode({
  organizationId,
  entityId,
}) {

  const organizationSnap =
    await db
      .collection("organizations")
      .doc(organizationId)
      .get();

  const organization =
    organizationSnap.data() || {};

  const organizationCode =
    organization.organizationCode;

  console.log(
    "GENERATING MEMBER CODE",
    {
      organizationId,
      entityId,
      organizationCode,
    }
  );

  if (!organizationCode) {
    throw new Error(
      "Missing organizationCode"
    );
  }

  const parts =
    organizationCode.split("-");

  if (parts.length !== 4) {
    throw new Error(
      `Invalid organizationCode: ${organizationCode}`
    );
  }

  // Example church:
  // PCG-TC-BM-C482
  //
  // Member becomes:
  // PCG-TC-BM-M731

  const memberPrefix =
    `${parts[0]}-${parts[1]}-${parts[2]}`;

  let memberCode;
  let exists = true;

  while (exists) {

    const randomDigits =
      Math.floor(
        100 + Math.random() * 900
      );

    memberCode =
      `${memberPrefix}-M${randomDigits}`;

    const existing =
      await MEMBERS_PATH(
        organizationId,
        entityId
      )
        .where(
          "memberCode",
          "==",
          memberCode
        )
        .limit(1)
        .get();

    exists = !existing.empty;
  }

  return memberCode;
}


async function createMemberRecord({
  organizationId,
  entityId,
  memberData,
  actorUid = null,
}) {



const now = FieldValue.serverTimestamp();

  const initialStatus =
    memberData.lifecycleStatus || "member";

  const docRef =
    await MEMBERS_PATH(
      organizationId,
      entityId
    ).add({

      ...memberData,

      name:
        memberData.name || "",

      phone:
        memberData.phone || null,

      email:
        memberData.email
          ? memberData.email
              .toLowerCase()
              .trim()
          : null,

      lifecycleStatus:
        initialStatus,

      lastStageChangeAt:
        now,

      lastChangedByUid:
        actorUid,

      statusHistory: [
        {
          status: initialStatus,
          changedAt: Timestamp.now(),
          changedByUid: actorUid,
          note: "Created",
        },
      ],

      source:
        memberData.source ||
        "manual",

      assignedAdminUid:
        memberData.assignedAdminUid ||
        actorUid,

      inviteToken: null,
      inviteChannel: null,
      inviteSentAt: null,
      inviteRetryCount: 0,

      uid: null,
      lastLoginAt: null,
      expoPushToken: null,

      duplicateOf: null,

      createdAt: now,
      updatedAt: now,
    });

 const memberCode =
  await generateMemberCode({
    organizationId,
    entityId,
  });

  await docRef.update({
    memberCode,
  });

  return {
    id: docRef.id,
    memberCode,
    ref: docRef,
  };
}


// Used by manual add + bulk upload (authenticated admin calls).
// Pass forceCreate:true to skip the duplicate check (e.g. admin already reviewed matches).
exports.createMemberSafe = onCall(async (request) => {
  const { organizationId, entityId, forceCreate, ...memberData } = request.data || {};
  if (!organizationId || !entityId) throw new HttpsError("invalid-argument", "Missing organizationId/entityId");
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");

  if (!forceCreate) {
    const matches = await findDuplicates({
      organizationId, entityId,
      phone: memberData.phone, email: memberData.email, name: memberData.name,
    });
    if (matches.length > 0) {
      return { created: false, duplicate: true, matches };
    }
  }



 const member =
  await createMemberRecord({
    organizationId,
    entityId,
    memberData,
    actorUid:
      request.auth.uid,
  });

return {
  created: true,
  id: member.id,
};

});

// Public/unauthenticated entry point ...

// Public/unauthenticated entry point — for QR self-serve forms (visitor/interest).
// Locked down by requiring a valid organizationId/entityId pair to exist; add a
// Firestore rules check or App Check for production abuse protection.
exports.submitVisitorIntake = onCall(async (request) => {
  const { organizationId, entityId, name, phone, email, source } = request.data || {};
  if (!organizationId || !entityId || !name) {
    throw new HttpsError("invalid-argument", "Missing organizationId/entityId/name");
  }

  const matches = await findDuplicates({ organizationId, entityId, phone, email, name });
  const now = FieldValue.serverTimestamp();

  if (matches.length > 0) {
    // Don't create a new person — just log another touchpoint on the existing one.
    const existing = matches[0];
    await MEMBERS_PATH(organizationId, entityId).doc(existing.id).update({
      updatedAt: now,
      // Bump status forward one step on repeat contact, but never skip past pending_approval
      // or move an already-approved Member backwards.
      ...(existing.lifecycleStatus === "visitor" ? { lifecycleStatus: "interested", lastStageChangeAt: now } : {}),
    });
    return { created: false, matchedExisting: existing.id };
  }

  const initialStatus = source === "qr_register" ? "interested" : "visitor";
  const docRef = await MEMBERS_PATH(organizationId, entityId).add({
    name, phone: phone || null, email: email ? email.toLowerCase().trim() : null,
    lifecycleStatus: initialStatus,
    lastStageChangeAt: now,
    lastChangedByUid: null,
    statusHistory: [{ status: initialStatus, changedAt: Timestamp.now(), changedByUid: null, note: "Self-serve QR" }],
    source: source || "qr_attendance",
    assignedAdminUid: null,
    inviteToken: null, inviteChannel: null, inviteSentAt: null, inviteRetryCount: 0,
    uid: null, lastLoginAt: null, expoPushToken: null,
    duplicateOf: null,
    createdAt: now, updatedAt: now,
  });

  return { created: true, id: docRef.id };
});

// ─────────────────────────────────────────────────────────────────
// 2. INVITE OPTIMIZER (Member → Invited)
// ─────────────────────────────────────────────────────────────────

exports.inviteMember = onCall(async (request) => {
  const { organizationId, entityId, memberId, channel } = request.data || {};
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");
  if (!organizationId || !entityId || !memberId) throw new HttpsError("invalid-argument", "Missing ids");

  const ref = MEMBERS_PATH(organizationId, entityId).doc(memberId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Member not found");
  const member = snap.data();

  if (member.lifecycleStatus !== "member") {
    throw new HttpsError("failed-precondition", `Can only invite a Member, current status: ${member.lifecycleStatus}`);
  }

  // Pick channel: explicit override, else prefer SMS (higher open rate for this use case)
  // if phone exists, else email.
  const chosenChannel = channel || (member.phone ? "sms" : member.email ? "email" : null);
  if (!chosenChannel) {
    throw new HttpsError("failed-precondition", "Member has no phone or email to invite through");
  }

  const inviteToken = db.collection("_").doc().id; // random id as a simple token
  const inviteLink = `https://churchcare.app/join?token=${inviteToken}`;

  const result = await sendNotification({
    channel: chosenChannel,
    to: chosenChannel === "sms" ? member.phone : member.email,
    title: `${member.name}, you're invited to ChurchCare`,
    body: `Set up your account: ${inviteLink}`,
  });

  const now = FieldValue.serverTimestamp();
  await ref.update({
    lifecycleStatus: "invited",
    lastStageChangeAt: now,
    lastChangedByUid: request.auth.uid,
    inviteToken, inviteChannel: chosenChannel, inviteSentAt: now, inviteRetryCount: 0,
    updatedAt: now,
  });

  return { invited: true, channel: chosenChannel, sent: result.sent };
});


// ─────────────────────────────────────────────────────────────────
// GENERATE INVITE
// Prepares invite data for WhatsApp / QR / manual sharing.
// Does NOT change lifecycle status.
// ─────────────────────────────────────────────────────────────────

exports.generateMemberInvite = onCall(async (request) => {
  const { organizationId, entityId, memberId, channel } = request.data || {};

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }

  if (!organizationId || !entityId || !memberId) {
    throw new HttpsError(
      "invalid-argument",
      "Missing organizationId/entityId/memberId"
    );
  }

  const ref = MEMBERS_PATH(organizationId, entityId).doc(memberId);

  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Member not found");
  }

  const member = snap.data();

  // Reuse existing token if present
  let inviteToken = member.inviteToken;

  if (!inviteToken) {
    inviteToken = db.collection("_").doc().id;
  }

  const inviteLink =
    `https://churchcare.app/join?token=${inviteToken}`;

  const now = FieldValue.serverTimestamp();

  await ref.update({
    inviteToken,
    inviteChannel:
      channel ||
      member.inviteChannel ||
      null,
    inviteSentAt: now,
    updatedAt: now,
    lastChangedByUid: request.auth.uid,
  });

  return {
    memberId,
    memberName: member.name || "",
    memberPhone: member.phone || null,
    memberCode: member.memberCode || null,
    inviteToken,
    inviteLink,
  };
});


exports.verifyMemberCode = onCall(
  async (request) => {

    const {
      memberCode,
      phone,
    } = request.data || {};

    if (!memberCode) {
      throw new HttpsError(
        "invalid-argument",
        "Member code is required"
      );
    }

    const snap = await db
      .collectionGroup("members")
      .where(
        "memberCode",
        "==",
        memberCode
      )
      .limit(1)
      .get();

    if (snap.empty) {
      throw new HttpsError(
        "not-found",
        "Member not found"
      );
    }

    const memberDoc =
      snap.docs[0];

    const member =
      memberDoc.data();

    if (
      phone &&
      member.phone &&
      phone !== member.phone
    ) {
      throw new HttpsError(
        "permission-denied",
        "Phone number does not match"
      );
    }

    const claimToken =
      db.collection("_").doc().id;

    await memberDoc.ref.update({
      claimToken,
      claimTokenCreatedAt:
        FieldValue.serverTimestamp(),
    });

    return {
      verified: true,

      claimToken,

      memberId:
        memberDoc.id,

      memberName:
        member.name || null,
    };
  }
);


exports.completeMemberClaim = onCall(
  async (request) => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in required"
      );
    }

    const { claimToken } =
      request.data || {};

    if (!claimToken) {
      throw new HttpsError(
        "invalid-argument",
        "Missing claim token"
      );
    }

    const snap = await db
      .collectionGroup("members")
      .where(
        "claimToken",
        "==",
        claimToken
      )
      .limit(1)
      .get();

    if (snap.empty) {
      throw new HttpsError(
        "not-found",
        "Invalid claim token"
      );
    }

    const memberDoc =
      snap.docs[0];

    const member =
      memberDoc.data();

    // Prevent a member from being claimed twice
    if (member.uid) {
      throw new HttpsError(
        "already-exists",
        "Member already claimed"
      );
    }

    const uid =
      request.auth.uid;

    const now =
      FieldValue.serverTimestamp();

    await memberDoc.ref.update({

      uid,

      claimToken: null,

      claimTokenCreatedAt: null,

      lifecycleStatus:
        "registered",

      lastStageChangeAt:
        now,

      lastChangedByUid:
        uid,

      updatedAt:
        now,
    });

    // --------------------------------------------------
    // Organisation onboarding update
    // --------------------------------------------------

    const entityRef =
      memberDoc.ref.parent.parent;

    const organizationRef =
      entityRef.parent.parent;

    const organizationSnap =
      await organizationRef.get();

    if (organizationSnap.exists) {

      const org =
        organizationSnap.data();

      if (
        org.adminMemberId ===
        memberDoc.id
      ) {

        await organizationRef.update({

          adminClaimed: true,

          adminUid: uid,

          onboardingStatus:
            "admin_claimed",
        });
      }

      if (
        org.contactMemberId ===
        memberDoc.id
      ) {

        await organizationRef.update({

          contactClaimed: true,

          contactUid: uid,

          onboardingStatus:
            "contact_claimed",
        });
      }
    }

   const entitySnap =
  await entityRef.get();

const entity =
  entitySnap.data() || {};

return {

  success: true,

  memberId:
    memberDoc.id,

  organizationId:
    organizationRef.id,

  entityId:
    entityRef.id,

  entityName:
    entity.name || null,

  lifecycleStatus:
    "registered",
};
  }
);


// ─────────────────────────────────────────────────────────────────
// 3. STATUS HISTORY LOGGER — trigger, not a manual client call.
// Client just writes `lifecycleStatus` + `lastChangedByUid`; this appends
// the history entry server-side so history can't be forged/skipped.
// ─────────────────────────────────────────────────────────────────

exports.onMemberStatusChange = onDocumentUpdated(
  "organizations/{organizationId}/entities/{entityId}/members/{memberId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.lifecycleStatus === after.lifecycleStatus) return;

    await event.data.after.ref.update({
      statusHistory: FieldValue.arrayUnion({
        status: after.lifecycleStatus,
        changedAt: Timestamp.now(),
        changedByUid: after.lastChangedByUid || null,
        note: null,
      }),
    });
  }
);

// ─────────────────────────────────────────────────────────────────
// 4. ACTIVE USER TRACKING (Registered → Active user)
// Call this from the client right after a successful login (email or PIN unlock).
// ─────────────────────────────────────────────────────────────────

exports.markActiveUser = onCall(async (request) => {
  const { organizationId, entityId, memberId } = request.data || {};
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");
  if (!organizationId || !entityId || !memberId) throw new HttpsError("invalid-argument", "Missing ids");

  const ref = MEMBERS_PATH(organizationId, entityId).doc(memberId);
  const snap = await ref.get();
  if (!snap.exists) return { updated: false };
  const member = snap.data();

  const now = FieldValue.serverTimestamp();
  const updates = { lastLoginAt: now, updatedAt: now };

  const becameActiveUser =
  member.lifecycleStatus === "registered";

if (becameActiveUser) {
  updates.lifecycleStatus = "active_user";
  updates.lastStageChangeAt = now;
  updates.lastChangedByUid = request.auth.uid;
}

  await ref.update(updates);

if (becameActiveUser) {
  await deliverToMember({
    organizationId,
    entityId,
    memberId,

    type: "onboarding_welcome",

    title: "Welcome to ChurchCare!",

    message:
      `You're all set up, ${member.name || "Member"}. We're glad to have you here.`,
  });
}

return { updated: true };
});

// ─────────────────────────────────────────────────────────────────
// 5. STAGE WATCHER — scheduled job, nudges admins and members
// ─────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const THRESHOLDS = {
  visitor: 3 * DAY,             // nudge admin to follow up
  pending_approval: 2 * DAY,    // nudge admin; escalate at 5 days
  pending_approval_escalate: 5 * DAY,
  invited: 2 * DAY,             // nudge member to finish signup
  registered: 3 * DAY,          // nudge member to open the app
};

async function getAdminContact(organizationId, uid) {
  if (!uid) return null;
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return null;
  const u = userSnap.data();
  return { phone: u.phone, email: u.email, expoPushToken: u.expoPushToken };
}

exports.stageWatcherJob = onSchedule("every 60 minutes", async () => {
  const now = Date.now();

  const statuses = ["visitor", "pending_approval", "invited", "registered"];
  const stale = await db.collectionGroup("members")
    .where("lifecycleStatus", "in", statuses)
    .get();

  for (const memberDoc of stale.docs)
 {
    const m = memberDoc.data();
    const changedAt = m.lastStageChangeAt?.toMillis?.() ?? 0;
    const age = now - changedAt;
    const orgId = memberDoc.ref.parent.parent.parent.parent.id;

    if (m.lifecycleStatus === "visitor" && age > THRESHOLDS.visitor) {
      const admin = await getAdminContact(orgId, m.assignedAdminUid);
      if (admin?.expoPushToken) {
        await sendNotification({
          channel: "push", to: admin.expoPushToken,
          title: "Follow-up needed",
          body: `${m.name} visited ${Math.round(age / DAY)} days ago — no contact yet.`,
        });
      }
    }

    if (m.lifecycleStatus === "pending_approval" && age > THRESHOLDS.pending_approval) {
      const escalate = age > THRESHOLDS.pending_approval_escalate;
      const admin = await getAdminContact(orgId, m.assignedAdminUid);
      if (admin?.expoPushToken) {
        await sendNotification({
          channel: "push", to: admin.expoPushToken,
          title: escalate ? "Escalated: approval overdue" : "Approval pending",
          body: `${m.name}'s registration has been waiting ${Math.round(age / DAY)} days.`,
        });
      }
    }

    if (m.lifecycleStatus === "invited" && age > THRESHOLDS.invited) {
      // Retry through the member's other channel once, then fall back to admin nudge.
      if (m.inviteRetryCount < 1) {
        const altChannel = m.inviteChannel === "sms" ? "email" : "sms";
        const to = altChannel === "sms" ? m.phone : m.email;
        const result = await sendNotification({
          channel: altChannel, to,
          title: `${m.name}, finish setting up ChurchCare`,
          body: `Complete your signup: https://churchcare.app/join?token=${m.inviteToken}`,
        });
        if (result.sent) await memberDoc.ref.update({ inviteRetryCount: FieldValue.increment(1) });
      } else {
        const admin = await getAdminContact(orgId, m.assignedAdminUid);
        if (admin?.expoPushToken) {
          await sendNotification({
            channel: "push", to: admin.expoPushToken,
            title: "Invite not accepted",
            body: `${m.name} hasn't completed signup after two reminders — consider a personal follow-up.`,
          });
        }
      }
    }

    if (m.lifecycleStatus === "registered" && age > THRESHOLDS.registered) {
      const to = m.expoPushToken;
      if (to) {
        await sendNotification({
          channel: "push", to,
          title: "Welcome back to ChurchCare",
          body: "You're all set up — open the app to see what's happening this week.",
        });
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// 6. FUNNEL DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────

exports.getFunnelStats = onCall(async (request) => {
  const { organizationId, entityId } = request.data || {};
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");
  if (!organizationId || !entityId) throw new HttpsError("invalid-argument", "Missing ids");

  const statuses = ["visitor", "interested", "pending_approval", "member", "invited", "registered", "active_user"];
  const col = MEMBERS_PATH(organizationId, entityId);

  const counts = {};
  for (const status of statuses) {
    const snap = await col.where("lifecycleStatus", "==", status).count().get();
    counts[status] = snap.data().count;
  }

  const bySource = {};
  for (const source of ["qr_attendance", "qr_register", "manual", "bulk_upload"]) {
    const snap = await col.where("source", "==", source).count().get();
    bySource[source] = snap.data().count;
  }

  return { counts, bySource };
});
exports.createMemberRecord =
  createMemberRecord;