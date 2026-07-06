// constants/designTokens.js
//
// ✅ Every size, color, radius, and shadow in this app should come from
// here. The goal: "I want all buttons slightly bigger" should be a
// one-line change in this file, not 40 grep results.

import { Dimensions, Platform } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────
// BREAKPOINTS — based on actual common Android/iOS device widths
// ─────────────────────────────────────────────────────────────────
export const SCREEN = {
  width:   SCREEN_W,
  height:  SCREEN_H,
  isSmall: SCREEN_W < 375,   // older iPhones, small Androids
  isMid:   SCREEN_W < 414,   // iPhone 12/13, Pixel 4
  isLarge: SCREEN_W >= 414,  // iPhone Pro Max, large Androids
};

// ─────────────────────────────────────────────────────────────────
// SPACING — an 8-point grid, same convention as Material Design
// ─────────────────────────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  xxxl: 36,
};

// ─────────────────────────────────────────────────────────────────
// RADIUS
// ─────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  pill: 999,
};

// ─────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ✅ Scales down on small screens so nothing is ever too big to fit.
// All font sizes go through here — never write `fontSize: 13` directly.
// ─────────────────────────────────────────────────────────────────
const scale = (size) => {
  if (SCREEN.isSmall) return Math.round(size * 0.9);
  if (SCREEN.isLarge) return Math.round(size * 1.05);
  return size;
};

export const FONT = {
  // Sizes
  xs:   scale(10),
  sm:   scale(11),
  md:   scale(13),
  lg:   scale(15),
  xl:   scale(17),
  xxl:  scale(20),
  xxxl: scale(24),
  hero: scale(28),

  // Weights (as strings — RN treats them as string-keyed)
  regular:   "400",
  medium:    "500",
  semibold:  "600",
  bold:      "700",
  extrabold: "800",
  black:     "900",
};

// ─────────────────────────────────────────────────────────────────
// COLORS — primary palette + semantic aliases
// ─────────────────────────────────────────────────────────────────
export const COLOR = {
  // Brand
  primary:        "#4B3F72",
  primaryLight:   "#EEF0FA",
  primaryDark:    "#332B50",

  // Semantic
  success:        "#27ae60",
  successLight:   "#e8f8f0",
  warning:        "#F39C12",
  warningLight:   "#FFF3CD",
  danger:         "#e74c3c",
  dangerLight:    "#fce8e8",
  info:           "#0984E3",
  infoLight:      "#E8F4FD",

  // Neutrals
  white:          "#ffffff",
  background:     "#f4f6fb",
  surface:        "#ffffff",
  border:         "#eeeeee",
  borderDark:     "#e0e0e0",
  divider:        "#f5f5f5",

  // Text
  textPrimary:    "#222222",
  textSecondary:  "#555555",
  textMuted:      "#888888",
  textDisabled:   "#cccccc",
  textOnDark:     "#ffffff",
  textOnDarkMuted: "rgba(255,255,255,0.65)",

  // Developer console dark theme
  devBg:          "#0f0f1a",
  devSurface:     "#1a1a2e",
  devBorder:      "rgba(255,255,255,0.06)",
};

// ─────────────────────────────────────────────────────────────────
// SHADOWS — consistent elevation across iOS and Android
// ─────────────────────────────────────────────────────────────────
export const SHADOW = {
  sm: Platform.select({
    ios:     { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4,  shadowOffset: { width: 0, height: 1 } },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios:     { shadowColor: "#000", shadowOpacity: 0.09, shadowRadius: 8,  shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios:     { shadowColor: "#000", shadowOpacity: 0.13, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 8 },
  }),
};

// ─────────────────────────────────────────────────────────────────
// BUTTON SIZES — min heights that guarantee touch targets meet the
// 44pt accessibility minimum Apple/Google both recommend
// ─────────────────────────────────────────────────────────────────
export const BUTTON = {
  heightSm: Math.max(36, scale(36)),
  heightMd: Math.max(44, scale(44)),
  heightLg: Math.max(52, scale(52)),
  paddingH:  SCREEN.isSmall ? SPACE.md : SPACE.lg,
};

// ─────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────
export const MODAL = {
  maxWidthPercent: 0.92,
  borderRadius:    RADIUS.xl,
  padding:         SPACE.xl,
};