import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function GovernanceRoleManagementScreen({ navigation, route }) {
  const governanceBody = route?.params?.governanceBody;
  const [churchMembers, setChurchMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    const stored = await AsyncStorage.getItem("activeEntity");
    if (!stored) return;
    const entity = JSON.parse(stored);

    const snap = await getDocs(
      collection(db, "organizations", entity.organizationId, "entities", entity.entityId, "members")
    );
    setChurchMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const assignRole = async () => {
    if (!selectedMember || !governanceBody) {
      Alert.alert("Required", "Select a member.");
      return;
    }

    setSaving(true);
    try {
     const stored = await AsyncStorage.getItem("activeEntity");
const entity = JSON.parse(stored);

const memberSnap =
  await getDocs(
    collection(
      db,
      "organizations",
      entity.organizationId,
      "entities",
      entity.entityId,
      "members"
    )
  );

const currentMember =
console.log(
  "CURRENT MEMBER:",
  currentMember
);
  memberSnap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    .find(
      (m) =>
        m.id === entity.memberId
    );


      const existingSnap = await getDocs(
        collection(
  db,
  "organizations",
  entity.organizationId,
  "governanceLeadership"
)
      );

     const existingHolders =
  existingSnap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))
   .filter(
  (m) =>
    m.governanceBodyId ===
      governanceBody.id &&
    m.role ===
      governanceBody.leadershipRole &&
    m.status === "active"
);

const hasCurrentHolder =
  existingHolders.length > 0;


   await addDoc(
  collection(
    db,
    "organizations",
    entity.organizationId,
    "approvalRequests"
  ),
  {
  type: "governance",

  organizationId:
    entity.organizationId,

  requestedBy:
    entity.memberId || null,

 requestedByName:
  currentMember?.name ||
  "Unknown",

 nominationType:
  "leadership",

actionType:
  hasCurrentHolder
    ? "replace_leader"
    : "fill_vacancy",

  governanceBodyId:
    governanceBody.id,

  governanceBodyName:
    governanceBody.name,
    

  memberId:
    selectedMember.id,

  memberName:
    selectedMember.name,

 leadershipRole:
  governanceBody.leadershipRole,
  role:
  governanceBody.leadershipRole,


replacingMemberId:
  hasCurrentHolder
    ? existingHolders[0].memberId
    : null,

replacingMemberName:
  hasCurrentHolder
    ? existingHolders[0].memberName
    : null,

category:
  "leadership",

status:
  "pending",

  approvedBy: [],

  rejectedBy: [],

  requestedAt:
    new Date().toISOString(),
}
);

Alert.alert(
  "Nomination Sent",
  `${selectedMember.name} has been nominated for ${governanceBody.leadershipRole}.`
);

navigation.goBack();

return;

    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={`Assign ${governanceBody?.leadershipRole || "Leader"}`}
        subtitle={governanceBody?.name || ""}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 120,
  }}
>
        <Text style={styles.label}>Select Member</Text>
        {churchMembers.map((member) => (
          <TouchableOpacity
            key={member.id}
            style={[styles.option, selectedMember?.id === member.id && styles.selected]}
            onPress={() => setSelectedMember(member)}
          >
            <Text>{member.name}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={assignRole} disabled={saving}>
          <Text style={styles.saveText}>
            {saving ? "Saving..." : `Assign ${governanceBody?.leadershipRole || "Leader"}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "700", marginBottom: 12 },
  option: { backgroundColor: "#EEE", padding: 12, borderRadius: 10, marginBottom: 8 },
  selected: { backgroundColor: "#DDE3FF" },
  saveBtn: { backgroundColor: "#4B3F72", padding: 16, borderRadius: 12, marginTop: 16, alignItems: "center" },
  saveText: { color: "#FFF", fontWeight: "700" },
});