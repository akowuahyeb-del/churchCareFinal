const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { grantEntitlement } = require("./entitlements");

const db = getFirestore();

// ---------------------------------------------------------------------
// WAIVERS — hardship / grace period requests
// ---------------------------------------------------------------------

exports.requestWaiver = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { organizationId, type, reason, periodCovered } = request.data || {};
  const VALID_TYPES = ["payment_waiver", "grace_period", "downgrade_protection"];

  if (!organizationId || !VALID_TYPES.includes(type) || !reason?.trim()) {
    throw new HttpsError("invalid-argument", "Missing organizationId, type, or reason");
  }

  const ref = db.collection("waivers").doc();
  await ref.set({
    organizationId,
    type,
    reason: reason.trim(),
    periodCovered: periodCovered || null,
    status: "pending",
    requestedBy: request.auth.uid,
    createdAt: new Date().toISOString(),
  });

  return { success: true, waiverId: ref.id };
});

exports.decideWaiver = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  // TODO: gate to super_admin once custom claims exist.

  const { waiverId, decision, note, grantedMonths } = request.data || {};
  if (!waiverId || !["approved", "denied"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Missing waiverId or invalid decision");
  }

  const ref = db.collection("waivers").doc(waiverId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Waiver request not found");

  const waiver = snap.data();
  if (waiver.status !== "pending") {
    throw new HttpsError("failed-precondition", "This request has already been decided");
  }

  const now = new Date().toISOString();

  await ref.update({
    status: decision,
    decidedBy: request.auth.uid,
    decidedAt: now,
    decisionNote: note || "",
  });

  let entitlementId = null;

  if (decision === "approved") {
    let expiresAt = null;
    if (waiver.type === "grace_period" && grantedMonths) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + Number(grantedMonths));
      expiresAt = expiry.toISOString();
    }

   const entitlementType =
  waiver.type === "downgrade_protection"
    ? "subscription_protection"
    : "free_months";

entitlementId = await grantEntitlement({
  organizationId: waiver.organizationId,
  type: entitlementType,
  value: grantedMonths || 1,
  source: "waiver",
  sourceId: waiverId,
  grantedBy: request.auth.uid,
  expiresAt,
  note: `Waiver approved: ${waiver.type} — ${waiver.reason}`,
});

    await ref.update({ entitlementId });
  }

  return { success: true, entitlementId };
});