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

const {
  LEVEL_CODES,
  TEMPLATE_CODES,
  getHierarchyRank,
} = require("./governanceStructure");

const {
  linkNewGovernanceNode,
} = require("./governanceLinking");

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

  return `${templateCode}-${levelCode}-${String(nextValue).padStart(4, "0")}`;
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

    // --------------------------------------------------
    // Generate Organization Code
    // --------------------------------------------------

    const organizationCode =
      await generateOrganizationCode(
        templateId,
        org.levelId,
        org.organizationAbbreviation
      );
     
       await orgRef.update({
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
    // System Creates Administrator Member
    // (must happen before we reference adminMemberId)
    // --------------------------------------------------

    const adminMember =
  await createMemberRecord({
    organizationId,

    entityId,

    organizationCode,

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

    const adminMemberId = adminMember.id;

    // --------------------------------------------------
    // Activate Organization
    // --------------------------------------------------

    await orgRef.update({
      status: "active",
      approvedAt: now,
      organizationCode,

      onboardingStatus: "awaiting_admin_claim",

      adminClaimed: false,
      adminUid: null,
      adminMemberId,

      contactClaimed: false,
      contactUid: null,
      contactMemberId: null,
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
            "Church Registration Approved \u2705",

          message:
            `Congratulations ${org.adminName || ""}.\n\n` +
            `${org.name} has been approved and activated.\n\n` +
            `Organisation Code: ${organizationCode}\n\n` +
            `Please open ChurchCare and complete your onboarding.`,

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
    // Governance Auto-Linking (bidirectional)
    // --------------------------------------------------
    // Links this node up to its parent if exactly one unambiguous
    // candidate exists, AND retroactively adopts any existing orphaned
    // nodes one rank below this one (e.g. a Congregation created before
    // its District existed gets picked up here once the District is
    // approved). Ambiguous cases (multiple candidates) are queued in
    // governanceLinkIssues for manual resolution rather than guessed.

console.log(
  "LINK INPUT",
  JSON.stringify({
    organizationId,
    organizationName: org.name,

    templateId,
    levelId: org.levelId,

    parentNodeId:
      org.parentNodeId || null,

    relationshipMode:
      org.relationshipMode || null,

    expectedParentName:
      org.expectedParentName || null,

    expectedParentLevel:
      org.expectedParentLevel || null,

    networkId:
      org.networkId || null,
  }, null, 2)
);


    const linkResult = await linkNewGovernanceNode(
      governanceNodeRef,
      {
        templateId,
        levelId: org.levelId,
        organizationId,
        name: org.name,
        parentNodeId: org.parentNodeId || null,
        relationshipMode: org.relationshipMode || null,
        expectedParentName: org.expectedParentName || null,
        expectedParentLevel: org.expectedParentLevel || null,
        networkId: org.networkId || null,
      }
    );

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

      linking: linkResult,
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