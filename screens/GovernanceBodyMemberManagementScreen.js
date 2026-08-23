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
  const governanceBody =
    route?.params?.governanceBody || {
      name: "Session",
      memberLabel: "Members",
    };

  const [search, setSearch] =
    useState("");


  const [churchMembers,
  setChurchMembers] =
    useState([]);

const [loadingMembers,
  setLoadingMembers] =
    useState(false);


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

    // Prevent duplicate active membership

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
            "active"
        );

      });

    if (duplicate) {
      Alert.alert(
        "Already Added",
        `${selectedMember.name} is already an active member of ${governanceBody.name}.`
      );
      return;
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
          governanceBody.memberLabel,

        status:
          "active",

        startDate:
          new Date()
            .toISOString(),

        endDate:
          null,

        createdAt:
          new Date()
            .toISOString(),
      }

    );

    Alert.alert(
      "Success",
      `${selectedMember.name} added to ${governanceBody.name}.`
    );

    setSelectedMember(null);
    setShowAddModal(false);

  } catch (error) {

    Alert.alert(
      "Error",
      error.message
    );

  }

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

  useEffect(() => {

  loadChurchMembers();

}, [loadChurchMembers]);

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title={governanceBody.memberLabel}
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
          placeholder={`Search ${governanceBody.memberLabel}`}
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

          churchMembers.map((member) => (

            <View
              key={member.id}
              style={styles.card}
            >

              <Text style={styles.name}>
                {member.name}
              </Text>

            </View>

          ))

        )}

      </ScrollView>

     <TouchableOpacity
  style={styles.addBtn}
  onPress={() =>
    setShowAddModal(true)
  }
>
        <Text style={styles.addBtnText}>
          Add Member
        </Text>
      </TouchableOpacity>

      <Modal
  visible={showAddModal}
  animationType="slide"
>
  <View style={{ flex: 1 }}>

    <AppHeader
      title={`Add ${governanceBody.memberLabel}`}
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
          Add Member
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


});
