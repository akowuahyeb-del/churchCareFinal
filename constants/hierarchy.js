// constants/hierarchy.js

// Generic hierarchy node types.
// Templates (Presbyterian, Headquarters+Branch, Custom)
// will decide which of these are actually used.

export const NODE_TYPES = {
  ORGANIZATION: "organization",

  NATIONAL_ASSEMBLY: "national_assembly",
  PRESBYTERY: "presbytery",
  DISTRICT: "district",
  CONGREGATION: "congregation",

  HEAD_OFFICE: "head_office",
  BRANCH: "branch",

  CUSTOM: "custom",
};

// Human-friendly labels
export const NODE_LABELS = {
  [NODE_TYPES.ORGANIZATION]: "Organization",

  [NODE_TYPES.NATIONAL_ASSEMBLY]: "National Assembly",
  [NODE_TYPES.PRESBYTERY]: "Presbytery",
  [NODE_TYPES.DISTRICT]: "District",
  [NODE_TYPES.CONGREGATION]: "Congregation",

  [NODE_TYPES.HEAD_OFFICE]: "Head Office",
  [NODE_TYPES.BRANCH]: "Branch",

  [NODE_TYPES.CUSTOM]: "Custom",
};

// Empty hierarchy node template
export const DEFAULT_HIERARCHY_NODE = {
  id: "",

  organizationId: "",

  name: "",
  code: "",

  type: NODE_TYPES.CONGREGATION,

  parentNodeId: null,

  active: true,

  createdAt: null,
  createdBy: null,
};