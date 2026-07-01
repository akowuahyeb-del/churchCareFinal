export const ORGANIZATION_TEMPLATES = {
  presbyterian: {
    id: "presbyterian",
    name: "Presbyterian Structure",

    levels: [
      "national_assembly",
      "presbytery",
      "district",
      "congregation",
    ],
  },

  head_office_branch: {
    id: "head_office_branch",
    name: "Head Office + Branches",

    levels: [
      "head_office",
      "branch",
    ],
  },

  independent: {
    id: "independent",
    name: "Single Congregation",

    levels: [
      "congregation",
    ],
  },
};
