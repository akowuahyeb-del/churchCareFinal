// functions/governanceLinking.js
//
// Auto-linking engine for the governance hierarchy tree.
//
// Two very different situations feed into this:
//
//   DENOMINATIONAL templates (presbyterian, methodist, etc.) — there is no
//   parent-selection UI for these at all today, and each templateId
//   represents exactly ONE global tree (e.g. "presbyterian" = the whole
//   Presbyterian Church of Ghana). So for these, count-based auto-matching
//   (link if exactly one active candidate exists) is safe.
//
//   "independent" template — this is a bucket for MANY unrelated church
//   networks, not one tree. Count-based matching is NOT safe here: two
//   unrelated single-church networks would each have exactly one
//   head_office, and blindly linking by count would cross-wire them.
//   Independent orgs go through an explicit relationship picker in
//   CreateChurchScreen instead:
//     - "existing_parent"  -> parentNodeId is already known and validated
//                             server-side at registration. Trust it.
//     - "future_parent"    -> expectedParentName is known but the parent
//                             doesn't exist yet. Match by name once a
//                             same-template node with that name appears.
//     - "independent"      -> deliberately standalone. Never link.
//
// Priority order when linking any node's parent:
//   1. Explicit parentNodeId (already validated at registration time).
//   2. relationshipMode === "independent" -> standalone, no linking.
//   3. relationshipMode === "future_parent" -> queue for name-based match.
//   4. Otherwise (denominational, no relationship data) -> count-based
//      auto-match within the single global tree for that templateId.

const { getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

const {
  getParentLevelId,
  getChildLevelId,
} = require("./governanceStructure");

const { normalize } = require("./orgDuplicateCheck");

const db = getFirestore();

async function getActiveNodesAtLevel(templateId, levelId) {
  const snap = await db
    .collection("governanceNodes")
    .where("templateId", "==", templateId)
    .where("levelId", "==", levelId)
    .where("status", "==", "active")
    .get();

  return snap.docs;
}

async function flagAmbiguousLink({
  nodeId,
  organizationId,
  direction,
  candidateIds,
  reason,
}) {
  await db
    .collection("governanceLinkIssues")
    .doc(nodeId)
    .set(
      {
        nodeId,
        organizationId: organizationId || null,
        direction,
        candidateIds,
        reason,
        resolved: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
}

async function clearLinkIssue(nodeId) {
  await db
    .collection("governanceLinkIssues")
    .doc(nodeId)
    .set(
      { resolved: true, resolvedAt: new Date().toISOString() },
      { merge: true }
    );
}

// Recursively push a networkId down onto any already-linked descendants.
// Needed because a subtree can get connected to the rest of its network
// out of order (e.g. a branch links to its region before we've walked
// back down to propagate the network id onto the branch's own children).
async function propagateNetworkId(parentNodeId, networkId) {
  const snap = await db
    .collection("governanceNodes")
    .where("parentNodeId", "==", parentNodeId)
    .where("status", "==", "active")
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { networkId });
  }
  await batch.commit();

  for (const doc of snap.docs) {
    await propagateNetworkId(doc.id, networkId);
  }
}

/**
 * FORWARD LINK — attach `node` to its parent using, in priority order:
 * explicit parentNodeId, "independent" standalone mode, "future_parent"
 * name-matching queue, or (denominational only) count-based matching.
 */


async function linkToParent(nodeRef, node) {

    console.log(
  "LINK_TO_PARENT",
  JSON.stringify(node, null, 2)
);
  const parentLevelId = getParentLevelId(node.templateId, node.levelId);

  if (!parentLevelId) {
    // Top of the tree (rank 1) — nothing to link to. For "independent"
    // templates this IS the network root, so its own networkId is itself.
    return {
      linked: false,
      ambiguous: false,
      networkId:
        node.templateId === "independent" ? nodeRef.id : null,
    };
  }

  // 1. Explicit parentNodeId — already validated server-side at
  // registration (see submitOrganizationRegistration). Trust it.
  if (node.parentNodeId) {
    const parentSnap = await db
      .collection("governanceNodes")
      .doc(node.parentNodeId)
      .get();

    if (parentSnap.exists) {
      const parent = parentSnap.data();
      await nodeRef.update({
        parentNodeId: node.parentNodeId,
        pendingLink: false,
      });
      await clearLinkIssue(nodeRef.id);
      return {
        linked: true,
        ambiguous: false,
        networkId: parent.networkId || node.parentNodeId,
      };
    }
    // Parent vanished between registration and approval (edge case) —
    // fall through to normal handling rather than hard-failing approval.
  }

  // 2. Deliberately standalone — never link.
  if (node.relationshipMode === "independent") {
    await nodeRef.update({ parentNodeId: null, pendingLink: false });
    await clearLinkIssue(nodeRef.id);
    return { linked: false, ambiguous: false, networkId: node.networkId || null };
  }

  // 3. Future parent — queue for name-based matching, no guessing.
  if (node.relationshipMode === "future_parent" && node.expectedParentName) {
    await nodeRef.update({
      parentNodeId: null,
      pendingLink: true,
      expectedParentName: node.expectedParentName,
      expectedParentLevel: node.expectedParentLevel || null,
    });
    await flagAmbiguousLink({
      nodeId: nodeRef.id,
      organizationId: node.organizationId,
      direction: "parent",
      candidateIds: [],
      reason: `Waiting for a "${parentLevelId}" named "${node.expectedParentName}" to be registered.`,
    });
    return { linked: false, ambiguous: false, networkId: null };
  }

  // 4. Denominational fallback — count-based matching within the single
  // global tree for this templateId. NEVER used for "independent".
  if (node.templateId === "independent") {
    // No explicit signal at all for an independent org — can't safely
    // guess across unrelated networks. Queue it.
    await nodeRef.update({ parentNodeId: null, pendingLink: true });
    await flagAmbiguousLink({
      nodeId: nodeRef.id,
      organizationId: node.organizationId,
      direction: "parent",
      candidateIds: [],
      reason:
        "Independent organisation registered with no relationship selection — needs manual linking.",
    });
    return { linked: false, ambiguous: true, networkId: null };
  }

console.log(
  "PARENT SEARCH",
  {
    node: node.name,
    templateId: node.templateId,
    levelId: node.levelId,
    parentLevelId,
  }
);

  const candidates = await getActiveNodesAtLevel(
    node.templateId,
    parentLevelId
  );

  console.log(
  "PARENT CANDIDATES",
  candidates.map(c => ({
    id: c.id,
    ...c.data(),
  }))
);

  if (candidates.length === 0) {
    await nodeRef.update({ parentNodeId: null, pendingLink: true });
    return { linked: false, ambiguous: false, networkId: null };
  }

  if (candidates.length === 1) {
    await nodeRef.update({
      parentNodeId: candidates[0].id,
      pendingLink: false,
    });
    await clearLinkIssue(nodeRef.id);
    return { linked: true, ambiguous: false, networkId: null };
  }

  await nodeRef.update({ parentNodeId: null, pendingLink: true });
  await flagAmbiguousLink({
    nodeId: nodeRef.id,
    organizationId: node.organizationId,
    direction: "parent",
    candidateIds: candidates.map((d) => d.id),
    reason: `Multiple active "${parentLevelId}" nodes exist for template "${node.templateId}" — cannot determine which is the parent of "${node.name}" without an explicit selection.`,
  });
  return { linked: false, ambiguous: true, networkId: null };
}

/**
 * BACKWARD LINK — adopt existing orphans that were waiting for `node`.
 *
 * Pass 1 (all templates): NAME MATCH. Any orphan with expectedParentName
 * matching this node's name (and this node is structurally the correct
 * rank to be its parent) gets linked, regardless of how many siblings
 * exist — the name is an explicit signal, not a guess.
 *
 * Pass 2 (denominational templates only): COUNT MATCH. Remaining orphans
 * one rank below `node`, with no expectedParentName, get adopted only if
 * `node` is the sole active node at its own level (single global tree
 * assumption). Never runs for "independent" — see file header.
 */
async function adoptOrphanChildren(nodeRef, node) {
  const childLevelId = getChildLevelId(node.templateId, node.levelId);
  if (!childLevelId) {
    return { adopted: 0, ambiguousSkipped: 0 };
  }

  let adopted = 0;

  // ---- Pass 1: name-based matching (works for any template) ----
  const nameCandidatesSnap = await db
    .collection("governanceNodes")
    .where("templateId", "==", node.templateId)
    .where("status", "==", "active")
    .where("pendingLink", "==", true)
    .get();

  const normalizedNodeName = normalize(node.name);

  const nameMatches = nameCandidatesSnap.docs.filter((d) => {

  
    const data = d.data();
    return (
      data.expectedParentName &&
      normalize(data.expectedParentName) === normalizedNodeName &&
      getParentLevelId(data.templateId, data.levelId) === node.levelId
    );
  });
  console.log(
  "ORPHAN MATCHES",
  {
    parent: node.name,
    parentLevel: node.levelId,
    matches: nameMatches.map(m => ({
      id: m.id,
      ...m.data(),
    })),
  }
);


  if (nameMatches.length > 0) {
    const now = new Date().toISOString();
    const batch = db.batch();
    for (const match of nameMatches) {
      batch.update(match.ref, {
        parentNodeId: nodeRef.id,
        pendingLink: false,
        networkId: node.networkId || null,
        updatedAt: now,
      });
    }
    await batch.commit();

    for (const match of nameMatches) {
      await clearLinkIssue(match.id);
      if (node.networkId) {
        await propagateNetworkId(match.id, node.networkId);
      }
    }
    adopted += nameMatches.length;
  }

  // ---- Pass 2: count-based matching (denominational templates only) ----
  if (node.templateId === "independent") {
    return { adopted, ambiguousSkipped: 0 };
  }

  const siblingsAtThisLevel = await getActiveNodesAtLevel(
    node.templateId,
    node.levelId
  );
  const unambiguousParent = siblingsAtThisLevel.length === 1;

  const childCandidates = await getActiveNodesAtLevel(
    node.templateId,
    childLevelId
  );

  const alreadyMatchedIds = new Set(nameMatches.map((d) => d.id));

  const orphans = childCandidates.filter((d) => {
    if (alreadyMatchedIds.has(d.id)) return false;
    const data = d.data();
    return (
      (!data.parentNodeId || data.pendingLink === true) &&
      !data.expectedParentName // only blind-match nodes with no explicit signal
    );
  });

  if (orphans.length === 0) {
    return { adopted, ambiguousSkipped: 0 };
  }

  if (!unambiguousParent) {
    for (const orphan of orphans) {
      await flagAmbiguousLink({
        nodeId: orphan.id,
        organizationId: orphan.data().organizationId,
        direction: "child_adoption",
        candidateIds: siblingsAtThisLevel.map((d) => d.id),
        reason: `Multiple active "${node.levelId}" nodes exist for template "${node.templateId}" — cannot determine which one "${orphan.data().name}" belongs under without an explicit selection.`,
      });
    }
    return { adopted, ambiguousSkipped: orphans.length };
  }

  const now = new Date().toISOString();
  const batch = db.batch();
  for (const orphan of orphans) {
    batch.update(orphan.ref, {
      parentNodeId: nodeRef.id,
      pendingLink: false,
      updatedAt: now,
    });
  }
  await batch.commit();

  for (const orphan of orphans) {
    await clearLinkIssue(orphan.id);
  }

  adopted += orphans.length;
  return { adopted, ambiguousSkipped: 0 };
}

/**
 * Main entry point — call right after a governance node is created.
 *
 * node must include: templateId, levelId, organizationId, name, and
 * optionally: parentNodeId, relationshipMode, expectedParentName,
 * expectedParentLevel, networkId (all from the organization doc).
 */
async function linkNewGovernanceNode(nodeRef, node) {
  const parentResult = await linkToParent(nodeRef, node);

  if (parentResult.networkId) {
    await nodeRef.update({ networkId: parentResult.networkId });
  }

  const nodeForAdoption = {
    ...node,
    networkId: parentResult.networkId || node.networkId || null,
  };

  const adoptionResult = await adoptOrphanChildren(nodeRef, nodeForAdoption);

  return {
    parentLinked: parentResult.linked,
    parentAmbiguous: parentResult.ambiguous,
    childrenAdopted: adoptionResult.adopted,
    childrenAmbiguousSkipped: adoptionResult.ambiguousSkipped,
  };
}

// --------------------------------------------------------------------
// Admin callables
// --------------------------------------------------------------------

exports.listPendingGovernanceLinks = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }

  const { templateId } = request.data || {};

  const snap = await db
    .collection("governanceLinkIssues")
    .where("resolved", "==", false)
    .get();

  let issues = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (templateId) {
    issues = issues.filter((i) => i.templateId === templateId);
  }

  return { issues };
});

exports.resolveGovernanceLink = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }

  const { nodeId, parentNodeId } = request.data || {};

  if (!nodeId || !parentNodeId) {
    throw new HttpsError(
      "invalid-argument",
      "nodeId and parentNodeId are required"
    );
  }

  const nodeRef = db.collection("governanceNodes").doc(nodeId);
  const parentRef = db.collection("governanceNodes").doc(parentNodeId);

  const [nodeSnap, parentSnap] = await Promise.all([
    nodeRef.get(),
    parentRef.get(),
  ]);

  if (!nodeSnap.exists) {
    throw new HttpsError("not-found", "Node not found");
  }
  if (!parentSnap.exists) {
    throw new HttpsError("not-found", "Parent node not found");
  }

  const node = nodeSnap.data();
  const parent = parentSnap.data();

  if (node.templateId !== parent.templateId) {
    throw new HttpsError(
      "failed-precondition",
      "Node and parent belong to different templates"
    );
  }

  const expectedParentLevel = getParentLevelId(
    node.templateId,
    node.levelId
  );

  if (parent.levelId !== expectedParentLevel) {
    throw new HttpsError(
      "failed-precondition",
      `Expected a "${expectedParentLevel}" as parent, got "${parent.levelId}"`
    );
  }

  await nodeRef.update({
    parentNodeId,
    pendingLink: false,
    networkId: parent.networkId || null,
    updatedAt: new Date().toISOString(),
  });

  await clearLinkIssue(nodeId);

  if (parent.networkId) {
    await propagateNetworkId(nodeId, parent.networkId);
  }

  await db.collection("auditLogs").add({
    action: "governance_link_resolved_manually",
    nodeId,
    parentNodeId,
    resolvedByUid: request.auth.uid,
    resolvedByEmail: request.auth.token?.email || null,
    createdAt: new Date().toISOString(),
  });

  return { success: true, nodeId, parentNodeId };
});

module.exports = {
  linkNewGovernanceNode,
  linkToParent,
  adoptOrphanChildren,
};