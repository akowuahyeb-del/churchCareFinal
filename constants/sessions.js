// constants/sessions.js
// ✅ Single source of truth for sessions. Preacher.session and
// ProgramItem.session both point back to one of these — same id, same shape.

export const SESSIONS = [
  { id: "first-service", name: "First Service" },
  { id: "second-service", name: "Second Service" },
  { id: "youth", name: "Youth" },
  { id: "special", name: "Special" }
];

export const DEFAULT_SESSION = SESSIONS[0];

export const findSessionById = (id) => SESSIONS.find(s => s.id === id) || null;

export const sessionsMatch = (a, b) => !!a && !!b && a.id === b.id;