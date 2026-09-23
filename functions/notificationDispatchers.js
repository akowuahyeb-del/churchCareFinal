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
  "EAAj5XptIeLcBSrqzaBkBZBpVHUPR2iHGs5fucMN6St5LpZCn2FpLFEh9uUV3n8YNoDEUJzURbovZAj2Ya9GEuCvzXqwVVWP8OOAriBCHLz6P5koa2rluB3VHkRfZC0FMf7lz7MpLGxluSguArdX6przE3jpbBMywbqvO13hQugxo34wdKbvnqJjP27LSfzNoYUJZAZCR0jUc1OQNZCn13qYyL8jw5o0KSiq8EtJ61yHdxYvzatykXpBhd6AnpRLcSIOuM8nFFguCci1TrgmsycD2r7fJ9ByqupQsLx21jIZD";

const axios = require("axios");

const sgMail =
  require("@sendgrid/mail");

sgMail.setApiKey("REPLACE_ME");




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

         await sgMail.send({

  to:
    email.to,

  from:
    "admin@bryeak.com",

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

          const response =
            await axios.post(

              `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,

              {
                messaging_product:
                  "whatsapp",

                to:
                  whatsapp.phone.replace(/\D/g, ""),

                type:
                  "template",

                template: {
                  name:
                    whatsapp.templateName,

                  language: {
                    code:
                      "en_GB",
                  },

                  components: [
                    {
                      type:
                        "body",

                      parameters:
                        whatsapp.templateParams.map(
                          value => ({
                            type:
                              "text",

                            text:
                              value,
                          })
                        ),
                    },
                  ],
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

          console.log(
            "WHATSAPP RESPONSE:",
            JSON.stringify(
              response.data
            )
          );

          await doc.ref.update({

            status:
              "sent",

            sentAt:
              new Date().toISOString(),

            error:
              null,

          });

        } catch (error) {

          console.error(
            "WHATSAPP ERROR:",
            JSON.stringify(
              error.response?.data ||
              error.message
            )
          );

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
