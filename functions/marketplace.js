const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { grantEntitlement } = require("./entitlements");

const db = getFirestore();

// ---------------------------------------------------------------------
// TOKEN MARKETPLACE
// ---------------------------------------------------------------------

exports.createMarketplaceItem = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  // TODO: gate to super_admin once custom claims exist.

  const { name, tokenCost, type, stock, fulfillment } = request.data || {};
  const VALID_TYPES = ["entitlement", "donation", "beta_access"];

  if (!name || !VALID_TYPES.includes(type) || !tokenCost) {
    throw new HttpsError("invalid-argument", "Missing name, type, or tokenCost");
  }

  const ref = db.collection("marketplaceItems").doc();
  await ref.set({
    name,
    type,
    tokenCost: Number(tokenCost),
    stock: stock ?? null, // null = unlimited
    fulfillment: fulfillment || null, // e.g. { entitlementType: "extra_members", value: 25 }
    active: true,
    createdAt: new Date().toISOString(),
  });

  return { success: true, itemId: ref.id };
});

exports.redeemMarketplaceItem = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const { organizationId, itemId } = request.data || {};
  if (!organizationId || !itemId) {
    throw new HttpsError("invalid-argument", "Missing organizationId or itemId");
  }

  const itemRef = db.collection("marketplaceItems").doc(itemId);
  const orgRef = db.collection("organizations").doc(organizationId);

  const { item, newBalance } = await db.runTransaction(async (tx) => {
    const [itemSnap, orgSnap] = await Promise.all([tx.get(itemRef), tx.get(orgRef)]);

    if (!itemSnap.exists) throw new HttpsError("not-found", "Marketplace item not found");
    const itemData = itemSnap.data();

    if (!itemData.active) throw new HttpsError("failed-precondition", "This item is no longer available");
    if (itemData.stock !== null && itemData.stock <= 0) {
      throw new HttpsError("resource-exhausted", "This item is out of stock");
    }

    const balance = orgSnap.data()?.tokenBalance || 0;
    if (balance < itemData.tokenCost) {
      throw new HttpsError("failed-precondition", "Not enough tokens for this item");
    }

    tx.update(orgRef, { tokenBalance: FieldValue.increment(-itemData.tokenCost) });
    tx.set(orgRef.collection("tokenLedger").doc(), {
      amount: -itemData.tokenCost,
      reason: "redeemed",
      relatedId: itemId,
      createdAt: new Date().toISOString(),
    });

    if (itemData.stock !== null) {
      tx.update(itemRef, { stock: FieldValue.increment(-1) });
    }

    return { item: itemData, newBalance: balance - itemData.tokenCost };
  });

  let entitlementId = null;

  if (item.type === "entitlement" && item.fulfillment) {
    entitlementId = await grantEntitlement({
      organizationId,
      type: item.fulfillment.entitlementType,
      value: item.fulfillment.value,
      source: "marketplace",
      sourceId: itemId,
      grantedBy: request.auth.uid,
      note: `Marketplace: ${item.name}`,
    });
  }

  await db.collection("organizations").doc(organizationId)
    .collection("marketplaceRedemptions").add({
      itemId,
      itemName: item.name,
      tokenCost: item.tokenCost,
      entitlementId,
      redeemedBy: request.auth.uid,
      redeemedAt: new Date().toISOString(),
    });

  return { success: true, newBalance, entitlementId };
});