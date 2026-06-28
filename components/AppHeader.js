import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "react-native";

export default function AppHeader({
  title,
  subtitle,
  entity,
  onBack,
  actions = [],
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      
      {/* ✅ SAFE HEADER WITH EXTRA SPACING */}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === "android"
                ? (insets.top || 24) + 10   // ✅ Ensure minimum spacing
                : insets.top + 6,          // ✅ Slight extra for iOS
          },
        ]}
      >

        {/* BACK BUTTON */}
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}

        {/* TITLE */}
       <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>

  {/* ✅ LOGO */}
  {entity?.logo ? (
    <Image source={{ uri: entity.logo }} style={styles.logo} />
  ) : (
    <View style={styles.logoPlaceholder}>
      <Ionicons name="business-outline" size={13} color="#f6f5fa" />
    </View>
  )}

  {/* ✅ TEXT */}
  <View style={{ marginLeft: 10 }}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? (
      <Text style={styles.subtitle}>{subtitle}</Text>
    ) : null}
  </View>

</View>

        {/* ACTIONS */}
        {actions.length > 0 && (
          <View style={styles.actionsRow}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.actionBtn}
                onPress={a.onPress}
              >
                {a.icon && (
                  <Ionicons name={a.icon} size={18} color="#fff" />
                )}
                {a.label && (
                  <Text style={styles.actionText}>{a.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#4B3F72",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  backBtnSpacer: {
    width: 38,
    height: 38,
    marginRight: 12,
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionBtn: {
    marginLeft: 10,
  },

  actionText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  logo: {
  width: 32,
  height: 32,
  borderRadius: 16,
},

logoPlaceholder: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "rgba(255,255,255,0.25)",
  alignItems: "center",
  justifyContent: "center",
},
});