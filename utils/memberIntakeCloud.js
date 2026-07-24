// utils/memberIntake.js
//
// Client-side wrapper around the onboarding Cloud Functions. Use this instead
// of writing directly to the members collection, so every intake path
// (manual add, bulk upload, QR self-serve) gets duplicate checking and
// consistent lifecycle status for free.

import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { app, db } from "../firebase"; // adjust if your firebase.js exports the app under a different name

const functions = getFunctions(app);

const _createMemberSafe = httpsCallable(functions, "createMemberSafe");
const _checkDuplicateMember = httpsCallable(functions, "checkDuplicateMember");
const _submitVisitorIntake = httpsCallable(functions, "submitVisitorIntake");
const _inviteMember = httpsCallable(functions, "inviteMember");
const _markActiveUser = httpsCallable(functions, "markActiveUser");
const _getFunnelStats = httpsCallable(functions, "getFunnelStats");

// ── Manual add (from an admin screen) ──────────────────────────────
// Returns { created: true, id } or { created: false, duplicate: true, matches }
// so the UI can show a "this looks like an existing person" prompt.
export async function addMemberManually({ organizationId, entityId, name, phone, email, forceCreate = false }) {
  const res = await _createMemberSafe({
    organizationId, entityId, name, phone, email,
    source: "manual",
    lifecycleStatus: "member",
    forceCreate,
  });
  return res.data;
}

// ── Bulk upload ─────────────────────────────────────────────────────
// rows: [{ name, phone, email }, ...]
// Returns a summary so the UI can show "12 added, 3 flagged as duplicates".
export async function bulkAddMembers({ organizationId, entityId, rows }) {
  const results = { created: [], duplicates: [], failed: [] };

  for (const row of rows) {
    try {
      const res = await _createMemberSafe({
        organizationId, entityId,
        ...row, // ministry, status, address, etc. — whatever columns the CSV had
        name: row.name, phone: row.phone, email: row.email,
        source: "bulk_upload",
        lifecycleStatus: "member",
      });
      if (res.data.created) {
        results.created.push({ row, id: res.data.id });
      } else {
        results.duplicates.push({ row, matches: res.data.matches });
      }
    } catch (e) {
      results.failed.push({ row, error: e.message });
    }
  }

  return results;
}

// ── QR self-serve (visitor check-in / "I'm interested" form) ────────
// Safe to call from an unauthenticated screen — the Cloud Function itself
// is public (submitVisitorIntake), no admin session required.
export async function submitVisitorForm({ organizationId, entityId, name, phone, email, source }) {
  const res = await _submitVisitorIntake({ organizationId, entityId, name, phone, email, source });
  return res.data;
}

// ── Duplicate check on demand (e.g. live-check as an admin types) ───
export async function checkDuplicateMember({ organizationId, entityId, phone, email, name }) {
  const res = await _checkDuplicateMember({ organizationId, entityId, phone, email, name });
  return res.data.matches;
}

// ── Send an invite (Member → Invited) ────────────────────────────────
export async function inviteMember({ organizationId, entityId, memberId, channel }) {
  const res = await _inviteMember({ organizationId, entityId, memberId, channel });
  return res.data;
}

// ── Call right after a successful login (email or PIN unlock) ───────
// Safe to call every login — it's a no-op once the member is already active_user.
export async function markActiveUser({ organizationId, entityId, memberId }) {
  if (!organizationId || !entityId || !memberId) return;
  try {
    await _markActiveUser({ organizationId, entityId, memberId });
  } catch (e) {
    console.log("markActiveUser error (non-fatal):", e);
  }
}

// ── Duplicate resolution (used by the review screen) ────────────────

// Create anyway, bypassing the dedupe check — admin has reviewed and
// confirmed this really is a separate person.
export async function forceCreateMember({ organizationId, entityId, row, source = "bulk_upload" }) {
  const res = await _createMemberSafe({
    organizationId, entityId,
    ...row,
    name: row.name, phone: row.phone, email: row.email,
    source, lifecycleStatus: "member",
    forceCreate: true,
  });
  return res.data;
}

// Merge: don't create a new record, just fill in any gaps on the existing
// matched member with data from the incoming row, and bump updatedAt so
// it shows as a recent touchpoint.
export async function mergeIntoExistingMember({ organizationId, entityId, existingMemberId, row }) {
  const ref = doc(db, "organizations", organizationId, "entities", entityId, "members", existingMemberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Existing member not found");
  const existing = snap.data();

  // Only fill in fields the existing record doesn't already have — never
  // overwrite something an admin already entered.
  const fill = {};
  for (const key of Object.keys(row)) {
    if (row[key] && !existing[key]) fill[key] = row[key];
  }

  await updateDoc(ref, { ...fill, updatedAt: serverTimestamp() });
  return { merged: true, id: existingMemberId };
}

export async function getFunnelStats({ organizationId, entityId }) {
  const res = await _getFunnelStats({ organizationId, entityId });
  return res.data;
}