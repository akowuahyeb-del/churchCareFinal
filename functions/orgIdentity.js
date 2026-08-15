const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore();

const ABBREVIATION_PATTERN =
  /^[A-Z0-9]+-[A-Z0-9]+$/;

exports.updateOrganizationIdentity =
  onCall(async (request) => {

    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const {
      organizationId,
      organizationAbbreviation,
    } = request.data || {};
if (
  !organizationId ||
  !organizationAbbreviation
) {
  throw new HttpsError(
    "invalid-argument",
    "Missing organizationId or organizationAbbreviation"
  );
}

const cleanAbbreviation =
  organizationAbbreviation
    .trim()
    .toUpperCase();

if (
  !ABBREVIATION_PATTERN.test(
    cleanAbbreviation
  )
) {
  throw new HttpsError(
    "invalid-argument",
    "Abbreviation must be CHURCH-LOCATION"
  );
}
    const orgRef =
      db.collection("organizations")
        .doc(organizationId);

    const orgSnap =
      await orgRef.get();

    if (!orgSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Organisation not found"
      );
    }

    const org =
      orgSnap.data();

const oldCode =
  org.organizationCode || "";

const segments =
  oldCode.split("-");

// PCG-POP-POP-245C-0001
//  0   1   2    3     4

if (segments.length < 4) {
  throw new HttpsError(
    "failed-precondition",
    "Invalid organization code structure"
  );
}

const denomination =
  segments[0];

const uniqueChurchId =
  segments[3];

const newOrganizationCode =
  `${denomination}-${cleanAbbreviation}-${uniqueChurchId}`;



    // Ensure code is unique
    const existing =
      await db
        .collection("organizations")
        .where(
  "organizationCode",
  "==",
  newOrganizationCode
)
        .limit(1)
        .get();

    if (
      !existing.empty &&
      existing.docs[0].id !== organizationId
    ) {
      throw new HttpsError(
        "already-exists",
        "Organisation code already in use"
      );
    }

    const batch = db.batch();

    // ----------------------------------
    // Update Organisation
    // ----------------------------------

   batch.update(orgRef, {
  organizationCode:
    newOrganizationCode,
  organizationAbbreviation:
  cleanAbbreviation,
  identityUpdatedAt:
    new Date().toISOString(),
});

    // ----------------------------------
    // Update Governance Node
    // ----------------------------------

    if (org.governanceNodeId) {

      const nodeRef =
        db.collection("governanceNodes")
          .doc(
            org.governanceNodeId
          );

   batch.update(nodeRef, {
  organizationCode:
    newOrganizationCode,
  organizationAbbreviation:
    cleanAbbreviation,
  updatedAt:
    new Date().toISOString(),
});

}

// ----------------------------------
// Update Root Entity
// ----------------------------------

    if (org.rootEntityId) {

      const entityRef =
        db.collection("organizations")
          .doc(organizationId)
          .collection("entities")
          .doc(
            org.rootEntityId
          );

      batch.update(entityRef, {
  organizationCode:
    newOrganizationCode,
});
    }

    // ----------------------------------
    // Audit Log
    // ----------------------------------

    const auditRef =
      orgRef
        .collection("auditLogs")
        .doc();

   batch.set(auditRef, {
  action:
    "organization_identity_updated",

  previousCode:
    org.organizationCode || null,

  previousAbbreviation:
    org.organizationAbbreviation || null,

  newCode:
    newOrganizationCode,

  newAbbreviation:
    cleanAbbreviation,

  updatedByUid:
    request.auth.uid,

  createdAt:
    new Date().toISOString(),
});

    await batch.commit();

    return {
  success: true,
  organizationCode:
    newOrganizationCode,
};
  });