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

    const { summary, churchId } = request.data;

    const db = getFirestore();
    const uid = request.auth.uid;

    // ✅ Admin check
    const memberDoc = await db
      .collection("churches")
      .doc(churchId)
      .collection("members")
      .doc(uid)
      .get();

    if (!memberDoc.exists || memberDoc.data().role !== "admin") {
      throw new HttpsError("permission-denied", "Not authorized.");
    }

    // ✅ Cache key
    const todayKey = new Date().toISOString().split("T")[0];

    const insightRef = db
      .collection("churches")
      .doc(churchId)
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
      createdAt: Date.now(),
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
