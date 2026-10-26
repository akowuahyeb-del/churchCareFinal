const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getApps, initializeApp } = require("firebase-admin/app");

if (!getApps().length) initializeApp();
const db = getFirestore();

// ---------------------------------------------------------------------
// ENTITLEMENTS ENGINE
//
// Every promo, waiver, referral reward, and marketplace redemption
// grants access by writing an entitlement here — never by touching the
// subscription/plan doc directly. getEffectiveLimits() is the single
// place that merges plan + addons + entitlements, so nothing downstream
// needs to know HOW a church got extra capacity, only that it has it.
// ---------------------------------------------------------------------

const ENTITLEMENT_TYPES = [
  "extra_members",
  "extra_admins",
  "feature_unlock",
  "discount_percent",
  "free_months",
];

async function grantEntitlement({
  organizationId,
  type,
  value,
  source, // "promo" | "referral" | "waiver" | "marketplace" | "manual"
  sourceId,
  grantedBy,
  expiresAt = null,
  note = "",
}) {
  if (!ENTITLEMENT_TYPES.includes(type)) {
    throw new HttpsError("invalid-argument", `Unknown entitlement type: ${type}`);
  }

  const ref = db
    .collection("organizations").doc(organizationId)
    .collection("entitlements").doc();

  await ref.set({
    type,
    value,
    source,
    sourceId: sourceId || null,
    grantedBy: grantedBy || "system",
    note,
    active: true,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}

async function revokeEntitlement(organizationId, entitlementId, revokedBy) {
  await db
    .collection("organizations").doc(organizationId)
    .collection("entitlements").doc(entitlementId)
    .update({
      active: false,
      revokedBy: revokedBy || "system",
      revokedAt: new Date().toISOString(),
    });
}

// Merges plan limits + addons + active, non-expired entitlements.
// ASSUMPTION: plan doc shape matches constants/subscriptionPlans.js —
// { maxMembers, maxAdmins } with null meaning unlimited. Addons live on
// organizations/{orgId}/subscription/current as
// { addons: { extraMembers, extraAdmins } }. Adjust if your real schema
// differs — this function is the only place that needs to change.
async function getEffectiveLimits(organizationId) {
  const now = new Date().toISOString();

  const [subSnap, entitlementsSnap] = await Promise.all([
    db.collection("organizations").doc(organizationId)
      .collection("subscription").doc("current").get(),
    db.collection("organizations").doc(organizationId)
      .collection("entitlements")
      .where("active", "==", true)
      .get(),
  ]);

  const sub = subSnap.exists ? subSnap.data() : {};
  const baseMaxMembers = sub.plan?.maxMembers ?? null; // null = unlimited
  const baseMaxAdmins = sub.plan?.maxAdmins ?? null;

  let extraMembers = sub.addons?.extraMembers || 0;
  let extraAdmins = sub.addons?.extraAdmins || 0;
  let discountPercent = 0;
  let freeMonths = 0;
  const unlockedFeatures = new Set(sub.plan?.features || []);

  entitlementsSnap.docs.forEach((d) => {
    const e = d.data();
    if (e.expiresAt && e.expiresAt < now) return; // expired, ignore

    switch (e.type) {
      case "extra_members":
        extraMembers += Number(e.value) || 0;
        break;
      case "extra_admins":
        extraAdmins += Number(e.value) || 0;
        break;
      case "feature_unlock":
        unlockedFeatures.add(e.value);
        break;
      case "discount_percent":
        discountPercent = Math.min(100, discountPercent + (Number(e.value) || 0));
        break;
      case "free_months":
        freeMonths += Number(e.value) || 0;
        break;
    }
  });

  return {
    maxMembers: baseMaxMembers === null ? null : baseMaxMembers + extraMembers,
    maxAdmins: baseMaxAdmins === null ? null : baseMaxAdmins + extraAdmins,
    features: Array.from(unlockedFeatures),
    discountPercent,
    freeMonths,
  };
}

// ---------------------------------------------------------------------
// CALLABLE: manual grant (Super Admin console use — e.g. pilot church
// access, conference demo accounts)
// ---------------------------------------------------------------------

exports.grantManualEntitlement = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  // TODO: once admin custom claims exist, gate this to super_admin only.

  const { organizationId, type, value, expiresAt, note } = request.data || {};
  if (!organizationId || !type) {
    throw new HttpsError("invalid-argument", "Missing organizationId or type");
  }

  const entitlementId = await grantEntitlement({
    organizationId,
    type,
    value,
    source: "manual",
    grantedBy: request.auth.uid,
    expiresAt: expiresAt || null,
    note: note || "",
  });

  return { success: true, entitlementId };
});

exports.getOrganizationEffectiveLimits = onCall(async (request) => {
  const { organizationId } = request.data || {};
  if (!organizationId) throw new HttpsError("invalid-argument", "Missing organizationId");
  return await getEffectiveLimits(organizationId);
});

module.exports.grantEntitlement = grantEntitlement;
module.exports.revokeEntitlement = revokeEntitlement;
module.exports.getEffectiveLimits = getEffectiveLimits;