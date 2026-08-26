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
import DateTimePicker
  from "@react-native-community/datetimepicker";

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
  const [
  showHistoricalModal,
  setShowHistoricalModal,
] = useState(false);

const [
  historicalStartDate,
  setHistoricalStartDate,
] = useState(null);

const [
  historicalEndDate,
  setHistoricalEndDate,
] = useState(null);

const [
  showStartPicker,
  setShowStartPicker,
] = useState(false);

const [
  showEndPicker,
  setShowEndPicker,
] = useState(false);

const [
  historicalNotes,
  setHistoricalNotes,
] = useState("");
const [
  appointmentType,
  setAppointmentType,
] = useState("historical");

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

  appointmentType:
    "current",

  historical:
    false,

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

const formatDate = (date) => {

  if (!date) return "";

  return date.toLocaleDateString(
    "en-GB"
  );

};


const saveHistoricalService =
  async () => {

    if (!selectedMember) {

      Alert.alert(
        "Required",
        "Please select a member."
      );

      return;
    }

    if (
      !historicalStartDate ||
      !historicalEndDate
    ) {

      Alert.alert(
        "Required",
        "Start and End dates are required."
      );

      return;
    }

    try {

      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (!stored) {
        return;
      }

      const entity =
        JSON.parse(stored);

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
            "inactive",

         historical: true,

appointmentType,

historicalNotes:
  historicalNotes || "",

        startDate:
  historicalStartDate.toISOString(),

endDate:
  historicalEndDate.toISOString(),


          createdAt:
            new Date().toISOString(),
        }

      );

      Alert.alert(
        "Success",
        "Historical service record added."
      );

      setSelectedMember(null);

     setHistoricalStartDate(null);

setHistoricalEndDate(null);

      setHistoricalNotes("");
      setAppointmentType(
  "historical"
);

      setShowHistoricalModal(
        false
      );

      await loadGovernanceMembers();

    } catch (error) {

      Alert.alert(
        "Error",
        error.message
      );

    }

  };

const removeMember = async (membership) => {

  Alert.alert(
    "Remove Member",
    `Are you sure you want to remove ${membership.memberName}?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {

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

        },
      },
    ]
  );

};

const restoreMember = async (membership) => {

  try {

    const stored =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    if (!stored) return;

    const entity =
      JSON.parse(stored);

    await addDoc(

      collection(
        db,
        "organizations",
        entity.organizationId,
        "governanceMemberships"
      ),

      {
        governanceBodyId:
          membership.governanceBodyId,

        governanceBodyName:
          membership.governanceBodyName,

        memberId:
          membership.memberId,

        memberName:
          membership.memberName,

        membershipRole:
          membership.membershipRole,

       category:
  membership.category || "member",

       status:
  "active",

appointmentType:
  "restored",

historical:
  false,

startDate:
  new Date().toISOString(),

        endDate:
          null,

        createdAt:
          new Date().toISOString(),
      }

    );

    await loadGovernanceMembers();

    Alert.alert(
      "Restored",
      `${membership.memberName} restored successfully.`
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
<Text style={styles.historyText}>
  Served:
  {" "}
  {(() => {

    if (
      !member.startDate ||
      !member.endDate
    ) {
      return "Unknown";
    }

    const start =
      new Date(
        member.startDate
      );

    const end =
      new Date(
        member.endDate
      );

    const diffMonths =
      Math.floor(
        (end - start) /
        (1000 * 60 * 60 * 24 * 30)
      );

    if (diffMonths < 1) {
      return "Less than 1 month";
    }

    if (diffMonths === 1) {
      return "1 month";
    }

    if (diffMonths < 12) {
      return `${diffMonths} months`;
    }

    const years =
      Math.floor(
        diffMonths / 12
      );

    const months =
      diffMonths % 12;

    if (months === 0) {
      return years === 1
        ? "1 year"
        : `${years} years`;
    }

    return `${years} year${years > 1 ? "s" : ""} ${months} month${months > 1 ? "s" : ""}`;

  })()}
</Text>
<TouchableOpacity
  style={styles.restoreBtn}
  onPress={() =>
    restoreMember(member)
  }
>
  <Text style={styles.btnLabel}>
    Restore
  </Text>
</TouchableOpacity>
        </View>

      )
    )}

  </View>

)}
      </ScrollView>

    <View style={styles.actionRow}>

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

  <TouchableOpacity
    style={styles.historyBtn}
    onPress={() =>
      setShowHistoricalModal(true)
    }
  >
    <Text style={styles.addBtnText}>
      Historical Service
    </Text>
  </TouchableOpacity>

</View>

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

<Modal
  visible={showHistoricalModal}
  animationType="slide"
>

  <View style={{ flex: 1 }}>

    <AppHeader
      title="Historical Service"
      subtitle={governanceBody.name}
      onBack={() =>
        setShowHistoricalModal(false)
      }
    />

    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >

      <Text style={styles.modalLabel}>
        Select Member
      </Text>

      {churchMembers.map((member) => (

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

      ))}

      <Text style={styles.modalLabel}>
        Service Start Date
      </Text>

     <TouchableOpacity
  style={styles.input}
  onPress={() =>
    setShowStartPicker(true)
  }
>

  <Text>
    {historicalStartDate
      ? formatDate(
          historicalStartDate
        )
      : "Select Start Date"}
  </Text>

</TouchableOpacity>

{showStartPicker && (

  <DateTimePicker
    value={
      historicalStartDate ||
      new Date()
    }
    mode="date"
    display="default"
    onChange={(
      event,
      selectedDate
    ) => {

      setShowStartPicker(false);

      if (selectedDate) {
        setHistoricalStartDate(
          selectedDate
        );
      }

    }}
  />

)}

      <Text style={styles.modalLabel}>
        Service End Date
      </Text>

      <TouchableOpacity
  style={styles.input}
  onPress={() =>
    setShowEndPicker(true)
  }
>

  <Text>
    {historicalEndDate
      ? formatDate(
          historicalEndDate
        )
      : "Select End Date"}
  </Text>

</TouchableOpacity>

{showEndPicker && (

  <DateTimePicker
    value={
      historicalEndDate ||
      new Date()
    }
    mode="date"
    display="default"
    onChange={(
      event,
      selectedDate
    ) => {

      setShowEndPicker(false);

      if (selectedDate) {
        setHistoricalEndDate(
          selectedDate
        );
      }

    }}
  />

)}
<Text style={styles.modalLabel}>
  Appointment Type
</Text>

<View style={styles.typeContainer}>

  {[
    {
      value: "historical",
      label: "Historical",
    },
    {
      value: "appointed",
      label: "Appointed",
    },
    {
      value: "elected",
      label: "Elected",
    },
    {
      value: "interim",
      label: "Interim",
    },
  ].map((type) => (

    <TouchableOpacity
      key={type.value}
      style={[
        styles.typeChip,
        appointmentType ===
          type.value &&
          styles.typeChipSelected,
      ]}
      onPress={() =>
        setAppointmentType(
          type.value
        )
      }
    >

      <Text
        style={[
          styles.typeChipText,
          appointmentType ===
            type.value &&
            styles.typeChipTextSelected,
        ]}
      >
        {type.label}
      </Text>

    </TouchableOpacity>

  ))}

</View>

      <Text style={styles.modalLabel}>
        Historical Notes
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            height: 100,
          },
        ]}
        multiline
        value={historicalNotes}
        onChangeText={
          setHistoricalNotes
        }
      />

     <TouchableOpacity
  style={styles.saveBtn}
  onPress={saveHistoricalService}
>
  <Text style={styles.saveBtnText}>
    Save Historical Record
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
restoreBtn: {
  marginTop: 10,
  backgroundColor: "#2E7D32",
  padding: 10,
  borderRadius: 8,
  alignItems: "center",
},
actionRow: {
  flexDirection: "row",
},

historyBtn: {
  flex: 1,
  backgroundColor: "#7F56D9",
  padding: 16,
  alignItems: "center",
},

input: {
  backgroundColor: "#FFF",
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
},
typeContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  marginBottom: 16,
},

typeChip: {
  borderWidth: 1,
  borderColor: "#D1D5DB",
  borderRadius: 20,
  paddingHorizontal: 12,
  paddingVertical: 8,
  marginRight: 8,
  marginBottom: 8,
},

typeChipSelected: {
  backgroundColor: "#4B3F72",
  borderColor: "#4B3F72",
},

typeChipText: {
  color: "#666",
  fontWeight: "600",
},

typeChipTextSelected: {
  color: "#FFF",
},
});
