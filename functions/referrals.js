const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  onDocumentUpdated,
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");
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

exports.ensureMemberReferralCode = onCall(async (request) => {

  if (!request.auth?.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const {
    organizationId,
    entityId,
    memberId,
  } = request.data || {};

  if (
    !organizationId ||
    !entityId ||
    !memberId
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Missing organizationId, entityId or memberId"
    );
  }

  const memberRef =
    db
      .collection("organizations")
      .doc(organizationId)
      .collection("entities")
      .doc(entityId)
      .collection("members")
      .doc(memberId);

  const snap =
    await memberRef.get();

  if (!snap.exists) {
    throw new HttpsError(
      "not-found",
      "Member not found"
    );
  }

  if (
    snap.data().referralCode
  ) {
    return {
      success: true,
      referralCode:
        snap.data()
          .referralCode,
    };
  }

let code;
let attempts = 0;

do {

  code =
    `${memberId
      .slice(-4)
      .toUpperCase()}${Math.floor(
        1000 + Math.random() * 9000
      )}`;

  const orgs =
    await db.collection(
      "organizations"
    ).get();

  let exists = false;

  for (const orgDoc of orgs.docs) {

    const entities =
      await orgDoc.ref
        .collection("entities")
        .get();

    for (const entityDoc of entities.docs) {

      const clash =
        await entityDoc.ref
          .collection("members")
          .where(
            "referralCode",
            "==",
            code
          )
          .limit(1)
          .get();

      if (!clash.empty) {
        exists = true;
        break;
      }
    }

    if (exists) {
      break;
    }
  }

  if (!exists) {
    break;
  }

  attempts++;

} while (attempts < 10);

await memberRef.update({
  referralCode: code,
});

  return {
    success: true,
    referralCode: code,
  };
});



async function createReferral({
  refereeOrgId,
  referralCode,
}) {

  if (!refereeOrgId || !referralCode) {
    throw new HttpsError(
      "invalid-argument",
      "Missing refereeOrgId or referralCode"
    );
  }

  const normalizedCode =
    referralCode
      .trim()
      .toUpperCase();

 let referrerOrgId = null;
let referrerEntityId = null;
let referrerMemberId = null;
let referrerType = "organization";

  /* ---------------------------------
     1. Try organization referral code
  ---------------------------------- */

  const orgMatch =
    await db.collection("organizations")
      .where(
        "referralCode",
        "==",
        normalizedCode
      )
      .limit(1)
      .get();

  if (!orgMatch.empty) {

    referrerOrgId =
      orgMatch.docs[0].id;

  }

  /* ---------------------------------
     2. Try member referral code
  ---------------------------------- */

  if (!referrerOrgId) {

    const orgs =
      await db
        .collection("organizations")
        .get();

    for (const orgDoc of orgs.docs) {

      const entities =
        await orgDoc.ref
          .collection("entities")
          .get();

      for (const entityDoc of entities.docs) {

        const memberMatch =
          await entityDoc.ref
            .collection("members")
            .where(
              "referralCode",
              "==",
              normalizedCode
            )
            .limit(1)
            .get();

        if (!memberMatch.empty) {

         referrerOrgId =
  orgDoc.id;

referrerEntityId =
  entityDoc.id;

referrerMemberId =
  memberMatch.docs[0].id;

referrerType =
  "member";

          break;
        }
      }

      if (referrerOrgId) {
        break;
      }
    }
  }

  if (!referrerOrgId) {

    throw new HttpsError(
      "not-found",
      "Invalid referral code"
    );

  }

  if (referrerOrgId === refereeOrgId) {
    throw new HttpsError(
      "invalid-argument",
      "Cannot refer your own organization"
    );
  }

  const existingReferral =
    await db.collection("referrals")
      .where(
        "refereeOrgId",
        "==",
        refereeOrgId
      )
      .limit(1)
      .get();

  if (!existingReferral.empty) {

    throw new HttpsError(
      "already-exists",
      "A referral already exists for this organization"
    );

  }

  const ref =
    db.collection("referrals").doc();

  await ref.set({
   referrerOrgId,
referrerEntityId,
referrerType,
referrerMemberId,
refereeOrgId,

    referralCode:
      normalizedCode,

    status: "pending",

    createdAt:
      new Date().toISOString(),
  });

  return {
    success: true,
    referralId: ref.id,
  };
}

exports.trackReferral = onCall(async (request) => {

  return await createReferral({
    refereeOrgId:
      request.data?.refereeOrgId,

    referralCode:
      request.data?.referralCode,
  });

});


exports.onPendingReferralCreated =
  onDocumentCreated(
    "pendingReferralLinks/{linkId}",
    async (event) => {

      const data =
        event.data.data();

      try {
await createReferral({
  refereeOrgId:
    data.refereeOrgId,

  referralCode:
    data.referralCode,
});

        await event.data.ref.update({
          status: "processed",
          processedAt:
            new Date().toISOString(),
        });

      } catch (e) {

        console.log(
          "Referral Processing Error",
          e
        );

        await event.data.ref.update({
          status: "error",
          error:
            e.message,
        });

      }
    }
  );

exports.processPendingReferralLinks = onCall(
  async () => {

    const pendingSnap =
      await db
        .collection(
          "pendingReferralLinks"
        )
        .where(
          "status",
          "==",
          "pending"
        )
        .get();

    for (
      const pendingDoc of pendingSnap.docs
    ) {

      const pending =
        pendingDoc.data();

      try {

      await createReferral({
  refereeOrgId:
    pending.refereeOrgId,

  referralCode:
    pending.referralCode,
});

        await pendingDoc.ref.update({
          status: "processed",

          processedAt:
            new Date()
              .toISOString(),
        });

      } catch (e) {

        console.log(
          "Referral processing failed:",
          e
        );

        await pendingDoc.ref.update({
          status: "error",

          error:
            e.message,
        });

      }
    }

    return {
      success: true,
    };
  }
);
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

async function awardMemberPoints({
  organizationId,
  entityId,
  memberId,
  amount,
  reason,
  relatedId,
}) {

  const memberRef =
    db
      .collection("organizations")
      .doc(organizationId)
      .collection("entities")
      .doc(entityId)
      .collection("members")
      .doc(memberId);

  await db.runTransaction(async (tx) => {

    tx.update(memberRef, {
      rewardPoints:
        FieldValue.increment(amount),
    });

    tx.set(
      memberRef
        .collection("rewardLedger")
        .doc(),
     {
  amount,
  rewardType: "points",
  reason,
  relatedId:
    relatedId || null,

  redemptionStatus: null,
  redemptionRequestedAt: null,

  createdAt:
    new Date().toISOString(),
}
    );

  });
}

async function getReferralRewardsConfig() {

  const snap = await db
    .collection("platform")
    .doc("subscriptionSettings")
    .get();

  const data = snap.exists
    ? snap.data()
    : {};

  return (
    data.referralRewards || {
      churchReferralDiscountPercent: 10,
      memberReferralPoints: 100,
      pointsPerCurrencyUnit: 10,
      minimumQualifiedMonths: 1,
      active: true,
    }
  );
}


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

const freshReferralSnap =
  await referralDoc.ref.get();

const referral =
  freshReferralSnap.data();

if (
  !referral ||
  referral.rewardedAt
) {
  return;
}

const now = new Date().toISOString();
await referralDoc.ref.update({
  status: "qualified",
  qualifiedAt: now,
});

const subscriptionSnap =
  await db
    .collection("organizations")
    .doc(refereeOrgId)
    .collection("subscription")
    .doc("current")
    .get();

const subscription =
  subscriptionSnap.data() || {};

const rewardsConfig =
  await getReferralRewardsConfig();

if (!rewardsConfig.active) {

  await referralDoc.ref.update({
    status: "qualified",
    rewardsDisabled: true,
  });

  return;
}

const churchDiscountPercent =
  rewardsConfig.churchReferralDiscountPercent || 0;

const memberPoints =
  rewardsConfig.memberReferralPoints || 0;


 if (churchDiscountPercent > 0) {

  await grantEntitlement({
    organizationId:
      referral.referrerOrgId,

    type:
      "discount_percent",

    value:
      churchDiscountPercent,

    source:
      "referral",

    sourceId:
      referralDoc.id,

    grantedBy:
      "system",

    note:
      "Referral reward",
  });

}

if (
  referral.referrerType === "member" &&
  referral.referrerMemberId &&
  referral.referrerEntityId
) {

  await awardMemberPoints({
    organizationId:
      referral.referrerOrgId,

    entityId:
      referral.referrerEntityId,

    memberId:
      referral.referrerMemberId,

    amount:
  memberPoints,

    reason:
      "referral",

    relatedId:
      referralDoc.id,
  });

}

  await referralDoc.ref.update({ status: "rewarded", rewardedAt: now });

await db.collection("organizations").doc(referral.referrerOrgId)
  .collection("notifications").add({
    type: "referral_rewarded",
    title: "🎉 Referral reward earned!",
    message:
      `A church you referred is now active. Referral rewards have been applied successfully.`,
    read: false,
    createdAt: now,
  });
}

exports.processPendingRewards = onCall(
  async () => {

    const pendingSnap =
      await db.collection("referrals")
        .where(
          "status",
          "==",
          "pending_reward"
        )
        .get();

    for (const referralDoc of pendingSnap.docs) {

   const referral =
  referralDoc.data();

if (referral.rewardedAt) {
  continue;
}

      await awardTokens({
        organizationId:
          referral.referrerOrgId,

        amount:
        0,

        reason:
          "referral",

        relatedId:
          referralDoc.id,
      });

      await referralDoc.ref.update({
        status: "rewarded",

        rewardedAt:
          new Date().toISOString(),
      });

    }

    return {
      processed:
        pendingSnap.size,
    };
  }
);


module.exports.ensureReferralCode =
  exports.ensureReferralCode;
  module.exports.ensureMemberReferralCode =
  exports.ensureMemberReferralCode;


module.exports.trackReferral =
  exports.trackReferral;
  module.exports.onPendingReferralCreated =
  exports.onPendingReferralCreated;
  module.exports.processPendingReferralLinks =
  exports.processPendingReferralLinks;

module.exports.onSubscriptionActivated =
  exports.onSubscriptionActivated;

module.exports.awardTokens =
  awardTokens;
module.exports.awardMemberPoints =
  awardMemberPoints;

module.exports.markReferralQualified =
  markReferralQualified;
  module.exports.processPendingRewards =
  exports.processPendingRewards;
