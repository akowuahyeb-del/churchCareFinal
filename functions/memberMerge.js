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

   //
// ATTENDANCE
//
const attendanceSnap =
  await db
    .collection(
      "organizations"
    )
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("attendance")
    .where(
      "memberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of attendanceSnap.docs) {

  await docItem.ref.update({
    memberId:
      masterMemberId,
  });

}

//
// CONTRIBUTIONS
//
const contributionSnap =
  await db
    .collection(
      "organizations"
    )
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("contributions")
    .where(
      "memberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of contributionSnap.docs) {

  await docItem.ref.update({
    memberId:
      masterMemberId,
  });

}

//
// APPROVAL REQUESTS
//
const approvalSnap =
  await db
    .collection(
      "organizations"
    )
    .doc(organizationId)
    .collection(
      "approvalRequests"
    )
    .where(
      "memberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of approvalSnap.docs) {

  await docItem.ref.update({
    memberId:
      masterMemberId,
  });

}

//
// GOVERNANCE MEMBERSHIPS
//
const governanceSnap =
  await db
    .collection(
      "organizations"
    )
    .doc(organizationId)
    .collection(
      "governanceMemberships"
    )
    .where(
      "memberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of governanceSnap.docs) {

  await docItem.ref.update({
    memberId:
      masterMemberId,
  });

}

//
// TRANSFERS
//
const transferSnap =
  await db
    .collection(
      "organizations"
    )
    .doc(organizationId)
    .collection(
      "transfers"
    )
    .where(
      "memberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of transferSnap.docs) {

  await docItem.ref.update({
    memberId:
      masterMemberId,
  });

}
//
// VISITOR ASSIGNMENTS
//
const visitorSnap =
  await db
    .collection(
      "organizations"
    )
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("visitors")
    .get();

for (const docItem of visitorSnap.docs) {

  const data = docItem.data();

  if (
    data.assignment?.id ===
    duplicateMemberId
  ) {

    await docItem.ref.update({
      assignment: {
        ...data.assignment,
        id: masterMemberId,
      },
    });

  }

}
//
//
// PASTORAL REQUESTS
//
const pastoralSnap =
  await db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("pastoralRequests")
    .where(
      "memberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of pastoralSnap.docs) {

  await docItem.ref.update({
    memberId:
      masterMemberId,
  });

}

//
// PRAYER REQUESTS
//
const prayerSnap =
  await db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("prayerRequests")
    .where(
      "memberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of prayerSnap.docs) {

  await docItem.ref.update({
    memberId:
      masterMemberId,
  });

}

//
// VISITOR ASSIGNED STAFF
//
const assignedVisitorSnap =
  await db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("visitors")
    .where(
      "assignedToMemberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of assignedVisitorSnap.docs) {

  await docItem.ref.update({
    assignedToMemberId:
      masterMemberId,
  });

}
//
// VISITOR CONVERTED MEMBER
//
const convertedVisitorSnap =
  await db
    .collection("organizations")
    .doc(organizationId)
    .collection("entities")
    .doc(entityId)
    .collection("visitors")
    .where(
      "convertedMemberId",
      "==",
      duplicateMemberId
    )
    .get();

for (const docItem of convertedVisitorSnap.docs) {

  await docItem.ref.update({
    convertedMemberId:
      masterMemberId,
  });

}
//
// MARK DUPLICATE
//
await duplicateRef.update({

  lifecycleStatus:
    "duplicate",

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