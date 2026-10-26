const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { grantEntitlement } = require("./entitlements");

const db = getFirestore();

// ---------------------------------------------------------------------
// PROMOTIONS & PROMO CODES
// ---------------------------------------------------------------------

exports.createPromotion = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  // TODO: gate to super_admin once custom claims exist.

  const {
    code, type, value, maxRedemptions, perOrgLimit,
    validFrom, validUntil, applicablePlans, label,
  } = request.data || {};

  const VALID_TYPES = ["percent_off", "fixed_off", "free_trial_days", "free_addon"];
  if (!code || !VALID_TYPES.includes(type)) {
    throw new HttpsError("invalid-argument", "Missing or invalid code/type");
  }

  const normalizedCode = code.trim().toUpperCase();

  const existing = await db.collection("promotions").doc(normalizedCode).get();
  if (existing.exists) {
    throw new HttpsError("already-exists", "A promotion with this code already exists");
  }

  await db.collection("promotions").doc(normalizedCode).set({
    code: normalizedCode,
    label: label || normalizedCode,
    type,
    value,
    maxRedemptions: maxRedemptions ?? null, // null = unlimited
    perOrgLimit: perOrgLimit ?? 1,
    redemptionCount: 0,
    validFrom: validFrom || null,
    validUntil: validUntil || null,
    applicablePlans: applicablePlans || null, // null = all plans
    active: true,
    createdBy: request.auth.uid,
    createdAt: new Date().toISOString(),
  });

  return { success: true, code: normalizedCode };
});

exports.redeemPromoCode = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { organizationId, code } = request.data || {};
  if (!organizationId || !code) {
    throw new HttpsError("invalid-argument", "Missing organizationId or code");
  }

  const normalizedCode = code.trim().toUpperCase();
  const promoRef = db.collection("promotions").doc(normalizedCode);

  const result = await db.runTransaction(async (tx) => {
    const promoSnap = await tx.get(promoRef);
    if (!promoSnap.exists) {
      throw new HttpsError("not-found", "Invalid promo code");
    }

    const promo = promoSnap.data();
    const now = new Date().toISOString();

    if (!promo.active) throw new HttpsError("failed-precondition", "This code is no longer active");
    if (promo.validFrom && now < promo.validFrom) throw new HttpsError("failed-precondition", "This code isn't active yet");
    if (promo.validUntil && now > promo.validUntil) throw new HttpsError("failed-precondition", "This code has expired");
    if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
      throw new HttpsError("resource-exhausted", "This code has reached its redemption limit");
    }

    const redemptionRef = promoRef.collection("redemptions").doc(organizationId);
    const redemptionSnap = await tx.get(redemptionRef);

    const priorCount = redemptionSnap.exists ? redemptionSnap.data().count || 0 : 0;
    if (priorCount >= (promo.perOrgLimit ?? 1)) {
      throw new HttpsError("already-exists", "This church has already used this code");
    }

    tx.set(redemptionRef, {
      count: priorCount + 1,
      lastRedeemedAt: now,
      redeemedBy: request.auth.uid,
    }, { merge: true });

    tx.update(promoRef, { redemptionCount: (promo.redemptionCount || 0) + 1 });

    return promo;
  });

  // Entitlement grant happens outside the transaction (grantEntitlement
  // does its own write and doesn't need transactional isolation here —
  // the redemption-count check above is what prevents double-spending).
  let entitlementId = null;
  let expiresAt = null;

  if (result.type === "free_trial_days") {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Number(result.value));
    expiresAt = expiry.toISOString();
  }

  if (result.type === "percent_off") {

  entitlementId = await grantEntitlement({
    organizationId,
    type: "discount_percent",
    value: result.value,
    source: "promo",
    sourceId: normalizedCode,
    grantedBy: request.auth.uid,
    note: `Promo: ${result.label}`,
  });

} else if (result.type === "fixed_off") {

  entitlementId = await grantEntitlement({
    organizationId,
    type: "fixed_discount",
    value: result.value,
    source: "promo",
    sourceId: normalizedCode,
    grantedBy: request.auth.uid,
    note: `Promo: ${result.label}`,
  });

} else if (result.type === "free_trial_days") {

  entitlementId = await grantEntitlement({
    organizationId,
    type: "free_months",
    value: 0,
    source: "promo",
    sourceId: normalizedCode,
    grantedBy: request.auth.uid,
    expiresAt,
    note: `Promo: ${result.label} — ${result.value} free trial days`,
  });

} else if (result.type === "free_addon") {

  entitlementId = await grantEntitlement({
    organizationId,
    type: result.value.type,
    value: result.value.amount,
    source: "promo",
    sourceId: normalizedCode,
    grantedBy: request.auth.uid,
    note: `Promo: ${result.label}`,
  });

}

  return { success: true, promoType: result.type, entitlementId };
});