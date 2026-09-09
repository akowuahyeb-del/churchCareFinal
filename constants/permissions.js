export const PERMISSION_GROUPS = [

  // ✅ ADMINISTRATION
  {
    group: "Administration",
    permissions: [
      {
        key: "manage_roles",
        label: "Manage Roles & Permissions",
        description: "Create, edit, deactivate, and delete roles. Assign roles to members."
      },
      {
        key: "manage_members",
        label: "Manage Members",
        description: "Add, edit, and remove member records."
      },
     
      {
        key: "manage_church_settings",
        label: "Manage Church Settings",
        description: "Switch the active church and edit organization/entity settings."
      },
    

    ]
  },

  // ✅ SERVICE & PROGRAM
  {
    group: "Service & Program",
    permissions: [
      {
        key: "manage_events",
        label: "Manage Events",
        description: "Create and edit events, and upload carousel banners."
      },
      {
        key: "manage_program",
        label: "Manage Service Program",
        description: "Edit the order of service for each session."
      },
      {
        key: "manage_preachers",
        label: "Manage Preachers",
        description: "Add and edit preacher profiles and link them to sessions."
      },
      {
        key: "manage_pastor_message",
        label: "Manage Pastor's Message",
        description: "Edit the homepage message from the pastor."
      }
    ]
  },

  // ✅ PEOPLE (FIXED POSITION ✅)
  {
  group: "People",
  permissions: [
    {
      key: "manage_attendance",
      label: "Manage Attendance",
      description: "Mark and correct attendance records."
    },
    {
      key: "start_session",
      label: "Start Service Session",
      description: "Allows user to start a service session"
    },
    {
      key: "end_session",
      label: "End Service Session",
      description: "Allows user to end and lock a service session"
    },
    {
      key: "unlock_session",
      label: "Unlock Service Session",
      description: "Allows user to unlock a locked session"
    },
    {
      key: "manage_visitors",
      label: "Manage Visitors",
      description: "Register visitors and manage visitor records."
    }
  ]
},

  // ✅ FINANCE (CLEANED ✅)
  {
    group: "Finance",
    permissions: [
      {
        key: "manage_finance",
        label: "Manage Finance",
        description: "Record journal entries and manage the chart of accounts."
      },
      {
        key: "view_finance_reports",
        label: "View Financial Reports",
        description: "View P&L, balance sheet, ledger, and cash flow (read-only)."
      },
      {
        key: "manage_donations",
        label: "Manage Donations",
        description: "Record and reconcile donations and offerings."
      }
    ]
  },

  // ✅ INSIGHTS
  {
    group: "Insights",
    permissions: [
      {
        key: "view_reports",
        label: "View Reports & AI Insights",
        description: "View dashboards and AI-generated insights."
      }
    ]
  }
];


// ✅ ALL KEYS
export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g =>
  g.permissions.map(p => p.key)
);


// ✅ LOOKUP
export const findPermission = (key) =>
  PERMISSION_GROUPS.flatMap(g => g.permissions)
    .find(p => p.key === key) || null;


export const PROTECTED_ROLE_IDS = [
  "bootable_admin",
  "elders",
  "pastor",
  "finance_officer",
  "auditor",
  "governance_officer",
];


export const GOVERNANCE_CONFIG = {
  

  allowSelfNomination: false,

  allowSelfApproval: false,
};

// ✅ DEFAULT ROLES
export const DEFAULT_ROLES = [


 {
  id: "admin",
  label: "Administrator",
  officeType: "administrative",
  description: "Day-to-day administration of ChurchCare",
  permissions: [
    "manage_members",
    "manage_church_settings",
    "manage_events",
    "manage_attendance",
    "start_session",
    "end_session",
    "unlock_session",
    "manage_visitors",
    "view_reports"
  ],
  protected: false,
  isDefault: false,
  active: true
},

  // ✅ FIXED ELDER ROLE ✅
  {
  id: "elders",
  
  label: "Elders",
  officeType: "governance",
  description: "Governance office awaiting appointment workflow",
  permissions: [],
  protected: true,
  isDefault: false,
  active: true
},

 {
  id: "pastor",

  label: "Pastor",
  officeType: "spiritual",
  description: "Spiritual leadership office",
  permissions: [
    "manage_program",
    "manage_preachers",
    "manage_pastor_message",
    "view_reports"
  ],
  protected: true,
  isDefault: false,
  active: true
},


  {
  id: "finance_officer",
  
  label: "Finance Officer",
  officeType: "finance",
  description: "Financial operations office",
  permissions: [
    "manage_finance",
    "manage_donations"
  ],
  protected: true,
  active: true
},

 {
  id: "auditor",
  
  label: "Auditor",
  officeType: "audit",
  description: "Independent financial oversight",
  permissions: [
    "view_finance_reports"
  ],
  protected: true,
  active: true
},


{
  id: "governance_officer",
  
  label: "Governance Officer",
  officeType: "governance",
  description: "Governance office awaiting appointment workflow",
  permissions: [],
  protected: true,
  active: true
},
{
  id: "bootable_admin",
  label: "Bootable Admin",
  officeType: "system",
  permissions: [],
  protected: true,
  active: true
},


  {
  id: "usher",
  label: "Usher",
  permissions: [
    "manage_attendance",
    "start_session",
    "end_session",
    "manage_visitors"
  ],
  active: true
},

  {
    id: "media_team",
    label: "Media Team",
    permissions: ["manage_events"],
    active: true
  },

  {
    id: "member",
    label: "Member",
    permissions: [],
    isDefault: true,
    active: true
  }
];


export const hasPermission = (member, key) => {
  if (
    member?.role === "super_admin" ||
    member?.roles?.includes("super_admin")
  ) {
    return true;
  }



  if (member?.permissions?.includes("*")) {
    return true;
  }

  if (
    Array.isArray(member?.permissions) &&
    member.permissions.includes(key)
  ) {
    return true;
  }

  // FIX: this function previously only checked an explicit permissions
  // array on the member — if a role like "usher" was assigned but its
  // permissions were never separately synced onto the member record
  // (or the role's permission list changed after that sync happened),
  // every check for that role silently failed even though DEFAULT_ROLES
  // clearly grants it. Now falls back to expanding member.role /
  // member.roles through DEFAULT_ROLES, so role membership alone is
  // sufficient — and stays correct automatically if you ever change
  // what a role grants, with no backfill needed on existing members.
  const roleIds = [
    ...(member?.role ? [member.role] : []),
    ...(Array.isArray(member?.roles) ? member.roles : []),
  ];

  if (roleIds.length > 0) {
    const rolePermissions = mergePermissions(
      DEFAULT_ROLES.filter((r) => roleIds.includes(r.id))
    );
    if (rolePermissions.includes(key)) return true;
  }

  return false;
};


// ✅ MERGE
export const mergePermissions = (roleObjects = []) =>
  Array.from(new Set(roleObjects.flatMap(r => r.permissions || [])));