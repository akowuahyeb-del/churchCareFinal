import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import AsyncStorage
  from "@react-native-async-storage/async-storage";

import {
  collection,
  addDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import AppHeader
  from "../components/AppHeader";

export default function GovernanceBodySetupScreen({
  navigation,
}) {

  const [name, setName] =
    useState("");

  const [leadershipRole,
    setLeadershipRole] =
    useState("");

  const [memberLabel,
    setMemberLabel] =
    useState("");

  const [exOfficioLabel,
    setExOfficioLabel] =
    useState("");

  const [saving,
    setSaving] =
    useState(false);
    const [
  membershipMode,
  setMembershipMode,
] = useState("variable");

const [
  maxMembers,
  setMaxMembers,
] = useState("");

const [
  requiredApprovals,
  setRequiredApprovals,
] = useState("3");

  const saveGovernanceBody =
    async () => {

      if (
        !name ||
        !leadershipRole ||
        !memberLabel
      ) {

        Alert.alert(
          "Required",
          "Please complete all required fields."
        );

        return;
      }

      try {

        setSaving(true);

        const stored =
          await AsyncStorage.getItem(
            "activeEntity"
          );

        if (!stored) {
          Alert.alert(
            "Error",
            "No active church selected."
          );
          return;
        }

        const entity =
          JSON.parse(stored);

        await addDoc(
          collection(
            db,
            "organizations",
            entity.organizationId,
            "governanceBodies"
          ),
          {
            name,

            leadershipRole,

            memberLabel,

            exOfficioLabel,
membershipApprovalThreshold:
  Number(requiredApprovals),

leadershipApprovalThreshold:
  Number(requiredApprovals),


membershipMode,

maxMembers:
  membershipMode === "fixed"
    ? Number(maxMembers)
    : null,

active: true,

            createdAt:
              new Date()
                .toISOString(),
          }
        );

        Alert.alert(
          "Success",
          "Governance body created."
        );

        navigation.goBack();

      } catch (error) {

        Alert.alert(
          "Error",
          error.message
        );

      } finally {

        setSaving(false);

      }

    };

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title="Governance Body"
        subtitle="Create Governance Structure"
        onBack={() =>
          navigation.goBack()
        }
      />

      <View style={styles.container}>

        <Text style={styles.label}>
          Body Name *
        </Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Session"
        />

        <Text style={styles.label}>
          Leadership Role *
        </Text>

        <TextInput
          style={styles.input}
          value={leadershipRole}
          onChangeText={
            setLeadershipRole
          }
          placeholder="Senior Presbyter"
        />

        <Text style={styles.label}>
          Member Label *
        </Text>

        <TextInput
          style={styles.input}
          value={memberLabel}
          onChangeText={
            setMemberLabel
          }
          placeholder="Session Members"
        />

        <Text style={styles.label}>
          Ex-Officio Label
        </Text>

        <TextInput
          style={styles.input}
          value={exOfficioLabel}
          onChangeText={
            setExOfficioLabel
          }
          placeholder="Agents"
        />


<Text style={styles.label}>
  Membership Type
</Text>

<TouchableOpacity
  style={[
    styles.optionButton,
    membershipMode === "variable" &&
      styles.optionSelected,
  ]}
  onPress={() =>
    setMembershipMode("variable")
  }
>
 <Text>
  Variable Membership
  (No Maximum Limit)
</Text>
</TouchableOpacity>

<TouchableOpacity
  style={[
    styles.optionButton,
    membershipMode === "fixed" &&
      styles.optionSelected,
  ]}
  onPress={() =>
    setMembershipMode("fixed")
  }
>
  <Text>
  Fixed Membership
  (Capacity Controlled)
</Text>
</TouchableOpacity>

{membershipMode === "fixed" && (

  <>
    <Text style={styles.label}>
  Membership Capacity
</Text>

    <TextInput
      style={styles.input}
      keyboardType="numeric"
      value={maxMembers}
      onChangeText={setMaxMembers}
      placeholder="15"
    />
  </>

)}
<Text style={styles.label}>
  Required Approvals
</Text>
<Text
  style={{
    color: "#666",
    marginBottom: 8,
  }}
>
  Number of approvals required before a nomination is executed.
</Text>
<TextInput
  style={styles.input}
  keyboardType="numeric"
  value={requiredApprovals}
  onChangeText={
    setRequiredApprovals
  }
  placeholder="3"
/>


        <TouchableOpacity
          style={styles.saveBtn}
          onPress={
            saveGovernanceBody
          }
          disabled={saving}
        >

          <Text
            style={styles.saveText}
          >
            {saving
              ? "Saving..."
              : "Create Governance Body"}
          </Text>

        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 16,
  },

  label: {
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
  },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: "center",
  },

  saveText: {
    color: "#FFF",
    fontWeight: "700",
  },
optionButton: {
  backgroundColor: "#EEE",
  padding: 12,
  borderRadius: 10,
  marginBottom: 8,
},

optionSelected: {
  backgroundColor: "#DDE3FF",
},
});
