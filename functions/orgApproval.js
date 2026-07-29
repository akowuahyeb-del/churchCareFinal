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


async function validateRegistration(org) {

  const {
    templateId,
    levelId,
    name,
    location,
    denomination,
  } = org;

  if (!templateId) {
    throw new HttpsError(
      "failed-precondition",
      "Missing governance template"
    );
  }

  if (!levelId) {
    throw new HttpsError(
      "failed-precondition",
      "Missing registration level"
    );
  }

  if (!name?.trim()) {
    throw new HttpsError(
      "failed-precondition",
      "Organisation name is required"
    );
  }

  const governanceRef =
    db.collection("governanceNodes");

  switch (levelId) {

    case "national_assembly": {

      const existing = await governanceRef
        .where("status", "==", "active")
        .where("templateId", "==", templateId)
        .where("levelId", "==", "national_assembly")
        .get();

      if (!existing.empty) {
        throw new HttpsError(
          "already-exists",
          `A national body for ${denomination} already exists`
        );
      }

      break;
    }

    case "presbytery": {

      const existing = await governanceRef
        .where("status", "==", "active")
        .where("templateId", "==", templateId)
        .where("levelId", "==", "presbytery")
        .get();

      const duplicate =
        existing.docs.find(d =>
          d.data().name?.trim().toLowerCase() ===
          name?.trim().toLowerCase()
        );

      if (duplicate) {
        throw new HttpsError(
          "already-exists",
          `Presbytery "${name}" already exists`
        );
      }

      break;
    }

    case "district": {

      const existing = await governanceRef
        .where("status", "==", "active")
        .where("templateId", "==", templateId)
        .where("levelId", "==", "district")
        .get();

      const duplicate =
        existing.docs.find(d =>
          d.data().name?.trim().toLowerCase() ===
          name?.trim().toLowerCase()
        );

      if (duplicate) {
        throw new HttpsError(
          "already-exists",
          `District "${name}" already exists`
        );
      }

      break;
    }

    case "congregation":
    case "society":
    case "local_assembly":
    case "local_church": {

      const existing = await governanceRef
        .where("status", "==", "active")
        .where("templateId", "==", templateId)
        .where("levelId", "==", levelId)
        .get();

      const duplicate =
        existing.docs.find(d => {

          const data = d.data();

          return (
            data.name?.trim().toLowerCase() ===
              name?.trim().toLowerCase() &&
            data.location?.trim().toLowerCase() ===
              location?.trim().toLowerCase()
          );
        });

      if (duplicate) {
        throw new HttpsError(
          "already-exists",
          `${name} already exists in ${location}`
        );
      }

      break;
    }

    default:
      break;
  }
}

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
// Validate Registration
// --------------------------------------------------

await validateRegistration(org);


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

  location: org.location || null,

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
// Parent Linking
// --------------------------------------------------

if (org.levelId === "presbytery") {

  const parentSnap = await db
    .collection("governanceNodes")
    .where("templateId", "==", templateId)
    .where("levelId", "==", "national_assembly")
    .where("status", "==", "active")
    .get();

  if (!parentSnap.empty) {

    await governanceNodeRef.update({
      parentNodeId:
        parentSnap.docs[0].id,

      pendingLink: false,
    });
  }
}

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
  