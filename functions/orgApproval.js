// functions/orgApproval.js

const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const {
  getApps,
  initializeApp,
} = require("firebase-admin/app");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

exports.approveOrganization =
  onCall(async (request) => {

    const { organizationId } =
      request.data || {};

    if (!organizationId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing organizationId"
      );
    }

    return {
      success: true,
      organizationId,
    };
  });

exports.rejectOrganization =
  onCall(async (request) => {

    const { organizationId } =
      request.data || {};

    if (!organizationId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing organizationId"
      );
    }

    const orgRef = db
  .collection("organizations")
  .doc(organizationId);

const orgSnap = await orgRef.get();

if (!orgSnap.exists) {
  throw new HttpsError(
    "not-found",
    "Organization not found"
  );
}

const org = {
  id: orgSnap.id,
  ...orgSnap.data(),
};

return {
  success: true,

  organizationId,

  organizationName: org.name,

  currentStatus: org.status,
};
  });