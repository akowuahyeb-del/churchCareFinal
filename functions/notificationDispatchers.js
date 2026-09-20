const { onSchedule } =
  require("firebase-functions/v2/scheduler");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore();

exports.emailDispatcher =
  onSchedule(
    "every 1 minutes",
    async () => {

      const snap =
        await db
          .collection("outboundMail")
          .where(
            "status",
            "==",
            "pending"
          )
          .limit(50)
          .get();

      for (const doc of snap.docs) {

        const mail =
          doc.data();

        try {

          console.log(
            "EMAIL SEND",
            mail.to
          );

          // SendGrid goes here later

          await doc.ref.update({
            status: "sent",
            sentAt:
              new Date().toISOString(),
          });

        } catch (error) {

          await doc.ref.update({
            status: "failed",
            error:
              error.message,
          });
        }
      }
    }
  );