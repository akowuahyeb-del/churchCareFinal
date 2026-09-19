const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const db = getFirestore();

exports.mergeMembers = onCall(
  async (request) => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in required"
      );
    }

    const {
      organizationId,
      entityId,
      duplicateMemberId,
      masterMemberId,
    } = request.data || {};

    if (
      !organizationId ||
      !entityId ||
      !duplicateMemberId ||
      !masterMemberId
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Missing parameters"
      );
    }

    if (
      duplicateMemberId ===
      masterMemberId
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot merge member into itself"
      );
    }

    const duplicateRef =
      db
        .collection("organizations")
        .doc(organizationId)
        .collection("entities")
        .doc(entityId)
        .collection("members")
        .doc(duplicateMemberId);

    await duplicateRef.update({
      lifecycleStatus: "duplicate",

      duplicateOf:
        masterMemberId,

      mergedAt:
        FieldValue.serverTimestamp(),

      active: false,
    });

    return {
      success: true,
    };
  }
);