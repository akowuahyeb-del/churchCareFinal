const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const db = getFirestore();

exports.searchOrganizationNetworks =
  onCall(async (request) => {

    const {
      query = "",
    } = request.data || {};

    const snap = await db
      .collection("governanceNodes")
      .where(
        "templateId",
        "==",
        "independent"
      )
      .where(
        "levelId",
        "==",
        "head_office"
      )
      .where(
        "status",
        "==",
        "active"
      )
      .get();

    const q =
      query.trim().toLowerCase();

    const networks = snap.docs
  .map(doc => ({
    id: doc.id,
    name: doc.data().name || "",
    location:
      doc.data().location || "",
    organizationCode:
      doc.data().organizationCode || "",
  }))

        .filter(n => {

          if (!q) {
            return true;
          }

          return (
            n.name
              .toLowerCase()
              .includes(q) ||

            n.organizationCode
              .toLowerCase()
              .includes(q)
          );
        })
        .slice(0, 20);

    return {
      networks,
    };
  });