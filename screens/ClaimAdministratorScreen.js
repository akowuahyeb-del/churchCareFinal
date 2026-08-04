import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

export default function ClaimAdministratorScreen({
  route,
  navigation,
}) {
  const { org } = route.params || {};

  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    try {
      setLoading(true);

      // TODO:
      // call claimAdministratorRole()
      // create member record
      // link uid
      // set adminUid
      // set adminMemberId
      // set adminClaimed = true
      // onboardingStatus = "onboarding_in_progress"

      navigation.replace("Onboarding", {
        org,
      });

    } catch (e) {
      Alert.alert(
        "Claim Failed",
        e.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Administrator Role Claim
      </Text>

      <Text style={styles.subtitle}>
        This church has been approved.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Church
        </Text>

        <Text style={styles.value}>
          {org?.name}
        </Text>

        <Text style={styles.label}>
          Organisation Code
        </Text>

        <Text style={styles.value}>
          {org?.organizationCode || "Pending"}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Before onboarding can continue,
          your ChurchCare identity must be
          linked to an official member record.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.claimBtn}
        disabled={loading}
        onPress={handleClaim}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.claimBtnText}>
            Claim Administrator Role
          </Text>
        )}
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 20,
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  label: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
  },

  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  infoBox: {
    backgroundColor: "#EEF0FA",
    padding: 14,
    borderRadius: 10,
    marginBottom: 24,
  },

  infoText: {
    color: "#4B3F72",
    fontSize: 12,
    lineHeight: 18,
  },

  claimBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  claimBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
