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

const LEVEL_CODES = {
  general_assembly: "GA",
  presbytery: "PRE",
  district: "DIS",
  circuit: "CIR",
  congregation: "CON",
  society: "SOC",
  local_assembly: "LA",
  local_church: "LC",
  national_headquarters: "NH",
area: "AREA",
region: "REG",
branch: "BR",
headquarters: "HQ",
assembly: "ASM",
};

const TEMPLATE_CODES = {
  presbyterian: "PCG",
  methodist: "MCG",
  assemblies_of_god: "AOG",
  cop: "COP",
  cac: "CAC",
};

async function generateOrganizationCode(
  templateId,
  levelId
) {
  const levelCode =
    LEVEL_CODES[levelId] || "ORG";

 const templateCode =
  TEMPLATE_CODES[templateId] ||
  "ORG";

  const counterRef =
    db.collection("counters")
      .doc(`${templateId}_${levelId}`);

  const nextValue =
    await db.runTransaction(
      async (tx) => {

        const snap =
          await tx.get(counterRef);

        let current = 0;

        if (snap.exists) {
          current =
            snap.data().current || 0;
        }

        current++;

        tx.set(
          counterRef,
          { current },
          { merge: true }
        );

        return current;
      }
    );

  return `${templateCode}-${levelCode}-${String(nextValue).padStart(4,"0")}`;
}



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

    case "general_assembly": {

      const existing = await governanceRef
        .where("status", "==", "active")
        .where("templateId", "==", templateId)
        .where("levelId", "==", "general_assembly")
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

       const templateId =
      org.templateId || "presbyterian";


const organizationCode =
  await generateOrganizationCode(
    templateId,
    org.levelId
  );

await orgRef.update({
  status: "active",
  approvedAt: now,
  organizationCode,
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

  organizationCode,

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
    .where("levelId", "==", "general_assembly")
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

  organizationCode,

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
  