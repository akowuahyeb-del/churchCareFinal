import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

function membersCollection(organizationId, entityId) {
  return collection(
    db,
    "organizations",
    organizationId,
    "entities",
    entityId,
    "members"
  );
}

/* -------------------------------------------------- */
/* Duplicate Check                                    */
/* -------------------------------------------------- */

export async function checkDuplicateMember({
  organizationId,
  entityId,
  phone,
  email,
}) {
  const matches = new Map();

  const col = membersCollection(
    organizationId,
    entityId
  );

  if (phone) {
    const snap = await getDocs(
      query(col, where("phone", "==", phone))
    );

    snap.forEach((d) => {
      matches.set(d.id, {
        id: d.id,
        ...d.data(),
        matchedOn: "phone",
      });
    });
  }

  if (email) {
    const snap = await getDocs(
      query(
        col,
        where(
          "email",
          "==",
          email.toLowerCase().trim()
        )
      )
    );

    snap.forEach((d) => {
      if (!matches.has(d.id)) {
        matches.set(d.id, {
          id: d.id,
          ...d.data(),
          matchedOn: "email",
        });
      }
    });
  }

  return Array.from(matches.values());
}

/* -------------------------------------------------- */
/* Manual Add                                         */
/* -------------------------------------------------- */

export async function addMemberManually({
  organizationId,
  entityId,
  forceCreate = false,
  ...memberData
}) {
  if (!forceCreate) {
    const matches =
      await checkDuplicateMember({
        organizationId,
        entityId,
        phone: memberData.phone,
        email: memberData.email,
      });

    if (matches.length > 0) {
      return {
        created: false,
        duplicate: true,
        matches,
      };
    }
  }

  const ref = await addDoc(
    membersCollection(
      organizationId,
      entityId
    ),
    {
      ...memberData,

      lifecycleStatus:
        memberData.lifecycleStatus ||
        "member",

      source:
        memberData.source || "manual",

      duplicateOf: null,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      lastStageChangeAt:
        serverTimestamp(),
    }
  );

  return {
    created: true,
    id: ref.id,
  };
}

/* -------------------------------------------------- */
/* Bulk Upload                                        */
/* -------------------------------------------------- */

export async function bulkAddMembers({
  organizationId,
  entityId,
  rows,
}) {
  const results = {
    created: [],
    duplicates: [],
    failed: [],
  };

  for (const row of rows) {
    try {
      const duplicateMatches =
        await checkDuplicateMember({
          organizationId,
          entityId,
          phone: row.phone,
          email: row.email,
        });

      if (duplicateMatches.length > 0) {
        results.duplicates.push({
          row,
          matches: duplicateMatches,
        });

        continue;
      }

      const docRef = await addDoc(
        membersCollection(
          organizationId,
          entityId
        ),
        {
          ...row,

          lifecycleStatus:
            "member",

          source:
            "bulk_upload",

          duplicateOf: null,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

          lastStageChangeAt:
            serverTimestamp(),
        }
      );

      results.created.push({
        row,
        id: docRef.id,
      });

    } catch (e) {
      results.failed.push({
        row,
        error: e.message,
      });
    }
  }

  return results;
}

/* -------------------------------------------------- */
/* Force Create                                       */
/* -------------------------------------------------- */

export async function forceCreateMember({
  organizationId,
  entityId,
  row,
  source = "bulk_upload",
}) {
  const ref = await addDoc(
    membersCollection(
      organizationId,
      entityId
    ),
    {
      ...row,

      lifecycleStatus:
        "member",

      source,

      duplicateOf: null,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      lastStageChangeAt:
        serverTimestamp(),
    }
  );

  return {
    created: true,
    id: ref.id,
  };
}

/* -------------------------------------------------- */
/* Merge Existing                                     */
/* -------------------------------------------------- */

export async function mergeIntoExistingMember({
  organizationId,
  entityId,
  existingMemberId,
  row,
}) {
  const ref = doc(
    db,
    "organizations",
    organizationId,
    "entities",
    entityId,
    "members",
    existingMemberId
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(
      "Existing member not found"
    );
  }

  const existing =
    snap.data();

  const fill = {};

  Object.keys(row).forEach((key) => {
    if (
      row[key] &&
      !existing[key]
    ) {
      fill[key] = row[key];
    }
  });

  await updateDoc(ref, {
    ...fill,
    updatedAt:
      serverTimestamp(),
  });

  return {
    merged: true,
    id: existingMemberId,
  };
}