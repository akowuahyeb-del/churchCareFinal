// hooks/useOrganizationHierarchy.js
//
// ✅ This hook is what makes the hierarchy "intelligent": it loads the
// org's real position in the chain, then walks UP to find ancestors
// and DOWN to find all descendants, collecting aggregate stats along
// the way. A District node automatically sees the sum of all its
// Congregations' members/attendance/finance — not just its own direct
// entity — because it queries every node whose parentId chain leads
// back to it.

import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc, getDoc, collection, query,
  where, getDocs, onSnapshot
} from "firebase/firestore";
import { getTemplate, getParentLevel, getChildLevel, getLevelById } from "../constants/organizationTemplates";

// Firestore path for a hierarchy node:
// organizations/{orgId}/nodes/{nodeId}
// Fields: name, levelId, parentNodeId, entityId, status, createdAt

export function useOrganizationHierarchy(organizationId, entityId) {
  const [structure, setStructure] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [ancestors, setAncestors] = useState([]);     // from immediate parent up to root
  const [descendants, setDescendants] = useState([]); // all nodes below current
  const [siblings, setSiblings] = useState([]);       // nodes at same level, same parent
  const [aggregates, setAggregates] = useState(null); // rolled-up stats across all descendants
  const [loading, setLoading] = useState(true);

  // ── LOAD STRUCTURE SETTINGS ──
  useEffect(() => {
    if (!organizationId) return;
    const unsub = onSnapshot(
      doc(db, "organizations", organizationId, "settings", "structure"),
      snap => {
        if (snap.exists()) setStructure(snap.data());
        else setStructure({ templateId: "presbyterian" });
      }
    );
    return () => unsub();
  }, [organizationId]);

  // ── LOAD CURRENT NODE (linked to this entityId) ──
  useEffect(() => {
    if (!organizationId || !entityId) return;

    const loadCurrentNode = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "organizations", organizationId, "nodes"),
          where("entityId", "==", entityId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const nodeDoc = snap.docs[0];
          setCurrentNode({ id: nodeDoc.id, ...nodeDoc.data() });
        } else {
          setCurrentNode(null);
        }
      } catch (e) {
        console.log("❌ Load current node error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentNode();
  }, [organizationId, entityId]);

  // ── WALK THE TREE ONCE CURRENT NODE IS KNOWN ──
  useEffect(() => {
    if (!organizationId || !currentNode) return;

    const walkTree = async () => {
      const templateId = structure?.templateId || "presbyterian";

      // 1. Ancestors — walk up via parentNodeId
      const ancestorList = [];
      let nextParentId = currentNode.parentNodeId;
      while (nextParentId) {
        const parentSnap = await getDoc(
          doc(db, "organizations", organizationId, "nodes", nextParentId)
        );
        if (!parentSnap.exists()) break;
        const parentNode = { id: parentSnap.id, ...parentSnap.data() };
        ancestorList.unshift(parentNode); // prepend so root is first
        nextParentId = parentNode.parentNodeId;
      }
      setAncestors(ancestorList);

      // 2. Siblings — same parent
      if (currentNode.parentNodeId) {
        const sibQ = query(
          collection(db, "organizations", organizationId, "nodes"),
          where("parentNodeId", "==", currentNode.parentNodeId)
        );
        const sibSnap = await getDocs(sibQ);
        setSiblings(
          sibSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(n => n.id !== currentNode.id)
        );
      }

      // 3. All descendants — BFS downward
      const allDescendants = [];
      const queue = [currentNode.id];
      const visited = new Set([currentNode.id]);

      while (queue.length > 0) {
        const nodeId = queue.shift();
        const childQ = query(
          collection(db, "organizations", organizationId, "nodes"),
          where("parentNodeId", "==", nodeId)
        );
        const childSnap = await getDocs(childQ);
        childSnap.docs.forEach(d => {
          if (!visited.has(d.id)) {
            visited.add(d.id);
            const child = { id: d.id, ...d.data() };
            allDescendants.push(child);
            queue.push(d.id);
          }
        });
      }
      setDescendants(allDescendants);

      // 4. Aggregate stats across all descendant entities
      // ✅ This is the actual intelligence: a District node sees the
      // rolled-up total of all its Congregations without anyone having
      // to manually report upward.
      const entityIds = [
        currentNode.entityId,
        ...allDescendants.map(n => n.entityId).filter(Boolean)
      ];

      let totalMembers = 0;
      let totalPresent = 0;
      let totalGiven = 0;
      let totalSessions = 0;

      await Promise.all(entityIds.map(async (eid) => {
        if (!eid) return;
        try {
          const [membersSnap, attendanceSnap, contributeSnap] = await Promise.all([
            getDocs(collection(db, "organizations", organizationId, "entities", eid, "members")),
            getDocs(query(
              collection(db, "organizations", organizationId, "entities", eid, "sessions"),
              where("status", "==", "ended")
            )),
            getDocs(query(
              collection(db, "organizations", organizationId, "entities", eid, "contributions"),
              where("status", "==", "acknowledged")
            )),
          ]);

          totalMembers += membersSnap.size;
          totalSessions += attendanceSnap.size;
          totalGiven += contributeSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

          // average attendance per session across all entities
          attendanceSnap.docs.forEach(d => {
            totalPresent += (d.data().finalPresent || 0);
          });
        } catch (e) {
          // individual entity read failure shouldn't block the whole aggregate
          console.log(`❌ Aggregate error for entity ${eid}:`, e);
        }
      }));

      setAggregates({
        totalMembers,
        totalPresent,
        totalSessions,
        totalGiven,
        avgAttendanceRate: totalSessions > 0
          ? Math.round((totalPresent / totalSessions / Math.max(totalMembers / entityIds.length, 1)) * 100)
          : null,
        entityCount: entityIds.length,
        descendantCount: allDescendants.length,
      });
    };

    walkTree();
  }, [organizationId, currentNode, structure]);

  const templateId = structure?.templateId || "presbyterian";
  const template = getTemplate(templateId);
  const currentLevel = currentNode ? getLevelById(templateId, currentNode.levelId) : null;
  const parentLevel = currentNode ? getParentLevel(templateId, currentNode.levelId) : null;
  const childLevel = currentNode ? getChildLevel(templateId, currentNode.levelId) : null;

  // ✅ Breadcrumb: root → ... → current, built from ancestors + current
  const breadcrumb = [
    ...ancestors.map(a => ({
      id: a.id,
      name: a.name,
      levelId: a.levelId,
      level: getLevelById(templateId, a.levelId),
    })),
    currentNode ? {
      id: currentNode.id,
      name: currentNode.name,
      levelId: currentNode.levelId,
      level: currentLevel,
      isCurrent: true,
    } : null,
  ].filter(Boolean);

  return {
    structure, template, templateId,
    currentNode, currentLevel,
    parentLevel, childLevel,
    ancestors, descendants, siblings,
    aggregates, breadcrumb,
    loading,
    isConfigured: !!currentNode,
    isTopLevel: currentLevel?.rank === 1,
    isBottomLevel: childLevel === null,
  };
}