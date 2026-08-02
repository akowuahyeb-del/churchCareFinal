// functions/notify.js
const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

async function sendPush(token, title, body, data = {}) {
  if (!token) return { sent: false, reason: "no_token" };
  console.log(`[push] (stub) -> ${token}: ${title} — ${body}`);
  return { sent: true, stub: true };
}

// Fans out to: the member's own subcollection (works even before they
// have an auth uid), the linked user's feed if uid exists (what
// HomeScreen's notification bell already listens to), and push if a
// token is on file. Missing channels no-op rather than failing the send.
async function deliverToMember({ organizationId, entityId, memberId, type, title, message, data = {} }) {
  const memberRef = db.collection("organizations").doc(organizationId)
    .collection("entities").doc(entityId).collection("members").doc(memberId);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) return { delivered: false, reason: "member_not_found" };
  const member = memberSnap.data();

  const now = new Date().toISOString();
  const payload = { type, title, message, organizationId, entityId, memberId, data, read: false, createdAt: now };

  await memberRef.collection("notifications").add(payload);
  if (member.uid) {
    await db.collection("users").doc(member.uid).collection("notifications").add(payload);
  }
  if (member.expoPushToken) {
    await sendPush(member.expoPushToken, title, message, data);
  }
  return { delivered: true };
}

// Rate-limit guard for system-generated notifications — stops e.g. the
// absence watcher re-notifying the same member every time it runs.
async function shouldSendSystemNotification({ organizationId, entityId, memberId, type, cooldownHours = 24 }) {
  const cutoff = new Date(Date.now() - cooldownHours * 3600 * 1000).toISOString();
  const snap = await db.collection("organizations").doc(organizationId)
    .collection("entities").doc(entityId).collection("members").doc(memberId)
    .collection("notifications")
    .where("type", "==", type)
    .where("createdAt", ">=", cutoff)
    .limit(1)
    .get();
  return snap.empty;
}

module.exports = { deliverToMember, shouldSendSystemNotification, sendPush };