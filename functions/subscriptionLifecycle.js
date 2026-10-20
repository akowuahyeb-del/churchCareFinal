const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const db = admin.firestore();

exports.processExpiredCancellations =
  onSchedule(
    {
      schedule: "every 24 hours",
      timeZone: "Africa/Accra",
    },
    async () => {

      const orgsSnap =
        await db
          .collection("organizations")
          .get();

      let processed = 0;

      for (const orgDoc of orgsSnap.docs) {

        const entitiesSnap =
          await orgDoc.ref
            .collection("entities")
            .get();

        for (const entityDoc of entitiesSnap.docs) {

          const subRef =
            entityDoc.ref
              .collection("billing")
              .doc("subscription");

          const subSnap =
            await subRef.get();

          if (!subSnap.exists) {
            continue;
          }

          const sub =
            subSnap.data();

          if (
            sub.cancelAtPeriodEnd !== true ||
            !sub.currentPeriodEnd
          ) {
            continue;
          }

          const expired =
            new Date(
              sub.currentPeriodEnd
            ) < new Date();

          if (!expired) {
            continue;
          }

          await subRef.set(
            {
              planId: "free",
              status: "free",

              cancelAtPeriodEnd: false,

              downgradedAt:
                new Date().toISOString(),

              downgradeReason:
                "subscription_expired",
            },
            { merge: true }
          );

          processed++;
        }
      }

      console.log(
        `✅ Expired cancellations processed: ${processed}`
      );
    }
  );