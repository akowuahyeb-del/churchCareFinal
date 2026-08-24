import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from "react-native";

import AsyncStorage
  from "@react-native-async-storage/async-storage";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";

import AppHeader from "../components/AppHeader";

export default function GovernanceBodyMemberManagementScreen({
  navigation,
  route,
}) {

    const [showAddModal, setShowAddModal] =
  useState(false);

const [selectedMember, setSelectedMember] =
  useState(null);
const [selectedMembership, setSelectedMembership] =
  useState(null);
  const [inactiveGovernanceMembers,
  setInactiveGovernanceMembers] =
  useState([]);

const [editing, setEditing] =
  useState(false);

  const governanceBody =
    route?.params?.governanceBody || {
      name: "Session",
      memberLabel: "Members",
    };

    const category =
  route?.params?.category || "member";

const roleLabel =
  category === "ex_officio"
    ? (governanceBody.exOfficioLabel || "Agents")
    : governanceBody.memberLabel;
  const [search, setSearch] =
    useState("");


  const [churchMembers,
  setChurchMembers] =
    useState([]);

const [loadingMembers,
  setLoadingMembers] =
    useState(false);
    const [governanceMembers, setGovernanceMembers] =
  useState([]);


const saveMember = async () => {

  if (!selectedMember) {
    Alert.alert(
      "Required",
      "Please select a member."
    );
    return;
  }

  try {

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

    const existingSnap =
      await getDocs(
        collection(
          db,
          "organizations",
          entity.organizationId,
          "governanceMemberships"
        )
      );

    const duplicate =
      existingSnap.docs.find((d) => {

        const data = d.data();

        return (
          data.governanceBodyId ===
            governanceBody.id &&
          data.memberId ===
            selectedMember.id &&
          data.status ===
            "active" &&
          (data.category || "member") ===
            category
        );

      });

    if (duplicate) {
      Alert.alert(
        "Already Added",
     `${selectedMember.name} is already an active ${roleLabel.toLowerCase()} of ${governanceBody.name}.`
      );
      return;
    }

    if (editing && selectedMembership) {

      await updateDoc(
        doc(
          db,
          "organizations",
          entity.organizationId,
          "governanceMemberships",
          selectedMembership.id
        ),
        {
          status: "inactive",
          endDate:
            new Date().toISOString(),
        }
      );

    }

    await addDoc(

      collection(
        db,
        "organizations",
        entity.organizationId,
        "governanceMemberships"
      ),

      {
        governanceBodyId:
          governanceBody.id,

        governanceBodyName:
          governanceBody.name,

        memberId:
          selectedMember.id,

        memberName:
          selectedMember.name,

        membershipRole:
          roleLabel,

        category:
          category,

        status:
          "active",

        startDate:
          new Date().toISOString(),

        endDate:
          null,

        createdAt:
          new Date().toISOString(),
      }

    );

    Alert.alert(
      "Success",
      `${selectedMember.name} added to ${governanceBody.name}.`
    );

    setSelectedMember(null);
    setSelectedMembership(null);
    setEditing(false);
    setShowAddModal(false);

    await loadGovernanceMembers();

  } catch (error) {

    Alert.alert(
      "Error",
      error.message
    );

  }

};

const removeMember = async (membership) => {

  try {

    const stored =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    if (!stored) return;

    const entity =
      JSON.parse(stored);

    await updateDoc(
      doc(
        db,
        "organizations",
        entity.organizationId,
        "governanceMemberships",
        membership.id
      ),
      {
        status: "inactive",
        endDate:
          new Date().toISOString(),
      }
    );

    await loadGovernanceMembers();

    Alert.alert(
      "Removed",
      `${membership.memberName} removed successfully.`
    );

  } catch (error) {

    Alert.alert(
      "Error",
      error.message
    );

  }

};

const replaceMember = (membership) => {

  setSelectedMembership(
    membership
  );

  setEditing(true);

  setShowAddModal(true);

};

const loadChurchMembers =
  useCallback(async () => {

    try {

      setLoadingMembers(true);

      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (!stored) return;

      const entity =
        JSON.parse(stored);

      const membersSnap =
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

      const data =
        membersSnap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data(),
          })
        );

      setChurchMembers(data);

    } catch (error) {

      console.log(
        "loadChurchMembers",
        error
      );

    } finally {

      setLoadingMembers(false);

    }

  }, []);

const loadGovernanceMembers =
  useCallback(async () => {

    try {

      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (!stored) return;

      const entity =
        JSON.parse(stored);

      const snap =
        await getDocs(
          collection(
            db,
            "organizations",
            entity.organizationId,
            "governanceMemberships"
          )
        );

      const data =
        snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter(
  (m) =>
    m.governanceBodyId ===
      governanceBody.id &&
    (m.category || "member") ===
      category
);

      setGovernanceMembers(
  data.filter(
    (m) => m.status === "active"
  )
);

setInactiveGovernanceMembers(
  data.filter(
    (m) => m.status === "inactive"
  )
);

    } catch (error) {

      console.log(
        "loadGovernanceMembers",
        error
      );

    }

  }, [
    governanceBody.id,
    category,
  ]);


 useEffect(() => {

  loadChurchMembers();
  loadGovernanceMembers();

}, [
  loadChurchMembers,
  loadGovernanceMembers,
]);

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
  title={roleLabel}
        subtitle={governanceBody.name}
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >

        <TextInput
          style={styles.search}
          placeholder={`Search ${roleLabel}`}
          value={search}
          onChangeText={setSearch}
        />

        {churchMembers.length === 0 ? (

          <View style={styles.emptyCard}>

            <Text style={styles.emptyTitle}>
              No Members Added
            </Text>

            <Text style={styles.emptyText}>
              Start building the governance
              body membership register.
            </Text>

          </View>

        ) : (

          governanceMembers.map((member) => (

            <View
  key={member.id}
  style={styles.card}
>

  <Text style={styles.name}>
    {member.memberName}
  </Text>

  <View style={styles.actions}>

    <TouchableOpacity
      style={styles.replaceBtn}
      onPress={() =>
        replaceMember(member)
      }
    >
      <Text style={styles.btnLabel}>
        Replace
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.removeBtn}
      onPress={() =>
        removeMember(member)
      }
    >
      <Text style={styles.btnLabel}>
        Remove
      </Text>
    </TouchableOpacity>

  </View>

</View>

          ))

        )}
{inactiveGovernanceMembers.length > 0 && (

  <View style={{ marginTop: 24 }}>

    <Text style={styles.sectionHeader}>
      Former {roleLabel}
    </Text>

    {inactiveGovernanceMembers.map(
      (member) => (

        <View
          key={member.id}
          style={styles.inactiveCard}
        >

          <Text style={styles.name}>
            {member.memberName}
          </Text>

         <Text style={styles.historyText}>
  Started:
  {" "}
  {member.startDate
    ? new Date(
        member.startDate
      ).toLocaleDateString()
    : "Unknown"}
</Text>

<Text style={styles.historyText}>
  Ended:
  {" "}
  {member.endDate
    ? new Date(
        member.endDate
      ).toLocaleDateString()
    : "Unknown"}
</Text>

        </View>

      )
    )}

  </View>

)}
      </ScrollView>

     <TouchableOpacity
  style={styles.addBtn}
  onPress={() =>
    setShowAddModal(true)
  }
>
        <Text style={styles.addBtnText}>
          Add {roleLabel}
        </Text>
      </TouchableOpacity>

      <Modal
  visible={showAddModal}
  animationType="slide"
>
  <View style={{ flex: 1 }}>

    <AppHeader
      title={roleLabel}
      subtitle={governanceBody.name}
      onBack={() => {
  setShowAddModal(false);
  setSelectedMember(null);
}}
    />

    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >

      <Text style={styles.modalLabel}>
        Select Church Member
      </Text>

      {churchMembers.map(
        (member) => (

          <TouchableOpacity
            key={member.id}
            style={[
              styles.option,
              selectedMember?.id ===
                member.id &&
                styles.selected,
            ]}
            onPress={() =>
              setSelectedMember(member)
            }
          >

            <Text>
              {member.name}
            </Text>

          </TouchableOpacity>

        )
      )}

      <TouchableOpacity
  style={styles.saveBtn}
  onPress={saveMember}
>
       <Text
  style={styles.saveBtnText}
>
  {editing
    ? `Replace ${roleLabel}`
    : `Add ${roleLabel}`}
</Text>
      </TouchableOpacity>

    </ScrollView>

  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  search: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 8,
    color: "#666",
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
  },

  addBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    alignItems: "center",
  },

  addBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },
modalLabel: {
  fontWeight: "700",
  marginBottom: 12,
},

option: {
  backgroundColor: "#EEE",
  padding: 12,
  borderRadius: 10,
  marginBottom: 8,
},

selected: {
  backgroundColor: "#DDE3FF",
},

saveBtn: {
  backgroundColor: "#4B3F72",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
  alignItems: "center",
},

saveBtnText: {
  color: "#FFF",
  fontWeight: "700",
},


memberName: {
  fontSize: 15,
},

actions: {
  flexDirection: "row",
  marginTop: 12,
},

replaceBtn: {
  flex: 1,
  backgroundColor: "#4B3F72",
  padding: 10,
  borderRadius: 8,
  marginRight: 6,
  alignItems: "center",
},

removeBtn: {
  flex: 1,
  backgroundColor: "#B00020",
  padding: 10,
  borderRadius: 8,
  marginLeft: 6,
  alignItems: "center",
},

btnLabel: {
  color: "#FFF",
  fontWeight: "700",
},
sectionHeader: {
  fontSize: 16,
  fontWeight: "700",
  marginBottom: 12,
},

inactiveCard: {
  backgroundColor: "#F5F5F5",
  borderRadius: 12,
  padding: 12,
  marginBottom: 10,
},

historyText: {
  color: "#666",
  marginTop: 4,
},
});
