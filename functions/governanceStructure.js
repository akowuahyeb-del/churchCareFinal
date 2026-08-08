// functions/governanceStructure.js

const TEMPLATE_CODES = {
  presbyterian: "PCG",
  methodist: "MCG",
  assemblies_of_god: "AOG",
  cop: "COP",
  cac: "CAC",
  sda: "SDA",
  independent: "IND",
};

const LEVEL_CODES = {
  // Presbyterian
  general_assembly: "GA",
  presbytery: "PRE",
  district: "DIS",
  congregation: "CON",

  // Methodist
  conference: "CONF",
  synod: "SYN",
  circuit: "CIR",
  society: "SOC",

  // Assemblies of God
  national_executive: "NE",
  local_assembly: "ASM",

  // COP
  national_headquarters: "NHQ",
  area: "AREA",

  // CAC
  headquarters: "HQ",
  assembly: "ASM",

  // SDA
  union_conference: "UC",
  conference_mission: "CM",

  // Independent
  head_office: "HO",
  region: "REG",
  branch: "BRA",
  local_church: "LC",
};

const TEMPLATE_LEVELS = {
  presbyterian: [
    "general_assembly",
    "presbytery",
    "district",
    "congregation",
  ],

  methodist: [
    "conference",
    "synod",
    "circuit",
    "society",
  ],

  assemblies_of_god: [
    "national_executive",
    "region",
    "district",
    "local_assembly",
  ],

  cop: [
    "national_headquarters",
    "area",
    "district",
    "local_assembly",
  ],

  cac: [
    "headquarters",
    "area",
    "district",
    "assembly",
  ],

  sda: [
    "union_conference",
    "conference_mission",
    "district",
    "local_church",
  ],

  independent: [
    "head_office",
    "region",
    "branch",
    "local_church",
  ],
};

function getHierarchyRank(templateId, levelId) {
  const levels = TEMPLATE_LEVELS[templateId];

  if (!levels) {
    return null;
  }

  const index = levels.indexOf(levelId);

  return index === -1 ? null : index + 1;
}

function getParentLevelId(templateId, levelId) {
  const levels = TEMPLATE_LEVELS[templateId];

  if (!levels) {
    return null;
  }

  const index = levels.indexOf(levelId);

  if (index <= 0) {
    return null;
  }

  return levels[index - 1];
}

function getChildLevelId(templateId, levelId) {
  const levels = TEMPLATE_LEVELS[templateId];

  if (!levels) {
    return null;
  }

  const index = levels.indexOf(levelId);

  if (
    index === -1 ||
    index >= levels.length - 1
  ) {
    return null;
  }

  return levels[index + 1];
}

module.exports = {
  TEMPLATE_CODES,
  LEVEL_CODES,

  getHierarchyRank,
  getParentLevelId,
  getChildLevelId,
};