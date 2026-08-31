import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  VISITOR_TYPES,
  FOLLOW_UP_STATUS,
  VISITOR_SOURCES,
} from "../constants/visitorConstants";
const findExistingVisitor = async ({
  organizationId,
  entityId,
  phone,
}) => {

  if (!phone) return null;

  const q = query(
    collection(
      db,
      "organizations",
      organizationId,
      "entities",
      entityId,
      "visitors"
    ),
    where("phone", "==", phone)
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const existing = snap.docs[0];

  return {
    id: existing.id,
    ...existing.data(),
  };
};




export const addVisitor = async ({
  organizationId,
  entityId,

  visitorType = VISITOR_TYPES.FIRST_TIME,

  source = VISITOR_SOURCES.MANUAL,

name = "",
phone = "",
email = "",
address = "",
suburb = "",

  invitedBy = "",

  notes = "",
}) => {

    console.log("🔥 ADD VISITOR START", {
  organizationId,
  entityId,
  name,
  phone,
});

const existingVisitor =
  await findExistingVisitor({
    organizationId,
    entityId,
    phone,
  });

if (existingVisitor) {
  return {
    created: false,
    duplicate: true,
    visitor: existingVisitor,
  };
}

  const payload = {
    visitorType,

    followUpStatus:
      FOLLOW_UP_STATUS.NEW,

    source,

    name,
    phone,
    email,
    address,
    suburb,

    invitedBy,

    notes,

    assignedToMemberId: "",

    interestedInMembership: false,

    convertedToMember: false,

    convertedMemberId: null,

    organizationId,
    entityId,

    firstVisitDate:
      new Date()
        .toISOString()
        .split("T")[0],

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };

console.log("🔥 VISITOR PATH", {
  organizationId,
  entityId,
});

console.log("🔥 VISITOR PAYLOAD", payload);


 const visitorsRef = collection(
  db,
  "organizations",
  organizationId,
  "entities",
  entityId,
  "visitors"
);

console.log(
  "🔥 WRITING TO",
  visitorsRef.path
);

const docRef = await addDoc(
  visitorsRef,
  payload
);

  return {
    created: true,
    visitorId: docRef.id,
  };
};