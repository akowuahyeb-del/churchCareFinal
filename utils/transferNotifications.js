// utils/transferNotifications.js
//
// ✅ Two helpers used by both TransferRequestScreen (when submitting)
// and TransferManagementScreen (when approving/rejecting). Kept here
// so both screens never have to duplicate the "who holds
// manage_members?" query.

import { db } from "../firebase";
import {
  collection, getDocs, addDoc, doc, setDoc,
  query, where
} from "firebase/firestore";

// ✅ Find everyone who holds manage_members in this entity and write
// an in-app notification for each of them.
export const notifyApprovers = async (organizationId, entityId, payload) => {
  try {
    const membersSnap = await getDocs(
      collection(db, "organizations", organizationId, "entities", entityId, "members")
    );

    const approvers = membersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m =>
        Array.isArray(m.permissions) && m.permissions.includes("manage_members")
      );

    await Promise.all(
      approvers.map(approver =>
        createMemberNotification(organizationId, approver.id, {
          type:       "transfer_approval_needed",
          title:      "Transfer Request Needs Approval",
          body:       `${payload.memberName} has requested a transfer from ${payload.fromEntityName} to ${payload.toEntityName}. Reason: ${payload.reason}. Requested by: ${payload.requestedByName}.`,
          transferId: payload.transferId,
        })
      )
    );
  } catch (e) {
    console.log("❌ notifyApprovers:", e);
  }
};

// ✅ Write a single notification for a specific member (by their
// member document ID, which is used as a stable identifier here).
// The notifications collection is per-org so it stays scoped.
export const createMemberNotification = async (organizationId, memberId, payload) => {
  try {
    await addDoc(
      collection(db, "organizations", organizationId, "notifications", memberId, "items"),
      {
        ...payload,
        read: false,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (e) {
    console.log("❌ createMemberNotification:", e);
  }
};