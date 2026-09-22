const { onSchedule } =
  require("firebase-functions/v2/scheduler");
  const {
  FieldValue,
} = require("firebase-admin/firestore");


const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore();

const WHATSAPP_PHONE_NUMBER_ID =
  "1372746829249591";

// TEMPORARY
// Replace with your generated token
const WHATSAPP_ACCESS_TOKEN =
  "EAAj5XptIeLcBSpbBh2B9dhbPmSWxfX0vK3ylsYGsvKSngWumZC2FFmATB3BzFg50uF7kxgAOPMfVp65nNmieoZC6hak89rZAqlLLgOeZC5Hv7YrZA5ZBCU1MuXOrMH1KZA8w0ZCXrVKNEUUm99VqApjZCcqOY8CRTZBoihnZBqunzxdBzte6eEpMlpKWBnvbZAC7G3LhHjMpf4mT7aZBYSPt9M8sSszIJ64uhJkIen5CNieZBUB7wbZCop2rfYD9An03oPNla1MXOoXogWapnps28M8LQimiJLSe4RzXysRyyM2xZApQ";

const axios = require("axios");

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
  JSON.stringify(
    error.response?.data ||
    error.message
  ),

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
  JSON.stringify(
    error.response?.data ||
    error.message
  ),

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

          await axios.post(

  `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,

  {
    messaging_product:
      "whatsapp",

    to:
      whatsapp.phone,

    type:
      "text",

    text: {
      body:
        whatsapp.message,
    },
  },

  {
    headers: {
      Authorization:
        `Bearer ${WHATSAPP_ACCESS_TOKEN}`,

      "Content-Type":
        "application/json",
    },
  }
);

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
  JSON.stringify(
    error.response?.data ||
    error.message
  ),

});

        }
      }
    }
  );
