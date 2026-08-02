// functions/orgLifecycle.js
//
// Deactivate/reinstate an already-active organization. Distinct from
// reject (which only applies to pending registrations that never went
// live) — this is for freezing an org that WAS active: non-payment,
// policy violation, admin request to pause, etc. Cascades to the org's
// entities so member-facing screens (which check entity.status) also
// see the freeze, not just the org doc.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

async function requireSuperAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");
  if (request.auth.token?.role === "super_admin") return;
  const userSnap = await db.collection("users").doc(request.auth.uid).get();
  if (userSnap.exists && userSnap.data().role === "super_admin") return;
  throw new HttpsError("permission-denied", "Developer access required");
}

exports.deactivateOrganization = onCall(async (request) => {
  await requireSuperAdmin(request);

  const { organizationId, reason } = request.data || {};
  if (!organizationId) throw new HttpsError("invalid-argument", "Missing organizationId");
  if (!reason?.trim()) throw new HttpsError("invalid-argument", "A reason is required to deactivate an organization");

  const orgRef = db.collection("organizations").doc(organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new HttpsError("not-found", "Organization not found");
  const org = orgSnap.data();

  if (org.status !== "active") {
    throw new HttpsError("failed-precondition", `Organization is not active (current status: ${org.status})`);
  }

  const now = new Date().toISOString();

  const batch = db.batch();
  batch.update(orgRef, {
    status: "inactive",
    deactivatedAt: now,
    deactivationReason: reason.trim(),
    // preserve the status it's returning to on reinstate — always "active"
    // here since only active orgs can be deactivated, but stored
    // explicitly so reinstate doesn't need to guess.
    statusBeforeDeactivation: "active",
  });

  const entitiesSnap = await db.collection("organizations").doc(organizationId).collection("entities").get();
  entitiesSnap.docs.forEach(d => {
    batch.update(d.ref, { status: "inactive", deactivatedAt: now });
  });

  await batch.commit();

  if (org.submittedByUid) {
    await db.collection("users").doc(org.submittedByUid).collection("notifications").add({
      type: "church_deactivated",
      title: "Church Account Deactivated",
      message: `${org.name} has been deactivated: ${reason.trim()}`,
      organizationId,
      read: false,
      createdAt: now,
    });
  }

  await db.collection("platformActivity").add({
    type: "org_deactivated",
    orgId: organizationId,
    orgName: org.name,
    message: `${org.name} deactivated: ${reason.trim()}`,
    createdAt: now,
  });

  return { success: true };
});

exports.reinstateOrganization = onCall(async (request) => {
  await requireSuperAdmin(request);

  const { organizationId } = request.data || {};
  if (!organizationId) throw new HttpsError("invalid-argument", "Missing organizationId");

  const orgRef = db.collection("organizations").doc(organizationId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) throw new HttpsError("not-found", "Organization not found");
  const org = orgSnap.data();

  if (org.status !== "inactive") {
    throw new HttpsError("failed-precondition", `Organization is not inactive (current status: ${org.status})`);
  }

  const now = new Date().toISOString();
  const restoredStatus = org.statusBeforeDeactivation || "active";

  const batch = db.batch();
  batch.update(orgRef, {
    status: restoredStatus,
    reinstatedAt: now,
    deactivationReason: null,
    statusBeforeDeactivation: null,
  });

  const entitiesSnap = await db.collection("organizations").doc(organizationId).collection("entities").get();
  entitiesSnap.docs.forEach(d => {
    batch.update(d.ref, { status: "active", reinstatedAt: now });
  });

  await batch.commit();

  if (org.submittedByUid) {
    await db.collection("users").doc(org.submittedByUid).collection("notifications").add({
      type: "church_reinstated",
      title: "Church Account Reinstated",
      message: `${org.name} has been reinstated and is active again.`,
      organizationId,
      read: false,
      createdAt: now,
    });
  }

  await db.collection("platformActivity").add({
    type: "org_reinstated",
    orgId: organizationId,
    orgName: org.name,
    message: `${org.name} reinstated`,
    createdAt: now,
  });

  return { success: true };
});