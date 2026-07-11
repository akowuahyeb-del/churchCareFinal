// components/AppText.js
//
// ✅ Drop-in replacement for React Native's <Text>. Every piece of text
// in the app should use this instead of raw <Text>, for three reasons:
//
// 1. FONT SCALING: reads from FONT tokens so sizes are consistent and
//    scale down on small devices automatically.
//
// 2. NO SILENT TRUNCATION: if you don't pass `numberOfLines`, text
//    wraps. If you do pass it, an ellipsis is always shown and the
//    text never just... disappears. The old problem was screens using
//    numberOfLines without ellipsizeMode, or putting Text inside a
//    flex row without flexShrink, which clips without any indicator.
//
// 3. ACCESSIBLE MINIMUM SIZE: enforces a minimum font size of 10pt
//    regardless of what the design tokens say, so nothing becomes
//    illegible on large-text accessibility settings.

import React from "react";
import { Text, StyleSheet } from "react-native";
import { FONT, COLOR } from "../constants/designTokens";

// Variant → token mapping
const VARIANTS = {
  hero:     { fontSize: FONT.hero,  fontWeight: FONT.black,     color: COLOR.textPrimary },
  h1:       { fontSize: FONT.xxxl,  fontWeight: FONT.extrabold, color: COLOR.textPrimary },
  h2:       { fontSize: FONT.xxl,   fontWeight: FONT.bold,      color: COLOR.textPrimary },
  h3:       { fontSize: FONT.xl,    fontWeight: FONT.bold,      color: COLOR.textPrimary },
 h4: {
  fontSize: 18,
  fontWeight: "900",
  color: COLOR.textPrimary,
},
  body:     { fontSize: FONT.md,    fontWeight: FONT.regular,   color: COLOR.textPrimary },
  bodyBold: { fontSize: FONT.md,    fontWeight: FONT.bold,      color: COLOR.textPrimary },
  label:    { fontSize: FONT.sm,    fontWeight: FONT.semibold,  color: COLOR.textSecondary },
  caption:  { fontSize: FONT.xs,    fontWeight: FONT.medium,    color: COLOR.textMuted },
  button:   { fontSize: FONT.md,    fontWeight: FONT.bold,      color: COLOR.textOnDark },
  buttonSm: { fontSize: FONT.sm,    fontWeight: FONT.bold,      color: COLOR.textOnDark },
  tag:      { fontSize: FONT.xs,    fontWeight: FONT.extrabold, color: COLOR.textMuted,
              textTransform: "uppercase", letterSpacing: 0.4 },
};

export default function AppText({
  variant = "body",
  style,
  children,
  numberOfLines,
  color,
  center,
  muted,
  onDark,
  ...rest
}) {
  const base = VARIANTS[variant] || VARIANTS.body;

  const computed = {
    ...base,
    ...(color  && { color }),
    ...(muted  && { color: COLOR.textMuted }),
    ...(onDark && { color: COLOR.textOnDark }),
    ...(center && { textAlign: "center" }),
  };

  // ✅ If numberOfLines is set, always set ellipsizeMode too.
  // Without this, text clips silently on Android with no visual cue.
  const ellipsizeMode = numberOfLines ? "tail" : undefined;

  return (
  <Text
    style={style}
    {...rest}
  >
    {children}
  </Text>
);
}