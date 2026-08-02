// functions/permissions.js — server mirror of constants/permissions.js.
// Keep these two files in sync manually, or extract to a shared package
// once this split starts causing drift.
function hasPermission(sender, key) {
  return Array.isArray(sender?.permissions) && sender.permissions.includes(key);
}
module.exports = { hasPermission };