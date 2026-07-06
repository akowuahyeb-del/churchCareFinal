// components/AppModal.js
//
// ✅ Wraps React Native's Modal with:
//   - KeyboardAvoidingView so inputs inside modals don't get covered
//   - SafeAreaView for notched devices
//   - Max height cap so modal never extends off-screen
//   - Scrollable content area for long modals
//   - Consistent header with title, subtitle, and close button
//   - ButtonRow at the bottom that always has room for its labels

import React from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, SPACE, RADIUS, MODAL, SHADOW } from "../constants/designTokens";
import { AppButton, ButtonRow } from "./AppButton";

const { height: SCREEN_H } = Dimensions.get("window");

export function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  // Bottom action props — pass these instead of putting buttons inside children
  // so the modal always lays them out correctly
  primaryAction,    // { label, onPress, variant?, icon?, loading? }
  cancelAction,     // { label, onPress } — defaults to "Cancel" + onClose
  dangerAction,     // { label, onPress }
  // Layout
  maxHeightPercent = 0.85,
  scrollable       = true,
  bottomSheet      = false, // slides up from bottom instead of centered
}) {
  const insets = useSafeAreaInsets();
  const maxH   = SCREEN_H * maxHeightPercent;

  const resolvedCancel = cancelAction || (onClose ? { label: "Cancel", onPress: onClose } : null);

  const content = (
    <View style={[
      styles.box,
      bottomSheet ? styles.boxBottom : styles.boxCenter,
      {
        maxHeight:    maxH,
        paddingBottom: Math.max(insets.bottom, SPACE.lg),
      }
    ]}>
      {/* HEADER */}
      {(title || onClose) && (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {title && (
              <Text
                style={styles.title}
                numberOfLines={2}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                style={styles.subtitle}
                numberOfLines={3}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close" size={20} color={COLOR.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* BODY */}
      {scrollable ? (
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingBottom: SPACE.md }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View>{children}</View>
      )}

      {/* ACTIONS — rendered outside ScrollView so they stay pinned */}
      {(primaryAction || resolvedCancel || dangerAction) && (
        <View style={styles.actions}>
          <ButtonRow
            primary={primaryAction}
            cancel={resolvedCancel}
            danger={dangerAction}
          />
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={bottomSheet ? "slide" : "fade"}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        {content}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ✅ Convenience variant: ConfirmModal — for simple yes/no dialogs
// where inline children aren't needed
export function ConfirmModal({
  visible, onClose, onConfirm,
  title, message,
  confirmLabel  = "Confirm",
  cancelLabel   = "Cancel",
  confirmVariant = "primary",
  loading,
  icon,
  iconColor,
}) {
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={title}
      scrollable={false}
      primaryAction={{ label: confirmLabel, onPress: onConfirm, variant: confirmVariant, loading }}
      cancelAction={{ label: cancelLabel, onPress: onClose }}
    >
      {(icon || message) && (
        <View style={{ alignItems: "center", paddingVertical: SPACE.md }}>
          {icon && (
            <Ionicons name={icon} size={44} color={iconColor || COLOR.primary}
              style={{ marginBottom: SPACE.md }} />
          )}
          {message && (
            <Text style={styles.confirmMessage} allowFontScaling={false}>
              {message}
            </Text>
          )}
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent:  "flex-end",
  },
  box: {
    backgroundColor: COLOR.surface,
    paddingHorizontal: MODAL.padding,
    paddingTop:        MODAL.padding,
    ...SHADOW.lg,
  },
  boxCenter: {
    marginHorizontal: "4%",
    marginBottom:     "8%",
    borderRadius:     MODAL.borderRadius,
  },
  boxBottom: {
    borderTopLeftRadius:  MODAL.borderRadius,
    borderTopRightRadius: MODAL.borderRadius,
  },
  header: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    gap:            SPACE.sm,
    marginBottom:   SPACE.lg,
  },
  title: {
    fontSize:    FONT.xl,
    fontWeight:  FONT.extrabold,
    color:       COLOR.textPrimary,
  },
  subtitle: {
    fontSize:   FONT.sm,
    color:      COLOR.textMuted,
    marginTop:  SPACE.xs,
    lineHeight: FONT.sm * 1.5,
  },
  closeBtn: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: COLOR.background,
    alignItems:      "center",
    justifyContent:  "center",
  },
  actions: {
    paddingTop: SPACE.lg,
    borderTopWidth: 1,
    borderTopColor: COLOR.border,
    marginTop: SPACE.sm,
  },
  confirmMessage: {
    fontSize:   FONT.md,
    color:      COLOR.textSecondary,
    textAlign:  "center",
    lineHeight: FONT.md * 1.6,
    paddingHorizontal: SPACE.md,
  },
});