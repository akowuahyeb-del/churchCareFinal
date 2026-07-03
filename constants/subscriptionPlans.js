// constants/subscriptionPlans.js
//
// ✅ Single source of truth for every plan, its limits, and which
// features it unlocks. Mirrors constants/permissions.js's pattern —
// add a plan or feature here once, and FeatureGate/useSubscription pick
// it up everywhere automatically.

export const FEATURES = {
  AI_INSIGHTS: "ai_insights",

  QR_GENERATOR: "qr_generator",

  ADVANCED_ROLES: "advanced_roles",

  DATA_EXPORT: "data_export",

  DONATION_RECEIPTS: "donation_receipts",

  DONATION_APPROVALS: "donation_approvals",

  MULTI_BRANCH: "multi_branch",

  PRIORITY_SUPPORT: "priority_support",

  CUSTOM_BRANDING: "custom_branding",

  // NEW
  GEO_ATTENDANCE: "geo_attendance",

  ATTENDANCE_SETTINGS: "attendance_settings",

  ADVANCED_REPORTS: "advanced_reports",
};

export const LIMITS = {
  MAX_MEMBERS: "maxMembers",
  MAX_ADMINS: "maxAdmins",
};

// `null` limit = unlimited.
export const PLANS = {
  free: {
    id: "free",
    label: "Free",
    price: 0,
    currency: "GHS",
    billingCycle: "monthly",
      tagline: "For small congregations",
    limits: {
  [LIMITS.MAX_MEMBERS]: 50,
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
    tagline: "For growing congregations",
    limits: {
  [LIMITS.MAX_MEMBERS]: 300,
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
    tagline: "For large congregations and ministrie",

  limits: {
  [LIMITS.MAX_MEMBERS]: 1000,
  [LIMITS.MAX_ADMINS]: 10,
},

  features: [
    FEATURES.QR_GENERATOR,
    FEATURES.DONATION_RECEIPTS,
    FEATURES.DATA_EXPORT,
    FEATURES.MULTI_BRANCH,

    // Attendance
    FEATURES.GEO_ATTENDANCE,
    FEATURES.ATTENDANCE_SETTINGS,

    // Management
    FEATURES.ADVANCED_ROLES,
    FEATURES.DONATION_APPROVALS,

    // Reporting
    FEATURES.ADVANCED_REPORTS,

    // Branding
    FEATURES.CUSTOM_BRANDING,

    // Support
    FEATURES.PRIORITY_SUPPORT,
  ],
},
 enterprise: {
  id: "enterprise",
  label: "Enterprise",
  price: null, // Contact Sales
  currency: "GHS",
  billingCycle: "annual",

  tagline: "For larger denominations and national church bodies",

  limits: {
  [LIMITS.MAX_MEMBERS]: null,
  [LIMITS.MAX_ADMINS]: null,
},

  features: Object.values(FEATURES),

  enterpriseFeatures: [
    "Unlimited organisations",
    "Unlimited hierarchy levels",
    "National / presbytery governance",
    "Cross-entity reporting",
    "Organisation hierarchy management",
    "Advanced approval workflows",
    "AI insights & analytics",
    "Custom branding",
    "Custom domain",
    "Single sign-on (SSO)",
    "Dedicated onboarding",
    "Data migration assistance",
    "API access",
    "Priority support",
    "SLA support",
    "Dedicated account manager",
    "Custom integrations",
    "Whitelabel deployment",
  ],
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