// constants/donationMethods.js
//
// ✅ Ghana-focused payment methods. Mobile Money here means "record a
// payment that was sent via MoMo and reconcile it" — not an in-app debit.
// A real charge would need a gateway (Paystack/Flutterwave both support
// Ghana MoMo collections) called from a Cloud Function, the same pattern
// used for the Anthropic API key earlier in this build — never call a
// payment API directly from the client with a secret key embedded.

export const PAYMENT_METHODS = [
  { key: "cash",  label: "Cash",         icon: "cash-outline",          color: "#27ae60" },
  { key: "momo",  label: "Mobile Money", icon: "phone-portrait-outline", color: "#FFC107" },
  { key: "bank",  label: "Bank Transfer", icon: "business-outline",      color: "#2980b9" },
  { key: "card",  label: "Card",         icon: "card-outline",          color: "#8e44ad" },
];

// ✅ Ghana MoMo providers — prefixes used for auto-detection below
export const MOMO_PROVIDERS = [
  { key: "mtn",      label: "MTN Mobile Money", color: "#FFC107", prefixes: ["024", "054", "055", "059"] },
  { key: "telecel",  label: "Telecel Cash",     color: "#E60000", prefixes: ["020", "050"] },
  { key: "airteltigo", label: "AirtelTigo Money", color: "#0066B3", prefixes: ["026", "027", "056", "057"] },
];

// ✅ "Smart" touch — detect the MoMo provider from the phone number as
// the admin types it, instead of making them pick it manually
export const detectMomoProvider = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  // normalize +233/233 prefix to a leading 0
  const local = digits.startsWith("233") ? "0" + digits.slice(3) : digits;
  const prefix = local.slice(0, 3);

  return MOMO_PROVIDERS.find(p => p.prefixes.includes(prefix)) || null;
};

export const isValidGhanaPhone = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  const local = digits.startsWith("233") ? "0" + digits.slice(3) : digits;
  return /^0\d{9}$/.test(local);
};

export const findMethod = (key) => PAYMENT_METHODS.find(m => m.key === key) || null;