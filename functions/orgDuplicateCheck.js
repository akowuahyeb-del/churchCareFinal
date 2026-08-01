const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

const COMMON_WORDS = new Set([
  "the",
  "of",
  "church",
  "congregation",
  "assembly",
  "society",
  "presbyterian",
  "methodist",
  "baptist",
  "catholic",
  "pentecostal",
]);

const ABBREVIATIONS = {
  st: "saint",
  "st.": "saint",
  mt: "mount",
  "mt.": "mount",
  presby: "presbytery",
  cong: "congregation",
};

function normalize(str) {
  if (!str) return "";

  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREVIATIONS[w] || w)
    .join(" ")
    .trim();
}

function coreTokens(str) {
  return normalize(str)
    .split(" ")
    .filter(
      (w) => w && !COMMON_WORDS.has(w)
    );
}

function tokenSimilarity(a, b) {
  const setA = new Set(coreTokens(a));
  const setB = new Set(coreTokens(b));

  if (
    setA.size === 0 ||
    setB.size === 0
  ) {
    return 0;
  }

  let overlap = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      overlap++;
    }
  }

  return (
    (2 * overlap) /
    (setA.size + setB.size)
  );
}

function locationSimilarity(a, b) {
  if (!a || !b) {
    return a === b ? 1 : 0;
  }

  return tokenSimilarity(a, b);
}

async function findSimilarOrganizations({
  name,
  location,
  templateId,
  levelId,
  excludeOrgId,
  statuses = ["active", "pending"],
}) {
  const snap = await db
    .collection("organizations")
    .where("templateId", "==", templateId)
    .where("levelId", "==", levelId)
    .where("status", "in", statuses)
    .get();

  const matches = [];

  for (const doc of snap.docs) {

    if (doc.id === excludeOrgId) {
      continue;
    }

    const data = doc.data();

    const nameSim =
      tokenSimilarity(
        name,
        data.name
      );

    const locSim =
      locationSimilarity(
        location,
        data.location
      );

    const confidence =
      (
        levelId === "congregation" ||
        levelId === "society" ||
        levelId === "local_assembly" ||
        levelId === "local_church"
      )
        ? (nameSim * 0.7 + locSim * 0.3)
        : nameSim;

    if (confidence >= 0.70) {
      matches.push({
        id: doc.id,
        name: data.name,
        location:
          data.location || null,
        status:
          data.status || null,
        confidence:
          Math.round(
            confidence * 100
          ) / 100,
      });
    }
  }

  matches.sort(
    (a, b) =>
      b.confidence -
      a.confidence
  );

  return matches;
}

module.exports = {
  normalize,
  coreTokens,
  tokenSimilarity,
  locationSimilarity,
  findSimilarOrganizations,
};