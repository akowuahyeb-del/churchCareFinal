const admin = require("firebase-admin");
admin.initializeApp();

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const onboarding = require("./onboarding");
const orgApproval =require("./orgApproval");

exports.generateFinanceInsight = onCall(
  { timeoutSeconds: 30 },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

   const {
  summary = {},
  organizationId,
  entityId,
} = request.data || {};

if (!organizationId || !entityId) {
  throw new HttpsError(
    "invalid-argument",
    "Organization and entity are required."
  );
}

    const db = getFirestore();
    const uid = request.auth.uid;
    const subscriptionSnap = await db
  .collection("organizations")
  .doc(organizationId)
  .collection("entities")
  .doc(entityId)
  .collection("billing")
  .doc("subscription")
  .get();

const subscription =
  subscriptionSnap.exists
    ? subscriptionSnap.data()
    : null;

const planId =
  subscription?.planId || "free";
  const aiEnabledPlans = [
  "pro",
  "enterprise",
];

if (
  !aiEnabledPlans.includes(planId)
) {
  throw new HttpsError(
    "permission-denied",
    "AI Insights requires a Pro or Enterprise plan."
  );
}

    // ✅ Admin check
  const memberSnap = await db
  .collection("organizations")
  .doc(organizationId)
  .collection("entities")
  .doc(entityId)
  .collection("members")
  .where("uid", "==", uid)
  .limit(1)
  .get();

if (memberSnap.empty) {
  throw new HttpsError(
    "permission-denied",
    "Member not found."
  );
}

const memberDoc =
  memberSnap.docs[0];

const permissions =
  memberDoc.data()?.permissions || [];

if (
  !permissions.includes(
    "manage_finance"
  )
) {
  throw new HttpsError(
    "permission-denied",
    "Finance permission required."
  );
}

    // ✅ Cache key
    const todayKey = new Date().toISOString().split("T")[0];

   const insightRef = db
  .collection("organizations")
  .doc(organizationId)
  .collection("entities")
  .doc(entityId)
  .collection("aiInsights")
  .doc(todayKey);

    // ✅ Check cache
    const existing = await insightRef.get();

    if (existing.exists) {
      console.log("✅ Returning cached insight");
      return { insight: existing.data().insight, cached: true };
    }




    // ✅ MOCK AI (temporary)
    const text = `
✅ Financial Insight Summary:

1. Your income exceeds expenses — positive cash flow.
2. Monitor top expenses to avoid overspending.
3. Consider increasing savings or investments.
4. Track trends weekly for better forecasting.
`;

    // ✅ Save to Firestore
   await insightRef.set({
  insight: text,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});


    console.log("✅ Insight saved (mock)");

    return {
      insight: text,
      cached: false,
    };
  }
);
exports.checkDuplicateMember =
  onboarding.checkDuplicateMember;

exports.createMemberSafe =
  onboarding.createMemberSafe;

exports.submitVisitorIntake =
  onboarding.submitVisitorIntake;
  exports.generateMemberInvite =
  onboarding.generateMemberInvite;

exports.inviteMember =
  onboarding.inviteMember;


exports.verifyMemberCode =
  onboarding.verifyMemberCode;

exports.completeMemberClaim =
  onboarding.completeMemberClaim;

exports.markActiveUser =
  onboarding.markActiveUser;

exports.getFunnelStats =
  onboarding.getFunnelStats;

exports.onMemberStatusChange =
  onboarding.onMemberStatusChange;

exports.stageWatcherJob =
  onboarding.stageWatcherJob;
  exports.approveOrganization =
  orgApproval.approveOrganization;

exports.rejectOrganization =
  orgApproval.rejectOrganization;

  const orgRegistration =
  require("./orgRegistration");

exports.checkDuplicateOrganization =
  orgRegistration.checkDuplicateOrganization;

exports.submitOrganizationRegistration =
  orgRegistration.submitOrganizationRegistration;

  exports.getParentOrganizations =
  orgRegistration.getParentOrganizations;
  
exports.searchOrganizationNetworks =
  require("./orgHierarchy")
    .searchOrganizationNetworks;
    const {
  deactivateOrganization,
  reinstateOrganization,
} = require("./orgLifecycle");

exports.deactivateOrganization =
  deactivateOrganization;

exports.reinstateOrganization =
  reinstateOrganization;
  const notifications = require("./notifications");
exports.sendChurchBroadcast =
  notifications.sendChurchBroadcast;

exports.sendIndividualNotification =
  notifications.sendIndividualNotification;

exports.sendGroupNotification =
  notifications.sendGroupNotification;
  exports.sendApprovalRequestNotifications =
  notifications.sendApprovalRequestNotifications;


exports.absenceWatcherJob =
  notifications.absenceWatcherJob;
const {
  updateOrganizationIdentity,
} = require("./orgIdentity");

exports.updateOrganizationIdentity =
  updateOrganizationIdentity;
  
const pastoralCare =
  require("./pastoralCare");

exports.submitPastoralRequest =
  pastoralCare.submitPastoralRequest;

  exports.assignPastoralRequest =
  pastoralCare.assignPastoralRequest;

exports.updatePastoralRequestStatus =
  pastoralCare.updatePastoralRequestStatus;

exports.addPastoralNote =
  pastoralCare.addPastoralNote;

exports.escalateStalePastoralRequests =
  pastoralCare.escalateStalePastoralRequests;

  const memberMerge =
  require("./memberMerge");

exports.mergeMembers =
  memberMerge.mergeMembers;

 const attendanceIntelligence =
  require("./attendanceIntelligence");

exports.onAttendanceSessionEnded =
  attendanceIntelligence.onAttendanceSessionEnded;
 
  const notificationDispatchers =
  require("./notificationDispatchers");

exports.emailDispatcher =
  notificationDispatchers.emailDispatcher;

exports.smsDispatcher =
  notificationDispatchers.smsDispatcher;

exports.whatsAppDispatcher =
  notificationDispatchers.whatsAppDispatcher;

const subscriptionLifecycle =
  require("./subscriptionLifecycle");

exports.processExpiredCancellations =
  subscriptionLifecycle
    .processExpiredCancellations;
