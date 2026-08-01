const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const {
  findSimilarOrganizations,
  normalize,
} = require("./orgDuplicateCheck");

exports.checkDuplicateOrganization =
  onCall(async (request) => {

    const {
      name,
      location,
      templateId,
      levelId,
    } = request.data || {};

    if (
      !templateId ||
      !levelId ||
      !name
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Missing templateId, levelId or name"
      );
    }

    const matches =
      await findSimilarOrganizations({
        name,
        location,
        templateId,
        levelId,
      });

    return {
      matches,
    };
  });

  const { getFirestore } =
  require("firebase-admin/firestore");

const db = getFirestore();


exports.submitOrganizationRegistration =
  onCall(async (request) => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in required"
      );
    }

    const {
      name,
      location,
      denomination,
      templateId,
      levelId,
      parentNodeId,

      organizationAbbreviation,

      contactName,
      contactPhone,
      contactEmail,

      adminName,
      adminPhone,
      adminEmail,
    } = request.data || {};

    if (
      !name?.trim() ||
      !templateId ||
      !levelId
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required registration fields"
      );
    }

    const matches =
      await findSimilarOrganizations({
        name,
        location,
        templateId,
        levelId,
      });

    const hardBlock =
      matches.find(
        (m) => m.confidence >= 0.85
      );

    if (hardBlock) {

      throw new HttpsError(
        "already-exists",
        `This looks like an existing registration: "${hardBlock.name}"`
      );
    }

    const possibleDuplicates =
      matches.filter(
        (m) =>
          m.confidence >= 0.70 &&
          m.confidence < 0.85
      );

    const dedupeKey =
      `${templateId}__${levelId}__${normalize(name)}__${normalize(location || "")}`;

    const claimRef =
      db.collection("_orgDedupeClaims")
        .doc(dedupeKey);

    const orgRef =
      db.collection("organizations")
        .doc();

    const entityRef =
      orgRef
        .collection("entities")
        .doc();

    await db.runTransaction(
      async (tx) => {

        const claimSnap =
          await tx.get(claimRef);

        if (claimSnap.exists) {
          throw new HttpsError(
            "already-exists",
            "A matching registration was just submitted."
          );
        }

        const now =
          new Date().toISOString();

        tx.set(claimRef, {
          orgId: orgRef.id,
          createdAt: now,
        });

        tx.set(orgRef, {
          name: name.trim(),

          organizationAbbreviation:
            organizationAbbreviation?.trim() || null,

          denomination:
            denomination?.trim() || null,

          location:
            location?.trim() || null,

          contactName:
            contactName?.trim() || null,

          contactPhone:
            contactPhone || null,

          contactEmail:
            contactEmail?.trim() || null,

          adminName:
            adminName?.trim() || null,

          adminPhone:
            adminPhone || null,

          adminEmail:
            adminEmail?.trim() || null,

          submittedByUid:
            request.auth.uid,

          submittedByEmail:
            request.auth.token?.email || null,

          templateId,

          levelId,

          parentNodeId:
            parentNodeId || null,

          rootEntityId:
            entityRef.id,

          status: "pending",

          possibleDuplicates,

          createdAt: now,
        });

        tx.set(entityRef, {
          name: name.trim(),

          organizationId:
            orgRef.id,

          status: "pending",

          createdAt: now,
        });

        tx.set(
          orgRef
            .collection("settings")
            .doc("structure"),
          {
            templateId,

            status: "pending",

            organizationId:
              orgRef.id,

            entityId:
              entityRef.id,
          }
        );

        tx.set(
          db.collection("users")
            .doc(request.auth.uid),
          {
            organizationId:
              orgRef.id,

            entityId:
              entityRef.id,

            entityName:
              name.trim(),
          },
          { merge: true }
        );
      }
    );

    return {
      organizationId:
        orgRef.id,

      entityId:
        entityRef.id,

      flaggedForReview:
        possibleDuplicates.length > 0,

      possibleDuplicates,
    };
  });