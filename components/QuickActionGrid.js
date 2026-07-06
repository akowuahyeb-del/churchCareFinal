// components/QuickActionGrid.js
//
// ✅ The HomeScreen "quick actions" row clips on small screens because
// each button has a fixed width and a fixed label that doesn't wrap.
// This component replaces that with a responsive grid where every
// action gets an equal share of the available width and its label
// wraps if needed.

import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, SPACE, RADIUS, SHADOW } from "../constants/designTokens";

const { width: SCREEN_W } = Dimensions.get("window");

export default function QuickActionGrid({
  actions,    // [{ key, label, icon, color, onPress, badge? }]
  columns = 4,
}) {
  const itemW = (SCREEN_W - SPACE.lg * 2 - SPACE.sm * (columns - 1)) / columns;

  return (
    <View style={styles.grid}>
      {actions.map(action => (
        <TouchableOpacity
          key={action.key}
          style={[styles.item, { width: itemW }]}
          onPress={action.onPress}
          activeOpacity={0.75}
        >
          <View style={[styles.circle, { backgroundColor: (action.color || COLOR.primary) + "18" }]}>
            <Ionicons
              name={action.icon}
              size={22}
              color={action.color || COLOR.primary}
            />
            {action.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText} allowFontScaling={false}>
                  {action.badge > 99 ? "99+" : action.badge}
                </Text>
              </View>
            )}
          </View>
          {/* ✅ numberOfLines={2} + textAlign center = wraps gracefully
             instead of truncating or overflowing the button */}
          <Text
            style={[styles.label, { color: action.color || COLOR.textSecondary }]}
            numberOfLines={2}
            textBreakStrategy="highQuality"
            ellipsizeMode="tail"
            allowFontScaling={false}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            SPACE.sm,
    paddingHorizontal: SPACE.lg,
  },
  item: {
    alignItems: "center",
    gap:        SPACE.xs,
  },
  circle: {
    width:          54,
    height:         54,
    borderRadius:   RADIUS.lg,
    alignItems:     "center",
    justifyContent: "center",
    ...SHADOW.sm,
  },
  label: {
    fontSize:   FONT.xs,
    fontWeight: FONT.semibold,
    textAlign:  "center",
    lineHeight: FONT.xs * 1.4,
  },
  badge: {
    position:        "absolute",
    top:             -2,
    right:           -2,
    backgroundColor: COLOR.danger,
    borderRadius:    10,
    minWidth:        18,
    height:          18,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     2,
    borderColor:     COLOR.surface,
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize:   FONT.xs,
    fontWeight: FONT.black,
    color:      COLOR.white,
  },
});