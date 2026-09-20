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

function SecurityRow({
  icon,
  title,
  subtitle,
  color,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: `${color}20` },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={color}
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.subtitle}>
          {subtitle}
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
        subtitle="Override PIN management"
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
            Your Master PIN protects ChurchCare by
            default. Configure optional override
            PINs below for sensitive actions that
            require separate security.
          </Text>
        </View>

        <SecurityRow
          icon="checkmark-circle-outline"
          title="Attendance Override PIN"
          subtitle="Separate PIN for attendance actions"
          color="#27AE60"
          onPress={() =>
            navigation.navigate("PinSetup", {
              mode: "attendance",
            })
          }
        />

        <SecurityRow
          icon="cash-outline"
          title="Finance Override PIN"
          subtitle="Separate PIN for financial actions"
          color="#D97706"
          onPress={() =>
            navigation.navigate("PinSetup", {
              mode: "finance",
            })
          }
        />

        <SecurityRow
          icon="git-merge-outline"
          title="Merge Override PIN"
          subtitle="Separate PIN for member merging"
          color="#0984E3"
          onPress={() =>
            navigation.navigate("PinSetup", {
              mode: "merge",
            })
          }
        />

        <SecurityRow
          icon="shield-checkmark-outline"
          title="Approval Override PIN"
          subtitle="Separate PIN for approvals"
          color="#6C5CE7"
          onPress={() =>
            navigation.navigate("PinSetup", {
              mode: "approval",
            })
          }
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
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },

  infoText: {
    flex: 1,
    marginLeft: 10,
    color: "#4B3F72",
    fontSize: 12,
    lineHeight: 18,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  textWrap: {
    flex: 1,
    marginLeft: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  subtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },
});
