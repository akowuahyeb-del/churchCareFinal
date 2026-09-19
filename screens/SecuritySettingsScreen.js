import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";

function TapRow({
  icon,
  label,
  sub,
  onPress,
  color,
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: color + "18" },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={color}
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.label}>
          {label}
        </Text>

        <Text style={styles.description}>
          {sub}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#999"
      />
    </TouchableOpacity>
  );
}

export default function SecuritySettingsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Advanced Security"
        subtitle="PIN overrides & protected actions"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40,
        }}
      >
        <View style={styles.infoCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color="#4B3F72"
          />

          <Text style={styles.infoText}>
            The Master PIN protects login,
            attendance, finance, approvals
            and member merge actions.
            Configure override PINs below
            when separate protection is
            required.
          </Text>
        </View>

        <TapRow
          icon="checkmark-circle-outline"
          label="Attendance Override PIN"
          sub="Configure attendance-specific PIN"
          onPress={() =>
            navigation.navigate("PinSetup", {
              pinType: "attendance",
            })
          }
          color="#27AE60"
        />

        <TapRow
          icon="cash-outline"
          label="Finance Override PIN"
          sub="Configure finance-specific PIN"
          onPress={() =>
            navigation.navigate("PinSetup", {
              pinType: "finance",
            })
          }
          color="#D97706"
        />

        <TapRow
          icon="git-merge-outline"
          label="Member Merge Override PIN"
          sub="Configure duplicate merge PIN"
          onPress={() =>
            navigation.navigate("PinSetup", {
              pinType: "merge",
            })
          }
          color="#0984E3"
        />

        <TapRow
          icon="shield-checkmark-outline"
          label="Approval Override PIN"
          sub="Configure approval workflow PIN"
          onPress={() =>
            navigation.navigate("PinSetup", {
              pinType: "approval",
            })
          }
          color="#6C5CE7"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#4B3F72",
  },

  body: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#EEF0FA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: "#4B3F72",
    lineHeight: 18,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  textWrap: {
    flex: 1,
    marginLeft: 12,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  description: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
});