// constants/inKindCategories.js

export const INKIND_CATEGORIES = [
  {
    key: "building_materials",
    label: "Building Materials",
    icon: "construct-outline",
    color: "#D97706",
    units: ["Bags", "Tonnes", "Cubic metres", "Sheets", "Litres", "Pieces", "Loads"],
    examples: ["Cement", "Sand", "Gravel", "Roofing sheets", "Iron rods", "Blocks", "Timber", "Paint"],
  },
  {
    key: "furniture",
    label: "Furniture & Fittings",
    icon: "cube-outline",
    color: "#7C3AED",
    units: ["Pieces", "Sets", "Pairs"],
    examples: ["Chairs", "Tables", "Pulpit", "Pews", "Shelving", "Cabinets", "Lighting fixtures"],
  },
  {
    key: "equipment",
    label: "Equipment & Electronics",
    icon: "hardware-chip-outline",
    color: "#0891B2",
    units: ["Units", "Sets", "Pieces"],
    examples: ["Projector", "Sound system", "Microphones", "Generator", "Fans", "Air conditioner", "Computers"],
  },
  {
    key: "food_consumables",
    label: "Food & Consumables",
    icon: "basket-outline",
    color: "#059669",
    units: ["Bags", "Crates", "Cartons", "Bottles", "Kg", "Litres", "Pieces"],
    examples: ["Rice", "Oil", "Drinks", "Bread", "Detergent", "Stationery"],
  },
  {
    key: "books_educational",
    label: "Books & Educational",
    icon: "book-outline",
    color: "#4B3F72",
    units: ["Copies", "Sets", "Boxes"],
    examples: ["Bibles", "Hymnals", "Sunday school materials", "Textbooks"],
  },
  {
    key: "land_property",
    label: "Land & Property",
    icon: "map-outline",
    color: "#DC2626",
    units: ["Plots", "Acres", "Sq metres", "Units"],
    examples: ["Land", "Building", "Vehicle"],
  },
  {
    key: "services",
    label: "Professional Services",
    icon: "people-outline",
    color: "#0984E3",
    units: ["Hours", "Days", "Jobs"],
    examples: ["Legal services", "Architecture", "Construction labour", "IT services", "Medical"],
  },
  {
    key: "other_inkind",
    label: "Other In-Kind",
    icon: "gift-outline",
    color: "#888",
    units: ["Units", "Pieces", "Kg", "Litres", "Sets"],
    examples: [],
  },
];

export const CONDITION_OPTIONS = [
  { key: "new",       label: "Brand New",   color: "#27ae60" },
  { key: "used_good", label: "Used — Good", color: "#F39C12" },
  { key: "used_fair", label: "Used — Fair", color: "#e67e22" },
];

export const DONOR_TYPES = [
  { key: "member",    label: "Individual Member", icon: "person-outline"  },
  { key: "group",     label: "Group",             icon: "people-outline"  },
  { key: "ministry",  label: "Ministry",          icon: "star-outline"    },
  { key: "anonymous", label: "Anonymous",         icon: "eye-off-outline" },
  { key: "external",  label: "External / Corporate", icon: "business-outline" },
];

export const findCategory = (key) =>
  INKIND_CATEGORIES.find(c => c.key === key) || INKIND_CATEGORIES[INKIND_CATEGORIES.length - 1];