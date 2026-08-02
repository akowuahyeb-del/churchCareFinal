// functions/notifications.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();
const { deliverToMember, shouldSendSystemNotification } = require("./notify");
const { hasPermission } = require("./permissions");

// ── SENDER RESOLUTION — the enforcement point for the whole checklist ──
async function resolveSender(request, organizationId, entityId) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");

  if (request.auth.token?.role === "super_admin") return { isSuperAdmin: true, permissions: [] };
  const userSnap = await db.collection("users").doc(request.auth.uid).get();
  if (userSnap.exists && userSnap.data().role === "super_admin") return { isSuperAdmin: true, permissions: [] };

  if (!organizationId || !entityId) {
    throw new HttpsError("invalid-argument", "organizationId/entityId required to resolve sender permissions");
  }

  const memberSnap = await db.collection("organizations").doc(organizationId)
    .collection("entities").doc(entityId).collection("members")
    .where("uid", "==", request.auth.uid).limit(1).get();

  if (memberSnap.empty) {
    throw new HttpsError("permission-denied", "Your account isn't linked to a member record in this church");
  }
  return { isSuperAdmin: false, memberId: memberSnap.docs[0].id, permissions: memberSnap.docs[0].data().permissions || [] };
}

// ── 1. CHURCH BROADCAST ──
exports.sendChurchBroadcast = onCall(async (request) => {
  const { organizationId, entityId, title, message } = request.data || {};
  if (!organizationId || !entityId || !title?.trim() || !message?.trim()) {
    throw new HttpsError("invalid-argument", "Missing organizationId/entityId/title/message");
  }
  const sender = await resolveSender(request, organizationId, entityId);
  if (!sender.isSuperAdmin && !hasPermission(sender, "manage_members")) {
    throw new HttpsError("permission-denied", "Requires manage_members permission");
  }

  const membersSnap = await db.collection("organizations").doc(organizationId)
    .collection("entities").doc(entityId).collection("members")
    .where("lifecycleStatus", "in", ["member", "invited", "registered", "active_user"])
    .get();

  let delivered = 0;
  for (const d of membersSnap.docs) {
    const r = await deliverToMember({ organizationId, entityId, memberId: d.id, type: "church_broadcast", title: title.trim(), message: message.trim() });
    if (r.delivered) delivered++;
  }

  await db.collection("organizations").doc(organizationId).collection("entities").doc(entityId)
    .collection("notificationLogs").add({ type: "church_broadcast", title, message, sentByUid: request.auth.uid, recipientCount: delivered, createdAt: new Date().toISOString() });

  return { delivered };
});

// ── 2. INDIVIDUAL (general + disciplinary, elder-gated) ──
exports.sendIndividualNotification = onCall(async (request) => {
  const { organizationId, entityId, memberId, title, message, category } = request.data || {};
  if (!organizationId || !entityId || !memberId || !title?.trim() || !message?.trim()) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }
  const sender = await resolveSender(request, organizationId, entityId);
  if (!sender.isSuperAdmin) {
    if (category === "disciplinary" && !hasPermission(sender, "elder_approval")) {
      throw new HttpsError("permission-denied", "Disciplinary notifications require elder_approval permission");
    }
    if (category !== "disciplinary" && !hasPermission(sender, "manage_members")) {
      throw new HttpsError("permission-denied", "Requires manage_members permission");
    }
  }

  const result = await deliverToMember({ organizationId, entityId, memberId, type: category || "individual", title: title.trim(), message: message.trim() });

  await db.collection("organizations").doc(organizationId).collection("entities").doc(entityId)
    .collection("notificationLogs").add({ type: category || "individual", title, message, memberId, sentByUid: request.auth.uid, recipientCount: result.delivered ? 1 : 0, createdAt: new Date().toISOString() });

  return result;
});

// ── 5. GROUP ── (assumes member.ministry is the group key — swap for
// a `groups: string[]` array field + array-contains if you support
// multi-group membership)
exports.sendGroupNotification = onCall(async (request) => {
  const { organizationId, entityId, groupId, title, message } = request.data || {};
  if (!organizationId || !entityId || !groupId || !title?.trim() || !message?.trim()) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }
  const sender = await resolveSender(request, organizationId, entityId);
  const canSendAny = sender.isSuperAdmin || hasPermission(sender, "manage_members");
  const isGroupLeader = hasPermission(sender, `lead_group:${groupId}`);
  if (!canSendAny && !isGroupLeader) {
    throw new HttpsError("permission-denied", "Requires manage_members, or leadership of this group");
  }

  const membersSnap = await db.collection("organizations").doc(organizationId)
    .collection("entities").doc(entityId).collection("members")
    .where("ministry", "==", groupId).get();

  let delivered = 0;
  for (const d of membersSnap.docs) {
    const r = await deliverToMember({ organizationId, entityId, memberId: d.id, type: "group", title: title.trim(), message: message.trim(), data: { groupId } });
    if (r.delivered) delivered++;
  }

  await db.collection("organizations").doc(organizationId).collection("entities").doc(entityId)
    .collection("notificationLogs").add({ type: "group", groupId, title, message, sentByUid: request.auth.uid, recipientCount: delivered, createdAt: new Date().toISOString() });

  return { delivered };
});

exports.sendApprovalRequestNotifications =
  onCall(async (request) => {
    const {
      organizationId,
      entityId,
      action,
      memberId,
      memberName,
      initiatedBy,
      excludeMemberId,
    } = request.data;

    const db = getFirestore();

    const eldersSnap = await db
      .collection("organizations")
      .doc(organizationId)
      .collection("entities")
      .doc(entityId)
      .collection("members")
      .where(
        "permissions",
        "array-contains",
        "elder_approval"
      )
      .get();

    let delivered = 0;

    for (const elder of eldersSnap.docs) {
      if (elder.id === excludeMemberId) {
        continue;
      }

      await createMemberNotification({
        organizationId,
        entityId,
        memberId: elder.id,

        title: "Approval Required",

        message:
          `${initiatedBy} has requested a ` +
          `${action} action for ${memberName}.\n\n` +
          `Your approval is required before this action can proceed.`,

        category: "approval",
        type: "disciplinary_approval",
      });

      delivered++;
    }

    return {
      success: true,
      delivered,
    };
  });






// ── 6. INTELLIGENT LAYER — absence detection ──
// Fires when a member has 3 consecutive "absent" records, cooldown 14
// days so it doesn't spam. Notifies the member AND their assigned admin.
exports.absenceWatcherJob = onSchedule("every 24 hours", async () => {
  const membersSnap = await db.collectionGroup("members").where("lifecycleStatus", "==", "member").get();

  for (const memberDoc of membersSnap.docs) {
    const entityRef = memberDoc.ref.parent.parent;
    const organizationId = entityRef.parent.parent.id;
    const entityId = entityRef.id;
    const memberId = memberDoc.id;
    const member = memberDoc.data();

    const attendanceSnap = await entityRef.collection("attendance")
      .where("memberId", "==", memberId).orderBy("date", "desc").limit(3).get();
    if (attendanceSnap.size < 3) continue;
    if (!attendanceSnap.docs.every(d => d.data().status === "absent")) continue;

    const canSend = await shouldSendSystemNotification({ organizationId, entityId, memberId, type: "absence_alert", cooldownHours: 24 * 14 });
    if (!canSend) continue;

    await deliverToMember({
      organizationId, entityId, memberId, type: "absence_alert",
      title: "We missed you 🙏", message: "We noticed you've missed the last few services. We'd love to see you soon!",
    });

    if (member.assignedAdminUid) {
      await db.collection("users").doc(member.assignedAdminUid).collection("notifications").add({
        type: "absence_alert_admin", title: "Follow-up needed",
        message: `${member.name} has missed the last 3 services.`,
        organizationId, entityId, memberId, read: false, createdAt: new Date().toISOString(),
      });
    }
  }
});