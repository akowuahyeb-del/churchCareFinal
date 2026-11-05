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

  const {
  name,
  tokenCost,
  type,
  stock,
  fulfillment,
  category,
} = request.data || {};
  const VALID_TYPES = ["entitlement", "donation", "beta_access"];

  if (!name || !VALID_TYPES.includes(type) || !tokenCost) {
    throw new HttpsError("invalid-argument", "Missing name, type, or tokenCost");
  }

 const ref = db.collection("marketplaceItems").doc();

await ref.set({
  name,
  type,
  category: category || "general",
  tokenCost: Number(tokenCost),
  stock: stock ?? null,
  fulfillment: fulfillment || null,
  redemptionCount: 0,
  active: true,
  createdAt: new Date().toISOString(),
});

return {
  success: true,
  itemId: ref.id,
};

});

exports.redeemMarketplaceItem = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const {
  organizationId,
  entityId,
  memberId,
  itemId,
} = request.data || {};
  if (
  !organizationId ||
  !entityId ||
  !memberId ||
  !itemId
) {
  throw new HttpsError(
    "invalid-argument",
    "Missing organizationId, entityId, memberId or itemId"
  );
}
const itemRef =
  db.collection("marketplaceItems")
    .doc(itemId);

const memberRef =
  db.collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("members")
    .doc(memberId);
const { item, newBalance } =
  await db.runTransaction(async (tx) => {

    const [itemSnap, memberSnap] =
      await Promise.all([
        tx.get(itemRef),
        tx.get(memberRef),
      ]);
      if (!memberSnap.exists) {
  throw new HttpsError(
    "not-found",
    "Member not found"
  );
}

    if (!itemSnap.exists) throw new HttpsError("not-found", "Marketplace item not found");
    const itemData = itemSnap.data();

    if (!itemData.active) throw new HttpsError("failed-precondition", "This item is no longer available");
    if (itemData.stock !== null && itemData.stock <= 0) {
      throw new HttpsError("resource-exhausted", "This item is out of stock");
    }

   const balance =
  memberSnap.data()?.rewardPoints || 0;
   if (balance < itemData.tokenCost) {
  throw new HttpsError(
    "failed-precondition",
    "Not enough reward points for this item"
  );
}

   tx.update(
  memberRef,
  {
    rewardPoints:
      FieldValue.increment(
        -itemData.tokenCost
      ),
  }
);

tx.set(
  memberRef
    .collection("rewardLedger")
    .doc(),
  {
    amount:
      -itemData.tokenCost,

    rewardType:
      "marketplace",

    reason:
      "marketplace_redemption",

    relatedId:
      itemId,

    redemptionStatus:
      "approved",

    redemptionRequestedAt:
      new Date().toISOString(),

    createdAt:
      new Date().toISOString(),
  }
);

    const updatePayload = {
  redemptionCount:
    FieldValue.increment(1),
};

if (itemData.stock !== null) {
  updatePayload.stock =
    FieldValue.increment(-1);
}

tx.update(
  itemRef,
  updatePayload
);

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

 await db
  .collection("organizations")
  .doc(organizationId)
  .collection("marketplaceRedemptions")
  .add({
    itemId,
    itemName: item.name,

    pointsCost:
      item.tokenCost,

    memberId,
    entityId,

    entitlementId,

    redeemedBy:
      request.auth.uid,

    redeemedAt:
      new Date().toISOString(),
  });

  return { success: true, newBalance, entitlementId };
});