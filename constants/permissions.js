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
        key: "elder_approval",
        label: "Elder Approval Authority",
        description: "Allows participation in high-level disciplinary approvals (2/3 governance rule)."
      },
      {
        key: "manage_church_settings",
        label: "Manage Church Settings",
        description: "Switch the active church and edit organization/entity settings."
      }
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


// ✅ DEFAULT ROLES
export const DEFAULT_ROLES = [


  {
    id: "admin",
    label: "Administrator",
    description: "Day-to-day admin access",
    permissions: ALL_PERMISSION_KEYS.filter(k => k !== "manage_roles"),
    protected: false,
    isDefault: false,
    active: true
  },

  // ✅ FIXED ELDER ROLE ✅
  {
    id: "elders",
    label: "Elders",
    description: "Governance authority for disciplinary decisions",
    permissions: [
      "manage_members",
      "elder_approval",
      "view_reports"
    ],
    protected: false,
    isDefault: false,
    active: true
  },

  {
    id: "pastor",
    label: "Pastor",
    permissions: [
      "manage_program",
      "manage_preachers",
      "manage_pastor_message",
      "view_reports",
      "view_finance_reports"
    ],
    protected: false,
    isDefault: false,
    active: true
  },

  {
    id: "finance_officer",
    label: "Finance Officer",
    permissions: [
      "manage_finance",
      "view_finance_reports",
      "manage_donations"
    ],
    protected: false,
    active: true
  },

  {
    id: "usher",
    label: "Usher",
    permissions: [
      "manage_attendance",
      "start_session",
      "end_session"
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


// ✅ PERMISSION CHECK
export const hasPermission = (member, key) => {
  if (member?.roles?.includes("super_admin")) return true;

  return Array.isArray(member?.permissions) &&
    member.permissions.includes(key);
};


// ✅ MERGE
export const mergePermissions = (roleObjects = []) =>
  Array.from(new Set(roleObjects.flatMap(r => r.permissions || [])));