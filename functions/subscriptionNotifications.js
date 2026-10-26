const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

// ASSUMPTION: subscription doc at organizations/{orgId}/subscription/current
// has { status, currentPeriodEnd (ISO string), trialEndsAt (ISO string) }.
// Adjust field names to match your actual schema.

async function enqueueEmail({ to, template, data }) {
  if (!to) return;
  await db.collection("outboundMail").add({
    to, template, data, status: "pending", retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}

async function enqueueWhatsApp({ phone, templateName, templateParams }) {
  if (!phone) return;
  await db.collection("outboundWhatsApp").add({
    phone, templateName, templateParams, status: "pending", retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}

exports.subscriptionLifecycleScan = onSchedule("every 24 hours", async () => {
  const now = new Date();
  const nowIso = now.toISOString();

  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysIso = in3Days.toISOString();

  const orgsSnap = await db.collection("organizations").get();

  for (const orgDoc of orgsSnap.docs) {
    const subSnap = await orgDoc.ref.collection("subscription").doc("current").get();
    if (!subSnap.exists) continue;

    const sub = subSnap.data();
    const org = orgDoc.data();
    const adminEmail = org.adminEmail || null;
    const adminPhone = org.adminPhone || null;

    // --- Trial ending in 3 days ---
    if (
      sub.status === "trialing" &&
      sub.trialEndsAt &&
      sub.trialEndsAt <= in3DaysIso &&
      sub.trialEndsAt > nowIso &&
      !sub.trialEndingNotified
    ) {
      await enqueueEmail({
        to: adminEmail,
        template: "trialEndingSoon",
        data: { organizationName: org.name, trialEndsAt: sub.trialEndsAt },
      });
      await enqueueWhatsApp({
        phone: adminPhone,
        templateName: "trial_ending_soon",
        templateParams: [org.name, sub.trialEndsAt?.split("T")[0] || ""],
      });
      await subSnap.ref.update({ trialEndingNotified: true });
    }

    // --- Trial expired, no conversion: win-back ---
    const trialLapsedDays = sub.trialEndsAt
      ? Math.floor((now - new Date(sub.trialEndsAt)) / (1000 * 60 * 60 * 24))
      : null;

    if (
      sub.status === "trialing" &&
      [14, 30, 60].includes(trialLapsedDays) &&
      sub.lastWinBackDay !== trialLapsedDays
    ) {
      await enqueueEmail({
        to: adminEmail,
        template: "winBackOffer",
        data: { organizationName: org.name, daysLapsed: trialLapsedDays },
      });
      await subSnap.ref.update({ lastWinBackDay: trialLapsedDays });
    }

    // --- Payment failed / grace period started ---
    if (sub.status === "past_due" && !sub.pastDueNotified) {
      await enqueueEmail({
        to: adminEmail,
        template: "paymentFailed",
        data: { organizationName: org.name },
      });
      await enqueueWhatsApp({
        phone: adminPhone,
        templateName: "payment_failed",
        templateParams: [org.name],
      });
      await subSnap.ref.update({ pastDueNotified: true });
    }

    // --- Renewal confirmation (fires once per period, when
    // currentPeriodEnd rolls forward from its last-notified value) ---
    if (
      sub.status === "active" &&
      sub.currentPeriodEnd &&
      sub.lastRenewalNotifiedFor !== sub.currentPeriodEnd
    ) {
      await enqueueEmail({
        to: adminEmail,
        template: "subscriptionRenewed",
        data: { organizationName: org.name, nextRenewal: sub.currentPeriodEnd },
      });
      await subSnap.ref.update({ lastRenewalNotifiedFor: sub.currentPeriodEnd });
    }

    // --- Tokens expiring (only meaningful if you add expiry to token
    // ledger entries — current Sprint 5 implementation above treats
    // tokens as non-expiring; skip this block unless you add that) ---
  }
});
module.exports.subscriptionLifecycleScan =
  exports.subscriptionLifecycleScan;