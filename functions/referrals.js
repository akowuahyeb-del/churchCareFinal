const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { grantEntitlement } = require("./entitlements");

const db = getFirestore();

// ---------------------------------------------------------------------
// REFERRAL CODES (Sprint 4)
// ---------------------------------------------------------------------

function generateCode(orgId) {
  // Short, human-shareable: last 4 of org id + 3 random alnum chars.
  const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += pool[Math.floor(Math.random() * pool.length)];
  return `${(orgId || "").slice(-4).toUpperCase()}${suffix}`;
}

exports.ensureReferralCode = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const { organizationId } = request.data || {};
  if (!organizationId) throw new HttpsError("invalid-argument", "Missing organizationId");

  const orgRef = db.collection("organizations").doc(organizationId);
  const snap = await orgRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Organization not found");

  if (snap.data().referralCode) {
    return { success: true, referralCode: snap.data().referralCode };
  }

  let code;
  let attempts = 0;
  do {
    code = generateCode(organizationId);
    const clash = await db.collection("organizations")
      .where("referralCode", "==", code).limit(1).get();
    if (clash.empty) break;
    attempts++;
  } while (attempts < 10);

  await orgRef.update({ referralCode: code });
  return { success: true, referralCode: code };
});

// Called during a NEW church's registration flow, if they entered a
// referral code. Records the link as "pending" — it only becomes
// "qualified" once the referred church has been active through one
// full billing cycle (see onSubscriptionActivated below), preventing
// reward farming via throwaway sign-ups.
exports.trackReferral = onCall(async (request) => {
  const { refereeOrgId, referralCode } = request.data || {};
  if (!refereeOrgId || !referralCode) {
    throw new HttpsError("invalid-argument", "Missing refereeOrgId or referralCode");
  }

  const referrerSnap = await db.collection("organizations")
    .where("referralCode", "==", referralCode.trim().toUpperCase())
    .limit(1).get();

  if (referrerSnap.empty) {
    throw new HttpsError("not-found", "Invalid referral code");
  }

  const referrerOrgId = referrerSnap.docs[0].id;
  if (referrerOrgId === refereeOrgId) {
    throw new HttpsError("invalid-argument", "Cannot refer your own organization");
  }

  const ref = db.collection("referrals").doc();
  await ref.set({
    referrerOrgId,
    refereeOrgId,
    referralCode: referralCode.trim().toUpperCase(),
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return { success: true, referralId: ref.id };
});

// ---------------------------------------------------------------------
// REFERRAL TOKENS (Sprint 5) — append-only ledger, never a direct
// balance edit, so every token movement is auditable.
// ---------------------------------------------------------------------

async function awardTokens({ organizationId, amount, reason, relatedId }) {
  const orgRef = db.collection("organizations").doc(organizationId);

  await db.runTransaction(async (tx) => {
    tx.update(orgRef, { tokenBalance: FieldValue.increment(amount) });
    tx.set(orgRef.collection("tokenLedger").doc(), {
      amount,
      reason, // "referral" | "promo" | "engagement" | "redeemed"
      relatedId: relatedId || null,
      createdAt: new Date().toISOString(),
    });
  });
}

const REFERRAL_REWARD_TOKENS = 100;

// ASSUMPTION: subscription doc at organizations/{orgId}/subscription/current
// transitions to status "active" once a referred church's first paid
// billing cycle completes. If your activation event lives elsewhere
// (e.g. a Paystack webhook function), call markReferralQualified()
// (exported below) from there instead of relying on this trigger.
exports.onSubscriptionActivated = onDocumentUpdated(
  "organizations/{organizationId}/subscription/current",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    if (before.status === "active" || after.status !== "active") return;

    const { organizationId } = event.params;
    await markReferralQualified(organizationId);
  }
);

async function markReferralQualified(refereeOrgId) {
  const pendingSnap = await db.collection("referrals")
    .where("refereeOrgId", "==", refereeOrgId)
    .where("status", "==", "pending")
    .limit(1).get();

  if (pendingSnap.empty) return;

  const referralDoc = pendingSnap.docs[0];
  const referral = referralDoc.data();
  const now = new Date().toISOString();

  await referralDoc.ref.update({ status: "qualified", qualifiedAt: now });

  await awardTokens({
    organizationId: referral.referrerOrgId,
    amount: REFERRAL_REWARD_TOKENS,
    reason: "referral",
    relatedId: referralDoc.id,
  });

  await referralDoc.ref.update({ status: "rewarded", rewardedAt: now });

  await db.collection("organizations").doc(referral.referrerOrgId)
    .collection("notifications").add({
      type: "referral_rewarded",
      title: "🎉 Referral reward earned!",
      message: `A church you referred is now active — you've earned ${REFERRAL_REWARD_TOKENS} tokens.`,
      read: false,
      createdAt: now,
    });
}

module.exports.awardTokens = awardTokens;
module.exports.markReferralQualified = markReferralQualified;