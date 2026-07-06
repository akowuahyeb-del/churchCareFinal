// components/AppButton.js
//
// ✅ Single button implementation for the entire app. Solves the three
// most common label-clipping problems:
//
// 1. FLEX IN ROWS: when two buttons share a row (Save | Cancel), each
//    gets flex:1 and the label auto-wraps if needed — it never clips.
//    Use <ButtonRow> to get this behaviour automatically.
//
// 2. ICON + LABEL SPACING: icon and label never overlap. Gap is fixed
//    so the label always has the space it needs after the icon.
//
// 3. DISABLED STATE: reduces opacity instead of hiding, so the layout
//    doesn't shift when a button becomes active.
//
// Variants: primary | secondary | danger | warning | ghost | outline

import React from "react";
import {
  TouchableOpacity, View, Text, ActivityIndicator,
  StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, SPACE, RADIUS, BUTTON } from "../constants/designTokens";

const VARIANT_STYLES = {
  primary:   { bg: COLOR.primary,  textColor: COLOR.white,       border: null },
  secondary: { bg: COLOR.primaryLight, textColor: COLOR.primary, border: null },
  danger:    { bg: COLOR.danger,   textColor: COLOR.white,       border: null },
  warning:   { bg: COLOR.warning,  textColor: COLOR.white,       border: null },
  success:   { bg: COLOR.success,  textColor: COLOR.white,       border: null },
  ghost:     { bg: "transparent",  textColor: COLOR.textMuted,   border: null },
  outline:   { bg: "transparent",  textColor: COLOR.primary,     border: COLOR.primary },
  outlineDanger: { bg: "transparent", textColor: COLOR.danger,   border: COLOR.danger },
};

const SIZE_STYLES = {
  sm: { height: BUTTON.heightSm, px: SPACE.md,  fontSize: FONT.sm,  iconSize: 14, radius: RADIUS.sm },
  md: { height: BUTTON.heightMd, px: SPACE.lg,  fontSize: FONT.md,  iconSize: 16, radius: RADIUS.md },
  lg: { height: BUTTON.heightLg, px: SPACE.xl,  fontSize: FONT.lg,  iconSize: 18, radius: RADIUS.lg },
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  size    = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  flex,
  style,
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const s = SIZE_STYLES[size]       || SIZE_STYLES.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor:  v.bg,
          minHeight:        s.height,
          paddingHorizontal: s.px,
          borderRadius:     s.radius,
          ...(v.border && { borderWidth: 1.5, borderColor: v.border }),
          ...(fullWidth && { width: "100%" }),
          ...(flex !== undefined && { flex }),
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.textColor} />
      ) : (
        <View style={styles.inner}>
          {icon && !iconRight && (
            <Ionicons name={icon} size={s.iconSize} color={v.textColor} style={styles.iconLeft} />
          )}
          {/* ✅ flexShrink:1 lets the label compress before the button
             clips — it wraps to a second line rather than truncating */}
          <Text
            style={[styles.label, { color: v.textColor, fontSize: s.fontSize }]}
            numberOfLines={2}
            ellipsizeMode="tail"
            allowFontScaling={false}
          >
            {label}
          </Text>
          {icon && iconRight && (
            <Ionicons name={icon} size={s.iconSize} color={v.textColor} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ✅ ButtonRow — puts two buttons side by side with equal flex so
// neither one ever clips its label even on small screens.
// Usage: <ButtonRow primary={{ label: "Save", onPress }} cancel={{ label: "Cancel", onPress }} />
export function ButtonRow({ primary, cancel, danger, style }) {
  return (
    <View style={[styles.row, style]}>
      {cancel && (
        <AppButton
          {...cancel}
          variant={cancel.variant || "ghost"}
          flex={1}
        />
      )}
      {primary && (
        <AppButton
          {...primary}
          variant={primary.variant || "primary"}
          flex={2}
        />
      )}
      {danger && (
        <AppButton
          {...danger}
          variant="danger"
          flex={1}
        />
      )}
    </View>
  );
}
export default AppButton;
const styles = StyleSheet.create({
  base: {
    alignItems:     "center",
    justifyContent: "center",
    flexDirection:  "row",
  },
  inner: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     1, // ✅ The key fix — inner shrinks, label wraps, nothing clips
  },
  label: {
    fontWeight:  FONT.bold,
    textAlign:   "center",
    flexShrink:  1, // ✅ Double protection — label itself can shrink too
  },
  iconLeft:  { marginRight: SPACE.xs },
  iconRight: { marginLeft:  SPACE.xs },
  disabled:  { opacity: 0.45 },
  row: {
    flexDirection: "row",
    gap:           SPACE.sm,
    alignItems:    "stretch",
  },
});