// constants/organizationTemplates.js
//
// ✅ Defines every supported church governance structure. The active
// template for an organization is stored in Firestore as
// organizations/{orgId}/settings/structure → { templateId, ... }
// so switching templates (e.g. from Presbyterian to Methodist) is a
// one-field update, not a code change.

export const HIERARCHY_LEVELS = {
  GENERAL_ASSEMBLY: "general_assembly",
  PRESBYTERY: "presbytery",
  DISTRICT: "district",
  CONGREGATION: "congregation",
};

export const ORGANIZATION_TEMPLATES = {
  presbyterian: {
    id: "presbyterian",
    code: "PCG",
    requiresCustomCode: false,
    name: "Presbyterian Church of Ghana",
    description: "Four-tier governance: General Assembly → Presbytery → District → Congregation",
    levels: [
      {
       id: HIERARCHY_LEVELS.GENERAL_ASSEMBLY,
       label: "General Assembly",
       plural: "General Assemblies",
        icon: "globe-outline",
        color: "#4B3F72",
        rank: 1, // 1 = top, 4 = bottom
        // ✅ What data a node at this level can see — flows down through
        // the entire tree below it, not just its direct children
        visibility: ["members", "attendance", "finance", "events", "reports", "roles"],
        description: "Governing body of the national church",
      },
      {
        id: HIERARCHY_LEVELS.PRESBYTERY,
        label: "Presbytery",
        plural: "Presbyteries",
        icon: "business-outline",
        color: "#0984E3",
        rank: 2,
        visibility: ["members", "attendance", "finance", "events", "reports"],
        description: "Regional governing body overseeing Districts",
      },
      {
        id: HIERARCHY_LEVELS.DISTRICT,
        label: "District",
        plural: "Districts",
        icon: "map-outline",
        color: "#00B894",
        rank: 3,
        visibility: ["members", "attendance", "finance", "events"],
        description: "District body overseeing local Congregations",
      },
      {
        id: HIERARCHY_LEVELS.CONGREGATION,
        label: "Congregation",
        plural: "Congregations",
        icon: "home-outline",
        color: "#E17055",
        rank: 4,
        visibility: ["members", "attendance", "finance", "events"],
        description: "Local congregation — the base unit of the church",
      },
    ],
  },

  methodist: {
    id: "methodist",
    code: "MCG",
    requiresCustomCode: false,
    name: "Methodist Church Ghana",
    description: "Conference → Synod → Circuit → Society",
    levels: [
      { id: "conference", label: "Conference", plural: "Conferences", icon: "globe-outline", color: "#4B3F72", rank: 1, visibility: ["members","attendance","finance","events","reports","roles"] },
      { id: "synod",      label: "Synod",      plural: "Synods",      icon: "business-outline", color: "#0984E3", rank: 2, visibility: ["members","attendance","finance","events","reports"] },
      { id: "circuit",    label: "Circuit",    plural: "Circuits",    icon: "map-outline",      color: "#00B894", rank: 3, visibility: ["members","attendance","finance","events"] },
      { id: "society",    label: "Society",    plural: "Societies",   icon: "home-outline",     color: "#E17055", rank: 4, visibility: ["members","attendance","finance","events"] },
    ],
  },

  assemblies_of_god: {
    id: "assemblies_of_god",
    code: "AOG",
    requiresCustomCode: false,
    name: "Assemblies of God Ghana",
    description: "National Executive → Region → District → Local Assembly",
    levels: [
      { id: "national_executive", label: "National Executive", plural: "National Executive", icon: "globe-outline",     color: "#4B3F72", rank: 1, visibility: ["members","attendance","finance","events","reports","roles"] },
      { id: "region",             label: "Region",             plural: "Regions",            icon: "business-outline", color: "#0984E3", rank: 2, visibility: ["members","attendance","finance","events","reports"] },
      { id: "district",           label: "District",           plural: "Districts",          icon: "map-outline",      color: "#00B894", rank: 3, visibility: ["members","attendance","finance","events"] },
      { id: "local_assembly",     label: "Local Assembly",     plural: "Local Assemblies",   icon: "home-outline",     color: "#E17055", rank: 4, visibility: ["members","attendance","finance","events"] },
    ],
  },

cop: {
  id: "cop",

  code: "COP",

  requiresCustomCode: false,

  name: "The Church of Pentecost",

  description:
    "National Headquarters → Area → District → Local Assembly",

  levels: [
    {
      id: "national_headquarters",
      label: "National Headquarters",
      plural: "National Headquarters",
      icon: "globe-outline",
      color: "#4B3F72",
      rank: 1,
      visibility: [
        "members",
        "attendance",
        "finance",
        "events",
        "reports",
        "roles",
      ],
    },

    {
      id: "area",
      label: "Area",
      plural: "Areas",
      icon: "business-outline",
      color: "#0984E3",
      rank: 2,
      visibility: [
        "members",
        "attendance",
        "finance",
        "events",
        "reports",
      ],
    },

    {
      id: "district",
      label: "District",
      plural: "Districts",
      icon: "map-outline",
      color: "#00B894",
      rank: 3,
      visibility: [
        "members",
        "attendance",
        "finance",
        "events",
      ],
    },

    {
      id: "local_assembly",
      label: "Local Assembly",
      plural: "Local Assemblies",
      icon: "home-outline",
      color: "#E17055",
      rank: 4,
      visibility: [
        "members",
        "attendance",
        "finance",
        "events",
      ],
    },
  ],
},



independent: {
  id: "independent",

  code: null,

  requiresCustomCode: true,

  name: "Independent Church",
  description:
    "Flexible structure for independent churches with headquarters, regions, branches, and local churches.",

  levels: [
    {
      id: "head_office",
      label: "Head Office",
      plural: "Head Offices",
      rank: 1,
      icon: "business-outline",
      color: "#4B3F72",
      description: "Central governing office",
      visibility: [
        "members",
        "attendance",
        "finance",
        "events",
        "reports",
        "roles",
      ],
    },

    {
      id: "region",
      label: "Region",
      plural: "Regions",
      rank: 2,
      icon: "map-outline",
      color: "#0984E3",
      description: "Regional oversight",
      visibility: [
        "members",
        "attendance",
        "finance",
        "events",
        "reports",
      ],
    },

    {
      id: "branch",
      label: "Branch",
      plural: "Branches",
      rank: 3,
      icon: "git-branch-outline",
      color: "#27AE60",
      description: "Branch administration",
      visibility: [
        "members",
        "attendance",
        "finance",
        "events",
      ],
    },

    {
      id: "local_church",
      label: "Local Church",
      plural: "Local Churches",
      rank: 4,
      icon: "home-outline",
      color: "#E17055",
      description: "Local congregation",
      visibility: [
        "members",
        "attendance",
        "finance",
      ],
    },
  ],
},



};

export const getTemplate = (templateId) =>
  ORGANIZATION_TEMPLATES[templateId] || ORGANIZATION_TEMPLATES.presbyterian;

export const getLevelByRank = (templateId, rank) => {
  const template = getTemplate(templateId);
  return template.levels.find(l => l.rank === rank) || null;
};

export const getLevelById = (templateId, levelId) => {
  const template = getTemplate(templateId);
  return template.levels.find(l => l.id === levelId) || null;
};

// ✅ The "reports to" relationship — what level sits directly above
export const getParentLevel = (templateId, levelId) => {
  const template = getTemplate(templateId);
  const current = template.levels.find(l => l.id === levelId);
  if (!current) return null;
  return template.levels.find(l => l.rank === current.rank - 1) || null;
};

// ✅ What level sits directly below
export const getChildLevel = (templateId, levelId) => {
  const template = getTemplate(templateId);
  const current = template.levels.find(l => l.id === levelId);
  if (!current) return null;
  return template.levels.find(l => l.rank === current.rank + 1) || null;
};

export const isTopLevel = (templateId, levelId) => {
  const level = getLevelById(templateId, levelId);
  return level?.rank === 1;
};

export const isBottomLevel = (templateId, levelId) => {
  const template = getTemplate(templateId);
  const level = getLevelById(templateId, levelId);
  return level?.rank === Math.max(...template.levels.map(l => l.rank));
};