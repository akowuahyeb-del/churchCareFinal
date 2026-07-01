// constants/subscriptionPlans.js
//
// ✅ Single source of truth for every plan, its limits, and which
// features it unlocks. Mirrors constants/permissions.js's pattern —
// add a plan or feature here once, and FeatureGate/useSubscription pick
// it up everywhere automatically.

export const FEATURES = {
  AI_INSIGHTS:      "ai_insights",       // AdminFinanceScreen's AI tab
  QR_GENERATOR:     "qr_generator",      // Settings → Generate Dynamic QR
  ADVANCED_ROLES:   "advanced_roles",    // custom roles beyond the 7 defaults
  DATA_EXPORT:      "data_export",       // Settings → Export/Backup
  DONATION_RECEIPTS:"donation_receipts", // PDF receipt generation
  DONATION_APPROVALS:"donation_approvals",
  MULTI_BRANCH:     "multi_branch",      // more than 1 entity per organization
  PRIORITY_SUPPORT: "priority_support",
  CUSTOM_BRANDING:  "custom_branding",   // church logo upload
};

export const LIMITS = {
  MAX_MEMBERS:  "maxMembers",
  MAX_ENTITIES: "maxEntities", // branches/congregations per organization
  MAX_ADMINS:   "maxAdmins",
};

// `null` limit = unlimited.
export const PLANS = {
  free: {
    id: "free",
    label: "Free",
    price: 0,
    currency: "GHS",
    billingCycle: "monthly",
    tagline: "Get started with the basics",
    limits: {
      [LIMITS.MAX_MEMBERS]: 50,
      [LIMITS.MAX_ENTITIES]: 1,
      [LIMITS.MAX_ADMINS]: 2,
    },
    features: [], // no premium features
  },
  basic: {
    id: "basic",
    label: "Basic",
    price: 50,
    currency: "GHS",
    billingCycle: "monthly",
    tagline: "For a single growing church",
    limits: {
      [LIMITS.MAX_MEMBERS]: 300,
      [LIMITS.MAX_ENTITIES]: 3,
      [LIMITS.MAX_ADMINS]: 5,
    },
    features: [
      FEATURES.QR_GENERATOR,
      FEATURES.DONATION_RECEIPTS,
      FEATURES.DATA_EXPORT,
      FEATURES.MULTI_BRANCH,
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    price: 150,
    currency: "GHS",
    billingCycle: "monthly",
    tagline: "For multi-branch organizations",
    limits: {
      [LIMITS.MAX_MEMBERS]: null,
      [LIMITS.MAX_ENTITIES]: null,
      [LIMITS.MAX_ADMINS]: 4,
    },
    features: [
      FEATURES.QR_GENERATOR,
      FEATURES.DONATION_RECEIPTS,
      FEATURES.DATA_EXPORT,
      FEATURES.MULTI_BRANCH,
      FEATURES.AI_INSIGHTS,
      FEATURES.ADVANCED_ROLES,
      FEATURES.CUSTOM_BRANDING,
      FEATURES.PRIORITY_SUPPORT,
      FEATURES.DONATION_APPROVALS,
    ],
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    price: null, // "Contact us"
    currency: "GHS",
    billingCycle: "annual",
    tagline: "Custom deployments & dedicated support",
    limits: {
      [LIMITS.MAX_MEMBERS]: null,
      [LIMITS.MAX_ENTITIES]: null,
      [LIMITS.MAX_ADMINS]: null,
    },
    features: Object.values(FEATURES), // everything
  },
};

export const PLAN_ORDER = ["free", "basic", "pro", "enterprise"];

export const getPlan = (planId) => PLANS[planId] || PLANS.free;

export const planHasFeature = (planId, feature) =>
  getPlan(planId).features.includes(feature);

export const getLimit = (planId, limitKey) =>
  getPlan(planId).limits[limitKey]; // null = unlimited

// ✅ 14-day trial on Pro, the same way most SaaS products let people feel
// the upgrade before paying for it — configurable in one place.
export const TRIAL_PLAN_ID = "pro";
export const TRIAL_DAYS = 14;