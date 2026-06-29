// constants/permissions.js
//
// ✅ Single source of truth for every permission key in the app, and the
// standard starting set of roles. Add a new permission here once, and it
// automatically shows up in the role editor's checklist everywhere.

export const PERMISSION_GROUPS = [
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
      }
    ]
  },
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
  {
    group: "People",
    permissions: [
      {
        key: "manage_attendance",
        label: "Manage Attendance",
        description: "Mark and correct attendance records."
      }
    ]
  },
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
      {
        key: "manage_donations",
        label: "Manage Donations",
        description: "Record and reconcile donations and offerings."
      }
    ]
  },
  {
    group: "Insights",
    permissions: [
      {
        key: "view_reports",
        label: "View Reports & AI Insights",
        description: "View dashboards and AI-generated financial insights."
      }
    ]
  }


  
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g =>
  g.permissions.map(p => p.key)
);

export const findPermission = (key) =>
  PERMISSION_GROUPS.flatMap(g => g.permissions).find(p => p.key === key) || null;

// ✅ STANDARD STARTING ROLES — seeded into Firestore the first time an
// organization opens the Roles screen with an empty roles collection.
// Admins are free to rename, re-permission, deactivate, or delete any of
// these except the two flagged below (protected / isDefault).
export const DEFAULT_ROLES = [
  {
    id: "super_admin",
    label: "Super Admin",
    description:
      "Full unrestricted access, including managing other admins' roles. Exactly one role like this must always exist, so it can't be edited, deactivated, or deleted.",
    permissions: ALL_PERMISSION_KEYS,
    protected: true,
    isDefault: false,
    active: true
  },
  {
    id: "admin",
    label: "Administrator",
    description:
      "Day-to-day administrative access. Cannot manage roles — only a Super Admin can do that, to prevent privilege escalation.",
    permissions: ALL_PERMISSION_KEYS.filter(k => k !== "manage_roles"),
    protected: false,
    isDefault: false,
    active: true
  },
  {
    id: "pastor",
    label: "Pastor",
    description: "Manages the service program, preachers, and the pastor's message.",
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
    description: "Manages financial records, journal entries, and donations.",
    permissions: ["manage_finance", "view_finance_reports", "manage_donations"],
    protected: false,
    isDefault: false,
    active: true
  },
  {
    id: "usher",
    label: "Usher",
    description: "Marks attendance and manages session flow.",
    permissions: ["manage_attendance", "start_session", "end_session"],
    protected: false,
    isDefault: false,
    active: true
  },
  {
    id: "media_team",
    label: "Media Team",
    description: "Uploads carousel banners and manages events.",
    permissions: ["manage_events"],
    protected: false,
    isDefault: false,
    active: true
  },
  {
    id: "member",
    label: "Member",
    description:
      "Default role every member starts with. Every member needs a fallback role, so this can be renamed and re-permissioned, but not deactivated or deleted.",
    permissions: [],
    protected: false,
    isDefault: true,
    active: true
  }
];

// ✅ Reusable everywhere else in the app — gate a screen, button, or nav
// item behind a permission instead of hardcoding role names.
// e.g. hasPermission(currentMember, "manage_finance")
export const hasPermission = (member, key) => {
  // ✅ Super Admin override (CRITICAL)
  if (member?.roles?.includes("super_admin")) return true;

  return Array.isArray(member?.permissions) &&
    member.permissions.includes(key);
};

// ✅ Union of every permission across a set of role objects — this is what
// gets written onto a member's record as their effective permission set.
export const mergePermissions = (roleObjects = []) =>
  Array.from(new Set(roleObjects.flatMap(r => r.permissions || [])));