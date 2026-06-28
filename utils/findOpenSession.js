// utils/findOpenSession.js
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// ✅ Single source of truth for "what session is live right now" — used
// by qrRouter.js (so a scanned member badge checks into the right
// session automatically) and now SettingsScreen.js's "Generate Dynamic
// QR" → Attendance type (so it points at a real, open session instead
// of a fabricated one).
export async function findOpenSession(organizationId, entityId) {
  const today = new Date().toISOString().split("T")[0];

  const sessionsRef = collection(
    db, "organizations", organizationId, "entities", entityId, "sessions"
  );
  const q = query(sessionsRef, where("date", "==", today));
  const snap = await getDocs(q);

  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const live = sessions
    .filter(s => s.status === "open" || s.status === "extended")
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  return live[0] || null;
}