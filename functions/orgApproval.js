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

const TEMPLATE_STRUCTURE = {
  presbyterian: {
    1: "general_assembly",
    2: "presbytery",
    3: "district",
    4: "congregation",
  },

  methodist: {
    1: "conference",
    2: "synod",
    3: "circuit",
    4: "society",
  },

  assemblies_of_god: {
    1: "national_executive",
    2: "region",
    3: "district",
    4: "local_assembly",
  },

  cop: {
    1: "national_headquarters",
    2: "area",
    3: "district",
    4: "local_assembly",
  },

  cac: {
    1: "headquarters",
    2: "area",
    3: "district",
    4: "assembly",
  },

  sda: {
    1: "union_conference",
    2: "conference_mission",
    3: "district",
    4: "local_church",
  },

  independent: {
    1: "head_office",
    2: "region",
    3: "branch",
    4: "local_church",
  },
};

function getHierarchyRank(
  templateId,
  levelId
) {
  const structure =
    TEMPLATE_STRUCTURE[templateId];

  if (!structure) {
    return null;
  }

  for (const [rank, id] of Object.entries(structure)) {
    if (id === levelId) {
      return Number(rank);
    }
  }

  return null;
}

function getParentLevelId(
  templateId,
  levelId
) {
  const structure =
    TEMPLATE_STRUCTURE[templateId];

  if (!structure) {
    return null;
  }

  const rank =
    getHierarchyRank(
      templateId,
      levelId
    );

  if (!rank || rank === 1) {
    return null;
  }

  return structure[rank - 1];
}


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
union_conference: "UC",
conference_mission: "CM",
};

const TEMPLATE_CODES = {
  presbyterian: "PCG",
  methodist: "MCG",
  assemblies_of_god: "AOG",
  cop: "COP",
  cac: "CAC",
  sda: "SDA",
};

async function generateOrganizationCode(
  templateId,
  levelId,
  organizationAbbreviation = null
) {
  const levelCode =
    LEVEL_CODES[levelId] || "ORG";

const templateCode =
  TEMPLATE_CODES[templateId] ||
  organizationAbbreviation ||
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
    const rank =
  getHierarchyRank(
    templateId,
    levelId
  );


 // --------------------------------------------------
// Rank 1 (Top Level)
// One top-level node per denomination
// --------------------------------------------------

if (rank === 1) {

  const existing = await governanceRef
    .where("status", "==", "active")
    .where("templateId", "==", templateId)
    .where("levelId", "==", levelId)
    .get();

  if (!existing.empty) {
    throw new HttpsError(
      "already-exists",
      `Top-level organization already exists`
    );
  }

  return;
}

// --------------------------------------------------
// Rank 2 & Rank 3
// Name must be unique within denomination
// --------------------------------------------------

if (rank === 2 || rank === 3) {

  const existing = await governanceRef
    .where("status", "==", "active")
    .where("templateId", "==", templateId)
    .where("levelId", "==", levelId)
    .get();

  const duplicate =
    existing.docs.find((d) =>
      d.data().name?.trim().toLowerCase() ===
      name?.trim().toLowerCase()
    );

  if (duplicate) {
    throw new HttpsError(
      "already-exists",
      `${name} already exists`
    );
  }

  return;
}

// --------------------------------------------------
// Rank 4 (Local Unit)
// Name + Location must be unique
// --------------------------------------------------

if (rank === 4) {

  const existing = await governanceRef
    .where("status", "==", "active")
    .where("templateId", "==", templateId)
    .where("levelId", "==", levelId)
    .get();

  const duplicate =
    existing.docs.find((d) => {

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

  return;
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
    org.levelId,
    org.organizationAbbreviation
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

const parentLevelId =
  getParentLevelId(
    templateId,
    org.levelId
  );

if (parentLevelId) {

  const parentSnap = await db
    .collection("governanceNodes")
    .where("templateId", "==", templateId)
    .where("levelId", "==", parentLevelId)
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
  