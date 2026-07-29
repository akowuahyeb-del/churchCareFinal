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

    // --------------------------------------------------
    // Load Organization
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Validate Status
    // --------------------------------------------------

    if (org.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        `Organization is not pending (current status: ${org.status})`
      );
    }

    // --------------------------------------------------
    // Load Primary Entity
    // --------------------------------------------------

    const entitiesSnap = await db
      .collection("organizations")
      .doc(organizationId)
      .collection("entities")
      .get();

    const entityDoc =
      entitiesSnap.docs[0];

    if (!entityDoc) {
      throw new HttpsError(
        "failed-precondition",
        "No entity found for this organization"
      );
    }

    const entityId =
      entityDoc.id;

    // --------------------------------------------------
    // Activate Organization
    // --------------------------------------------------

    const now =
      new Date().toISOString();

    await orgRef.update({
      status: "active",
      approvedAt: now,
    });

    // --------------------------------------------------
    // Activate Entity
    // --------------------------------------------------

    await entityDoc.ref.update({
      status: "active",
      approvedAt: now,
    });

    // --------------------------------------------------
    // Structure Settings
    // --------------------------------------------------

    const templateId =
      org.templateId || "presbyterian";

    await db
      .collection("organizations")
      .doc(organizationId)
      .collection("settings")
      .doc("structure")
      .set(
        {
          templateId,
          status: "active",
          organizationId,
          entityId,
          activatedAt: now,
        },
        { merge: true }
      );

    // --------------------------------------------------
    // Governance Node
    // --------------------------------------------------

    const governanceNodeRef = db
      .collection("governanceNodes")
      .doc();

    await governanceNodeRef.set({
      name: org.name,

      levelId: org.levelId,

      organizationId,

      entityId,

      parentNodeId: null,

      templateId,

      status: "active",

      pendingLink: true,

      createdAt: now,
      updatedAt: now,
    });

    await orgRef.update({
      governanceNodeId:
        governanceNodeRef.id,
    });


    // --------------------------------------------------
    // TEMPORARY RETURN
    // --------------------------------------------------

    return {
      success: true,

      organizationId,

      entityId,

      governanceNodeId:
        governanceNodeRef.id,

      templateId,

      approvedAt: now,
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

    return {
      success: true,
      organizationId,
    };
  });
  