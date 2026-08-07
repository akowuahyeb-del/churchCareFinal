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
const {
  createMemberRecord,
} = require("./onboarding");


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
  national_executive: "NE",
  area: "AREA",
  region: "REG",
  branch: "BR",
  headquarters: "HQ",
  head_office: "HO",
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

function generateEntityCode(
  value = ""
) {
  return value
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .substring(0, 3);
}


const LEVEL_SUFFIX = {
  headquarters: "H",
  head_office: "H",

  presbytery: "P",

  district: "D",

  congregation: "C",
  local_church: "C",
  society: "C",
  local_assembly: "C",

  circuit: "R",

  area: "A",

  region: "G",

  branch: "B",

  general_assembly: "H",
  national_headquarters: "H",
  national_executive: "H",
};

async function generateOrganizationCode(
  templateId,
  levelId,
  organizationAbbreviation = null,
  organizationName = null
)

{

  const prefix =
    TEMPLATE_CODES[templateId] ||
    organizationAbbreviation ||
    "ORG";

 const churchCode =
  generateEntityCode(
    organizationName ||
    "ORG"
  );


  const randomDigits =
    Math.floor(
      100 + Math.random() * 900
    );

  const suffix =
    LEVEL_SUFFIX[levelId] || "X";

  return `${prefix}-${churchCode}-${randomDigits}${suffix}`;
}

async function validateRegistration(org) {

  const {
    templateId,
    levelId,
    name,
    location,
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

    // --------------------------------------------------
    // Auth Guard
    // --------------------------------------------------

    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to approve an organization"
      );
    }

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

    const now =
      new Date().toISOString();

    const templateId =
      org.templateId || "presbyterian";


console.log(
  "ORG CODE INPUTS",
  {
    templateId,
    levelId: org.levelId,
    name: org.name,
    location: org.location,
    organizationAbbreviation:
      org.organizationAbbreviation,
  }
);


    // --------------------------------------------------
    // Generate Organization Code
    // --------------------------------------------------
const organizationCode =
  await generateOrganizationCode(
    templateId,
    org.levelId,
    org.organizationAbbreviation,
    org.name
  );


  await orgRef.update({
  status: "active",
  approvedAt: now,
  organizationCode,

  onboardingStatus:
    "awaiting_admin_claim",

  adminClaimed: false,
  adminUid: null,

  contactClaimed: false,
  contactUid: null,
  contactMemberId: null,
});

    // --------------------------------------------------
    // Activate Entity
    // --------------------------------------------------

    await entityDoc.ref.update({
      status: "active",
      approvedAt: now,
    });

    // --------------------------------------------------
    // System Creates Administrator Member
    // (must happen before we reference adminMemberId)
    // --------------------------------------------------

    const adminMember =
      await createMemberRecord({
        organizationId,

        entityId,

        actorUid:
          request.auth.uid,

        memberData: {

          name:
            org.adminName || "",

          phone:
            org.adminPhone || null,

          email:
            org.adminEmail || null,

          source:
            "organization_registration",

          lifecycleStatus:
            "member",
        },
      });

   const adminMemberId =
  adminMember.id;

    // --------------------------------------------------
    // Activate Organization
    // --------------------------------------------------

   await orgRef.update({
  adminMemberId,
  adminMemberCode:
    adminMember.memberCode,
});


    // --------------------------------------------------
    // Notify Administrator Of Approval
    // --------------------------------------------------

    try {

      await orgRef
        .collection("notifications")
        .add({

          type:
            "organization_approved",

          recipientType:
            "church_admin",

          recipientName:
            org.adminName || null,

          recipientPhone:
            org.adminPhone || null,

          recipientEmail:
            org.adminEmail || null,

          memberId:
            adminMemberId,

         title:
  "Church Registration Approved ✅",

message:
  `Congratulations ${org.adminName || ""}.\n\n` +
  `${org.name} has been approved and activated.\n\n` +
  `Organisation Code: ${organizationCode}\n` +
  `Member Code: ${adminMember.memberCode}\n\n` +
  `Next Step:\n` +
  `Open ChurchCare, sign in, and claim your administrator account using your Member Code and Phone number.`,

          read: false,

          createdAt: now,
        });

    } catch (notificationError) {

      console.error(
        "ADMIN APPROVAL NOTIFICATION FAILED",
        notificationError
      );

      // Do NOT fail approval
    }

    // --------------------------------------------------
    // Contact Person Notification
    // --------------------------------------------------

    try {

      await orgRef
        .collection("notifications")
        .add({
          type: "organization_approved",

          title:
            "Church Registration Approved \u2705",

          message:
            `The registration for ${org.name} has been approved and activated. ` +
            `Organisation Code: ${organizationCode}. ` +
            `The church administrator may now continue onboarding and church setup.`,

          recipientType: "contact_person",

          recipientName:
            org.contactName || null,

          recipientPhone:
            org.contactPhone || null,

          recipientEmail:
            org.contactEmail || null,

          read: false,

          createdAt: now,
        });

    } catch (notificationError) {

      console.error(
        "CONTACT NOTIFICATION FAILED",
        notificationError
      );

      // Do NOT fail approval
    }

    // --------------------------------------------------
    // Approval Audit Log
    // --------------------------------------------------

    await orgRef.collection("auditLogs").add({
      action: "organization_approved",

      organizationId,

      organizationName: org.name,

      organizationCode,

      approvedAt: now,

      approvedByUid:
        request.auth.uid,

      approvedByEmail:
        request.auth.token?.email || null,

      previousStatus: "pending",

      newStatus: "active",

      createdAt: now,
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

      // A node is valid and operational
      // even if no parent currently exists.
      pendingLink: false,

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

        // NOTE: if more than one active node exists at the parent
        // level (e.g. multiple presbyteries/regions), this still
        // can't determine the *correct* parent without an explicit
        // parentOrganizationId submitted at registration time.
        // Flagging via pendingLink rather than guessing wrong.
        if (parentSnap.docs.length === 1) {

          await governanceNodeRef.update({
            parentNodeId:
              parentSnap.docs[0].id,

            pendingLink: false,
          });

        } else {

          await governanceNodeRef.update({
            pendingLink: true,
          });
        }

      } else {

        await governanceNodeRef.update({
          pendingLink: true,
        });
      }
    }

    // --------------------------------------------------
    // Return
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

    // --------------------------------------------------
    // Auth Guard
    // --------------------------------------------------

    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to reject an organization"
      );
    }

    const { organizationId, reason } =
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

    const now = new Date().toISOString();

    // --------------------------------------------------
    // Reject Organization
    // --------------------------------------------------

    await orgRef.update({
      status: "rejected",
      rejectedAt: now,
      rejectionReason: reason || null,
    });

    // --------------------------------------------------
    // Rejection Audit Log
    // --------------------------------------------------

    await orgRef.collection("auditLogs").add({
      action: "organization_rejected",

      organizationId,

      organizationName: org.name,

      rejectedAt: now,

      rejectedByUid:
        request.auth.uid,

      rejectedByEmail:
        request.auth.token?.email || null,

      reason: reason || null,

      previousStatus: "pending",

      newStatus: "rejected",

      createdAt: now,
    });

    // --------------------------------------------------
    // Notify Contact/Admin Of Rejection
    // --------------------------------------------------

    try {

      await orgRef
        .collection("notifications")
        .add({
          type: "organization_rejected",

          title: "Church Registration Update",

          message: reason
            ? `Your registration for ${org.name} was not approved. Reason: ${reason}`
            : `Your registration for ${org.name} was not approved.`,

          recipientType: "church_admin",

          recipientName:
            org.adminName || null,

          recipientPhone:
            org.adminPhone || null,

          recipientEmail:
            org.adminEmail || null,

          read: false,

          createdAt: now,
        });

    } catch (notificationError) {

      console.error(
        "REJECTION NOTIFICATION FAILED",
        notificationError
      );

      // Do NOT fail rejection
    }

    return {
      success: true,
      organizationId,
      status: "rejected",
      rejectedAt: now,
    };
  });