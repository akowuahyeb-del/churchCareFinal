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


const { defineSecret } =
  require("firebase-functions/params");

const WHATSAPP_ACCESS_TOKEN =
  defineSecret("WHATSAPP_ACCESS_TOKEN");

const axios = require("axios");

const sgMail =
  require("@sendgrid/mail");


const SENDGRID_API_KEY =
  defineSecret("SENDGRID_API_KEY");




// --------------------------------------------------
// EMAIL DISPATCHER
// --------------------------------------------------

exports.emailDispatcher =
  onSchedule(
    {
      schedule: "every 1 minutes",
      secrets: [SENDGRID_API_KEY],
    },
   async () => {

  sgMail.setApiKey(
    SENDGRID_API_KEY.value()
  );

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

         await sgMail.send({

  to:
    email.to,

  from:
    "noreply@bryeak.com",

  subject:
    email.subject,

  text:
    email.body ||

    email.message ||

    "",

  html:
    `<p>${
      email.body ||
      email.message ||
      ""
    }</p>`,

});

await doc.ref.update({

  status: "sent",

  sentAt:
    new Date().toISOString(),

  error: null,

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
exports.whatsAppDispatcher = onSchedule(
  {
    schedule: "every 1 minutes",
    secrets: [WHATSAPP_ACCESS_TOKEN],
  },
  async () => {

    // FIX: fail loudly and early if the secret is unset, instead of
    // silently sending "Bearer " and getting a 401 on every message.
    const token = WHATSAPP_ACCESS_TOKEN.value();
    if (!token) {
      console.error(
        "WHATSAPP_ACCESS_TOKEN secret is empty — run `firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN`"
      );
      return;
    }

    const snap = await db
      .collection("outboundWhatsApp")
      .where("status", "==", "pending")
      .limit(50)
      .get();

    for (const doc of snap.docs) {
      const whatsapp = doc.data();

      try {
        console.log("WHATSAPP JOB", { id: doc.id, phone: whatsapp.phone });

        // FIX: was calling .map() directly on whatsapp.templateParams
        // with no check that it (or templateName) actually exist. If
        // whatever enqueues these docs still writes the old
        // { phone, message } shape instead of { templateName,
        // templateParams }, this used to throw an opaque
        // "Cannot read properties of undefined" — now it's a clear,
        // specific error written straight to the doc.
        if (!whatsapp.templateName) {
          throw new Error(
            "Missing templateName — this job was enqueued in the old free-text format, not the new template format."
          );
        }
        if (!Array.isArray(whatsapp.templateParams)) {
          throw new Error("Missing or invalid templateParams array.");
        }
        if (!whatsapp.phone) {
          throw new Error("Missing phone number.");
        }

        const normalizedPhone = whatsapp.phone.replace(/\D/g, "");

        // FIX: catches the "forgot the country code" case explicitly
        // instead of sending a doomed request to Meta and parsing
        // their generic rejection after the fact.
        if (normalizedPhone.length < 10) {
          throw new Error(
            `Phone number "${whatsapp.phone}" looks too short after normalizing — missing country code?`
          );
        }

console.log(
  "WHATSAPP PARAMS",
  JSON.stringify(
    whatsapp.templateParams
  )
);

        const response = await axios.post(
          `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: normalizedPhone,
            type: "template",
            template: {
              name: whatsapp.templateName,
              language: {
                // FIX: was hardcoded "en_GB" with no way to override —
                // this MUST match the language your template was
                // approved under in Meta Business Manager. Allow the
                // enqueue side to specify it per-job, defaulting to
                // en_GB only if it doesn't.
                code: whatsapp.templateLanguage || "en_GB",
              },
              components: [
                {
                  type: "body",
                  parameters: whatsapp.templateParams.map((value) => ({
  type: "text",
  text: String(value).trim(),
})),
                },
              ],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("WHATSAPP RESPONSE:", JSON.stringify(response.data));

        await doc.ref.update({
          status: "sent",
          sentAt: new Date().toISOString(),
          error: null,
        });

      } catch (error) {
        console.error(
          "WHATSAPP ERROR:",
          JSON.stringify(error.response?.data || error.message)
        );

        const retries = (whatsapp?.retryCount || 0) + 1;

        await doc.ref.update({
          retryCount: FieldValue.increment(1),
          status: retries >= 5 ? "dead" : "pending",
          error: JSON.stringify(error.response?.data || error.message),
        });
      }
    }
  }
);