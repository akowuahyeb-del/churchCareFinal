const { onSchedule } =
  require("firebase-functions/v2/scheduler");
  const {
  FieldValue,
} = require("firebase-admin/firestore");


const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore();

// --------------------------------------------------
// EMAIL DISPATCHER
// --------------------------------------------------

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

        const email =
          doc.data();

        try {

          console.log(
            "EMAIL JOB",
            {
              id: doc.id,
              to: email.to,
              subject: email.subject,
            }
          );

          // SendGrid later

          await doc.ref.update({
            status: "sent",
            sentAt:
              new Date().toISOString(),
          });

        } catch (error) {

     const retries =
  ((email?.retryCount) || 0) + 1;


await doc.ref.update({

  retryCount:
    FieldValue.increment(1),

  status:
    retries >= 5
      ? "dead"
      : "pending",

  error:
    error.message ||
    "Unknown error",
});

        }
      }
    }
  );


// --------------------------------------------------
// SMS DISPATCHER
// --------------------------------------------------

exports.smsDispatcher =
  onSchedule(
    "every 1 minutes",
    async () => {

      const snap =
        await db
          .collection("outboundSms")
          .where(
            "status",
            "==",
            "pending"
          )
          .limit(50)
          .get();

      for (const doc of snap.docs) {

        const sms =
          doc.data();

        try {

          console.log(
            "SMS JOB",
            {
              id: doc.id,
              phone: sms.phone,
            }
          );

          // Hubtel/Twilio later

          await doc.ref.update({
            status: "sent",
            sentAt:
              new Date().toISOString(),
          });

        } catch (error) {

    const retries =
  ((sms?.retryCount) || 0) + 1;

await doc.ref.update({

  retryCount:
    FieldValue.increment(1),

  status:
    retries >= 5
      ? "dead"
      : "pending",

  error:
    error.message ||
    "Unknown error",
});

        }
      }
    }
  );


// --------------------------------------------------
// WHATSAPP DISPATCHER
// --------------------------------------------------

exports.whatsAppDispatcher =
  onSchedule(
    "every 1 minutes",
    async () => {

      const snap =
        await db
          .collection("outboundWhatsApp")
          .where(
            "status",
            "==",
            "pending"
          )
          .limit(50)
          .get();

      for (const doc of snap.docs) {

        const whatsapp =
          doc.data();

        try {

          console.log(
            "WHATSAPP JOB",
            {
              id: doc.id,
              phone: whatsapp.phone,
            }
          );

          // WhatsApp Business API later

          await doc.ref.update({
            status: "sent",
            sentAt:
              new Date().toISOString(),
          });

        } catch (error) {
const retries =
  ((whatsapp?.retryCount) || 0) + 1;


await doc.ref.update({

  retryCount:
    FieldValue.increment(1),

  status:
    retries >= 5
      ? "dead"
      : "pending",

  error:
    error.message ||
    "Unknown error",
});

        }
      }
    }
  );
