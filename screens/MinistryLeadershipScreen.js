import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  TextInput,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import DateTimePicker
  from "@react-native-community/datetimepicker";
import LeadershipAssignmentsCard
from "../components/LeadershipAssignmentsCard";
import AppHeader from "../components/AppHeader";

export default function MinistryLeadershipScreen({
  navigation,
  entityType = "ministry",
  entityCollection = "ministries",
  title = "Ministry Leadership",
}) {
  const [ministries, setMinistries] = useState([]);
  const [
  ministryPositions,
  setMinistryPositions,
] = useState([]);

const [
  showPositionModal,
  setShowPositionModal,
] = useState(false);

const [
  newPositionName,
  setNewPositionName,
] = useState("");

  const [members, setMembers] = useState([]);
  const [selectedMinistry, setSelectedMinistry] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [
  selectedPosition,
  setSelectedPosition,
] = useState("Leader");
const [
  canManageSubLeaders,
  setCanManageSubLeaders,
] = useState(false);

const [
  canTakeAttendance,
  setCanTakeAttendance,
] = useState(false);

const [
  canManageAttendanceDelegates,
  setCanManageAttendanceDelegates,
] = useState(false);

const [
  isPrimaryLeadershipPosition,
  setIsPrimaryLeadershipPosition,
] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startDate,
  setStartDate] =
    useState(new Date());

const [endDate,
  setEndDate] =
    useState(null);
    const [openEnded,
  setOpenEnded] =
    useState(true);

const [showStartPicker,
  setShowStartPicker] =
    useState(false);

const [showEndPicker,
  setShowEndPicker] =
    useState(false);
    const [
  activeEntity,
  setActiveEntity,
] = useState(null);

const [
  isPrimaryLeadership,
  setIsPrimaryLeadership,
] = useState(false);
const [
  showManagePositionsModal,
  setShowManagePositionsModal,
] = useState(false);

const [
  editingPosition,
  setEditingPosition,
] = useState(null);
const [
  selectedMinistryCard,
  setSelectedMinistryCard,
] = useState(null);
const [
  showCreateEntityModal,
  setShowCreateEntityModal,
] = useState(false);

const [
  newEntityName,
  setNewEntityName,
] = useState("");

  // FIX: pulled into a reusable function so we can call it again after
  // a successful assignment, instead of only ever running once on mount.
  const loadData = useCallback(async () => {
    const stored = await AsyncStorage.getItem("activeEntity");
    if (!stored) return;

    const entity = JSON.parse(stored);
    setActiveEntity(entity);


  const membersSnap = await getDocs(
  collection(
    db,
    "organizations",
    entity.organizationId,
    "entities",
    entity.entityId,
    "members"
  )
);


const loadedMembers =
  membersSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

// Remove duplicate members

const uniqueMembers =
  Array.from(
    new Map(
      loadedMembers.map((member) => [
        member.id,
        member,
      ])
    ).values()
  );

setMembers(uniqueMembers);

   const ministriesSnap = await getDocs(
  collection(
    db,
    "organizations",
    entity.organizationId,
    entityCollection
  )
);

console.log(
  "ENTITY COLLECTION:",
  entityCollection
);

console.log(
  "DOCUMENT COUNT:",
  ministriesSnap.size
);


    const assignmentsSnap = await getDocs(
      collection(
        db,
        "organizations",
        entity.organizationId,
        "leadershipAssignments"
      )
    );

    const assignments = assignmentsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

const data = ministriesSnap.docs
  .map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
  .filter(
    (item) => item.active !== false
  )
  .map((ministry) => {
      const leader = assignments.find(
  (a) =>
    (
      a.entityId === ministry.id ||
      a.ministryId === ministry.id
    ) &&
    a.status === "active" &&
    (
      a.positionIsPrimaryLeadership === true ||
      a.positionTitle === "Leader"
    )
);
   const officers =
  assignments.filter(
    (a) =>
      (
        a.entityId === ministry.id ||
        a.ministryId === ministry.id
      ) &&
      a.status === "active"
  );

return {

  ...ministry,

  officers,

  leaderName:
    leader?.memberName ||
    "Not Assigned",

  startDate:
    leader?.startDate || null,

  endDate:
    leader?.endDate || null,
};
    });

    setMinistries(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


 const loadPositions = async (
  ministryId
) => {

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
  entityCollection,
  ministryId,
  "positions"
)
    );

 const loadedPositions =
  snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

const uniquePositions =
  Array.from(
    new Map(
      loadedPositions.map((p) => [
        p.name?.trim().toLowerCase(),
        p,
      ])
    ).values()
  );

setMinistryPositions(
  uniquePositions
);
};

  const openAssignModal = async (
  ministry
) => {

  setSelectedMinistry(ministry);

  setSelectedMember(null);

  await loadPositions(
    ministry.id
  );

  setSelectedPosition(
  ministryPositions?.[0]?.name || ""
);

  setShowAssignModal(true);

};


  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedMinistry(null);
    setSelectedMember(null);
  };

const saveMinistryPosition =
  async () => {

    if (
      !selectedMinistry ||
      !newPositionName.trim()
    ) {
      return;
    }

    const stored =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    const entity =
      JSON.parse(stored);

    const existing =
      ministryPositions.find(
        (p) =>
          p.name?.trim().toLowerCase() ===
          newPositionName.trim().toLowerCase() &&
          p.id !== editingPosition?.id
      );

    if (existing) {

      Alert.alert(
        "Position Exists",
        "This position already exists."
      );

      return;
    }

    if (editingPosition) {

      await updateDoc(

  doc(
    db,
    "organizations",
    entity.organizationId,
    entityCollection,
    selectedMinistry.id,
    "positions",
    editingPosition.id
  ),

  {
          name:
            newPositionName.trim(),

          isPrimaryLeadership:
            isPrimaryLeadershipPosition,

          canManageSubLeaders:
            canManageSubLeaders,

          canTakeAttendance:
            canTakeAttendance,

          canManageAttendanceDelegates:
            canManageAttendanceDelegates,
        }

      );

    } else {

      await addDoc(

  collection(
    db,
    "organizations",
    entity.organizationId,
    entityCollection,
    selectedMinistry.id,
    "positions"
  ),

  {
          name:
            newPositionName.trim(),

          active: true,

          isPrimaryLeadership:
            isPrimaryLeadershipPosition,

          canManageSubLeaders:
            canManageSubLeaders,

          canTakeAttendance:
            canTakeAttendance,

          canManageAttendanceDelegates:
            canManageAttendanceDelegates,

          createdAt:
            new Date().toISOString(),
        }

      );

    }

    setEditingPosition(null);

    setNewPositionName("");

    setIsPrimaryLeadershipPosition(false);

    setCanManageSubLeaders(false);

    setCanTakeAttendance(false);

    setCanManageAttendanceDelegates(false);

    await loadPositions(
      selectedMinistry.id
    );

    await loadData();

    setShowPositionModal(false);

  };

const deleteMinistryPosition =
  async (position) => {

    Alert.alert(
      "Delete Position",
      `Delete ${position.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {

            const stored =
              await AsyncStorage.getItem(
                "activeEntity"
              );

            const entity =
              JSON.parse(stored);

            await deleteDoc(
  doc(
    db,
    "organizations",
    entity.organizationId,
    entityCollection,
    selectedMinistry.id,
    "positions",
    position.id
  )
);

            await loadPositions(
              selectedMinistry.id
            );
          },
        },
      ]
    );

  };

  const assignLeader = async () => {
    if (
  !selectedMember ||
  !selectedMinistry ||
  !selectedPosition
) {
  Alert.alert(
    "Required",
    "Select a position and a member."
  );
  return;
}

    const stored = await AsyncStorage.getItem("activeEntity");
    const entity = JSON.parse(stored);

    setSaving(true);

    try {
      const existingSnap = await getDocs(
        collection(
          db,
          "organizations",
          entity.organizationId,
          "leadershipAssignments"
        )
      );

    const existingHolder =
  existingSnap.docs.find((d) => {

    const data = d.data();

    return (
      data.ministryId ===
        selectedMinistry.id &&

      data.positionTitle ===
        selectedPosition &&

      data.status === "active"
    );

  });

if (existingHolder) {

  Alert.alert(
    "Position Already Occupied",
    `${selectedPosition} already has an active holder. Remove or replace that assignment first.`
  );

  return;
}

     

      console.log(
  "ASSIGNMENT SAVE",
  {
    ministry:
      selectedMinistry?.name,

    position:
      selectedPosition,

    member:
      selectedMember?.name,
  }
);
      const selectedPositionObj =
  ministryPositions.find(
    (p) =>
      p.name ===
      selectedPosition
  );

  if (!selectedPositionObj) {

  Alert.alert(
    "Position Missing",
    "Selected position could not be found."
  );

  return;
}

await addDoc(
  collection(
    db,
    "organizations",
    entity.organizationId,
    "leadershipAssignments"
  ),
  {

    // Existing fields (keep for now)

    ministryId:
      selectedMinistry.id,

    ministryName:
      selectedMinistry.name,

    // New generic fields

    entityId:
      selectedMinistry.id,

    entityName:
      selectedMinistry.name,

    entityType:
      entityType,

    memberId:
      selectedMember.id,

    memberName:
      selectedMember.name,

    positionTitle:
      selectedPosition,

    positionId:
      selectedPositionObj?.id || null,

    positionIsPrimaryLeadership:
      selectedPositionObj?.isPrimaryLeadership || false,

    canManageSubLeaders:
      selectedPositionObj?.canManageSubLeaders || false,

    canTakeAttendance:
      selectedPositionObj?.canTakeAttendance || false,

    canManageAttendanceDelegates:
      selectedPositionObj?.canManageAttendanceDelegates || false,

    category:
      entityType,

    status:
      "active",

    startDate:
      startDate.toISOString(),

    endDate:
      openEnded
        ? null
        : endDate
          ? endDate.toISOString()
          : null,

    createdAt:
      new Date().toISOString(),

  }
);



      Alert.alert(
  "Success",
  `${selectedPosition} assigned to ${selectedMember.name}`
);
      closeAssignModal();

      // FIX: refresh so the ministry card reflects the new leader
      // immediately instead of showing stale data until remount.
      await loadData();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTerm = (
  startDate,
  endDate
) => {

  if (!startDate) {
    return "Not Set";
  }

  const start =
    new Date(startDate)
      .toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

  if (!endDate) {
    return `${start} - Present`;
  }

  const end =
    new Date(endDate)
      .toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

  return `${start} - ${end}`;
};


const saveEntity = async () => {

  if (!newEntityName.trim()) {

    Alert.alert(
      "Required",
      "Please enter a name."
    );

    return;

  }

  try {

    const stored =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    if (!stored) return;

    const entity =
      JSON.parse(stored);

      const existing = ministries.find(
  (item) =>
    item.name?.trim().toLowerCase() ===
    newEntityName.trim().toLowerCase()
);

if (existing) {

  Alert.alert(
    "Already Exists",
    `${
      entityType === "office"
        ? "Office"
        : entityType === "committee"
        ? "Committee"
        : "Ministry"
    } already exists.`
  );

  return;
}

    await addDoc(

      collection(
        db,
        "organizations",
        entity.organizationId,
        entityCollection
      ),

      {
        name:
          newEntityName.trim(),

        active: true,

        createdAt:
          new Date()
            .toISOString(),
      }

    );

    setNewEntityName("");

    setShowCreateEntityModal(false);

    await loadData();

    Alert.alert(
      "Success",
      `${
        entityType === "office"
          ? "Office"
          : entityType === "committee"
          ? "Committee"
          : "Ministry"
      } created successfully.`
    );

  } catch (e) {

    Alert.alert(
      "Error",
      e.message
    );

  }

};

const deactivateEntity = async (
  entityItem
) => {

  Alert.alert(
  `Remove ${
    entityType === "office"
      ? "Office"
      : entityType === "committee"
      ? "Committee"
      : "Ministry"
  }`,
    `Remove ${entityItem.name}?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {

          const stored =
            await AsyncStorage.getItem(
              "activeEntity"
            );

          const activeEntity =
            JSON.parse(stored);

          await updateDoc(
            doc(
              db,
              "organizations",
              activeEntity.organizationId,
              entityCollection,
              entityItem.id
            ),
            {
              active: false,
              deactivatedAt:
                new Date().toISOString(),
            }
          );

          await loadData();
        },
      },
    ]
  );

};

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
  title={title}
  subtitle={
    entityType === "office"
      ? "Manage office holders"
      : entityType === "committee"
      ? "Manage committee officers"
      : entityType === "governance"
      ? "Manage governance leaders"
      : "Manage ministry leaders"
  }
  onBack={() => navigation.goBack()}
/>

     <ScrollView
  contentContainerStyle={{
    padding: 16,
  }}
>
<TouchableOpacity
  style={{
    backgroundColor: "#4B3F72",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  }}
  onPress={() =>
    setShowCreateEntityModal(true)
  }
>
  <Text
    style={{
      color: "#FFF",
      fontWeight: "700",
    }}
  >
    + Add {
      entityType === "office"
        ? "Office"
        : entityType === "committee"
        ? "Committee"
        : "Ministry"
    }
  </Text>
</TouchableOpacity>
  <View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    }}
  >

    {ministries.map((item) => {

     const leader =
  item.officers?.find(
    (o) =>
      o.positionIsPrimaryLeadership === true
  ) ||
  item.officers?.find(
    (o) =>
      o.positionTitle === "Leader"
  ) ||
  item.officers?.[0];

      return (

        <TouchableOpacity
          key={item.id}
          style={{
  width: "48%",

  backgroundColor: "#FFFFFF",

  borderRadius: 18,

  padding: 14,

  marginBottom: 14,

  shadowColor: "#000",

  shadowOffset: {
    width: 0,
    height: 4,
  },

  shadowOpacity: 0.08,

  shadowRadius: 10,

  elevation: 4,

  borderWidth: 1,

  borderColor: "#F5F5F5",
}}
          onPress={() =>
            setSelectedMinistryCard(item)
          }
        >
<Text
  style={{
    fontSize: 11,
    color: "#888",
    textTransform: "uppercase",
    fontWeight: "700",
  }}
>
  {
    entityType === "office"
      ? "Office"
      : entityType === "committee"
      ? "Committee"
      : entityType === "governance"
      ? "Governance Body"
      : "Ministry"
  }
</Text>

       <Text
  style={{
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
    marginTop: 6,
  }}
  numberOfLines={2}
>
  {item.name}
</Text>


<Text
  style={{
    marginTop: 4,
    color: "#222",
    fontWeight: "700",
    fontSize: 15,
  }}
  numberOfLines={2}
>
  {leader?.memberName || "Not Assigned"}
</Text>


<Text
  style={{
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  }}
>
  {leader?.positionTitle || "Leader"}
</Text>


          <View
  style={{
    marginTop: 14,

    backgroundColor: "#F4F1FF",

    alignSelf: "flex-start",

    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: 20,
  }}
>
            <Text
              style={{
                color: "#4B3F72",
                fontWeight: "700",
                fontSize: 11,
              }}
            >
              {item.officers?.length || 0} Officers
            </Text>
          </View>
<Text
  onPress={() =>
    deactivateEntity(item)
  }
  style={{
    marginTop: 8,
    color: "#C0392B",
    fontWeight: "700",
    fontSize: 12,
  }}
>
  Remove
</Text>
        </TouchableOpacity>

      );

    })}

  </View>

</ScrollView>
<Modal
  visible={!!selectedMinistryCard}
  animationType="slide"
>
  <View style={{ flex: 1 }}>

    <AppHeader
  title={
    selectedMinistryCard?.name || ""
  }
  subtitle={
    entityType === "office"
      ? "Office Leadership"
      : entityType === "committee"
      ? "Committee Leadership"
      : entityType === "governance"
      ? "Governance Leadership"
      : "Ministry Leadership"
  }
  onBack={() =>
    setSelectedMinistryCard(null)
  }
/>

    {selectedMinistryCard && (
      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >
        <LeadershipAssignmentsCard
          ministry={selectedMinistryCard}
          officers={
            selectedMinistryCard.officers || []
          }
          members={members}
          organizationId={
            activeEntity?.organizationId
          }
          onRefresh={loadData}
          onManage={() =>
            openAssignModal(
              selectedMinistryCard
            )
          }
          onAddPosition={() => {
            setSelectedMinistry(
              selectedMinistryCard
            );

            loadPositions(
              selectedMinistryCard.id
            );

            setShowManagePositionsModal(true);
          }}
        />
      </ScrollView>
    )}

  </View>
</Modal>

      <Modal visible={showAssignModal} animationType="slide">
        <View style={{ flex: 1 }}>
          <AppHeader
  title={
    entityType === "office"
      ? "Assign Office Holder"
      : entityType === "committee"
      ? "Assign Committee Officer"
      : entityType === "governance"
      ? "Assign Governance Leader"
      : "Assign Ministry Leader"
  }
            subtitle={selectedMinistry?.name || ""}
            onBack={closeAssignModal}
          />

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
  {
    entityType === "office"
      ? "Office"
      : entityType === "committee"
      ? "Committee"
      : entityType === "governance"
      ? "Governance Body"
      : "Ministry"
  }
</Text>
              <Text style={styles.summaryValue}>
                {selectedMinistry?.name}
              </Text>
              <Text style={styles.summaryPosition}>
  Position: {selectedPosition || "None Selected"}
</Text>
            </View>

<Text style={styles.sectionTitle}>
  Position
</Text>

{ministryPositions.length === 0 ? (

  <View style={styles.option}>
    <Text>
      No positions configured.
      Use "Add Position" first.
    </Text>
  </View>

) : (

  ministryPositions.map((position) => (

    <TouchableOpacity
      key={position.id}
      style={[
        styles.option,
        selectedPosition ===
          position.name &&
          styles.selected,
      ]}
      onPress={() => {

  console.log(
    "POSITION SELECTED:",
    position.name
  );

  setSelectedPosition(
    position.name
  );

}}
    >
      <Text>
        {position.name}
      </Text>
    </TouchableOpacity>

  ))

)}



            <Text style={styles.sectionTitle}>Select Member</Text>

            {members.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.option,
                  selectedMember?.id === member.id && styles.selected,
                ]}
                onPress={() => setSelectedMember(member)}
              >
                <Text style={styles.memberName}>{member.name}</Text>
              </TouchableOpacity>
            ))}
<View style={styles.dateCard}>

  <Text style={styles.sectionTitle}>
    Leadership Term
  </Text>

  <Text style={styles.dateLabel}>
    Start Date
  </Text>

  <TouchableOpacity
    style={styles.option}
    onPress={() =>
      setShowStartPicker(true)
    }
  >
    <Text>
      {startDate
        .toISOString()
        .split("T")[0]}
    </Text>
  </TouchableOpacity>

  {showStartPicker && (
    <DateTimePicker
      value={startDate}
      mode="date"
      onChange={(
        event,
        selectedDate
      ) => {
        setShowStartPicker(false);

        if (selectedDate) {
          setStartDate(selectedDate);
        }
      }}
    />
  )}

  <TouchableOpacity
    style={styles.checkboxRow}
    onPress={() =>
      setOpenEnded(!openEnded)
    }
  >
    <Text style={styles.checkboxIcon}>
      {openEnded ? "☑" : "☐"}
    </Text>

    <Text style={styles.checkboxLabel}>
      Open-ended appointment
    </Text>
  </TouchableOpacity>

  {!openEnded && (
    <>
      <Text style={styles.dateLabel}>
        End Date
      </Text>

      <TouchableOpacity
        style={styles.option}
        onPress={() =>
          setShowEndPicker(true)
        }
      >
        <Text>
          {endDate
            ? endDate
                .toISOString()
                .split("T")[0]
            : "Select End Date"}
        </Text>
      </TouchableOpacity>

      {showEndPicker && (
        <DateTimePicker
          value={
            endDate || startDate
          }
          mode="date"
          minimumDate={startDate}
          onChange={(
            event,
            selectedDate
          ) => {
            setShowEndPicker(false);

            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}
    </>
  )}

</View>


            <TouchableOpacity
              style={styles.saveBtn}
              onPress={assignLeader}
              disabled={saving}
            >


              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {saving ? "Saving..." : "Assign Leader"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

<Modal
  visible={showPositionModal}
  animationType="slide"
>
  <View style={{ flex: 1 }}>

    <AppHeader
  title={
    entityType === "office"
      ? "Add Office Position"
      : entityType === "committee"
      ? "Add Committee Position"
      : entityType === "governance"
      ? "Add Governance Position"
      : "Add Ministry Position"
  }
      subtitle={
        selectedMinistry?.name || ""
      }
      onBack={() =>
        setShowPositionModal(false)
      }
    />

    <View style={{ padding: 16 }}>

      <Text style={styles.sectionTitle}>
        Position Name
      </Text>

      <TextInput
        style={styles.option}
        placeholder="e.g. Secretary"
        value={newPositionName}
        onChangeText={
          setNewPositionName
        }
      />
<TouchableOpacity
  style={styles.checkboxRow}
  onPress={() =>
    setIsPrimaryLeadershipPosition(
      !isPrimaryLeadershipPosition
    )
  }
>
  <Text style={styles.checkboxIcon}>
    {isPrimaryLeadershipPosition ? "☑" : "☐"}
  </Text>

  <Text style={styles.checkboxLabel}>
    Primary Leadership Position
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.checkboxRow}
  onPress={() =>
    setCanManageSubLeaders(
      !canManageSubLeaders
    )
  }
>
  <Text style={styles.checkboxIcon}>
    {canManageSubLeaders ? "☑" : "☐"}
  </Text>

  <Text style={styles.checkboxLabel}>
    Can Manage Sub-Leaders
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.checkboxRow}
  onPress={() =>
    setCanTakeAttendance(
      !canTakeAttendance
    )
  }
>
  <Text style={styles.checkboxIcon}>
    {canTakeAttendance ? "☑" : "☐"}
  </Text>

  <Text style={styles.checkboxLabel}>
    Can Take Attendance
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.checkboxRow}
  onPress={() =>
    setCanManageAttendanceDelegates(
      !canManageAttendanceDelegates
    )
  }
>
  <Text style={styles.checkboxIcon}>
    {canManageAttendanceDelegates ? "☑" : "☐"}
  </Text>

  <Text style={styles.checkboxLabel}>
    Can Assign Attendance Officers
  </Text>
</TouchableOpacity>



      <TouchableOpacity
        style={styles.saveBtn}
        onPress={
          saveMinistryPosition
        }
      >
        <Text
  style={{
    color: "#FFF",
    fontWeight: "700",
  }}
>
  Save {
    entityType === "office"
      ? "Office Position"
      : entityType === "committee"
      ? "Committee Position"
      : entityType === "governance"
      ? "Governance Position"
      : "Position"
  }
</Text>
      </TouchableOpacity>

    </View>

  </View>
</Modal>

<Modal
  visible={showManagePositionsModal}
  animationType="slide"
>
  <View style={{ flex: 1 }}>

    <AppHeader
  title={
    entityType === "office"
      ? "Manage Office Positions"
      : entityType === "committee"
      ? "Manage Committee Positions"
      : entityType === "governance"
      ? "Manage Governance Positions"
      : "Manage Ministry Positions"
  }
      subtitle={
        selectedMinistry?.name || ""
      }
      onBack={() =>
        setShowManagePositionsModal(false)
      }
    />

    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >

      {ministryPositions.map(
        (position) => (

          <View
  key={position.id}
  style={{
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>

  <View style={{ flex: 1 }}>

    <Text
      style={{
        fontSize: 16,
        fontWeight: "600",
      }}
    >
      {position.name}
    </Text>

    <Text
      style={{
        marginTop: 4,
        fontSize: 12,
        color: "#666",
      }}
    >
      {[
        position.isPrimaryLeadership
          ? "Leader"
          : null,

        position.canManageSubLeaders
          ? "Manage Officers"
          : null,

        position.canTakeAttendance
          ? "Attendance"
          : null,

        position.canManageAttendanceDelegates
          ? "Attendance Delegates"
          : null,
      ]
        .filter(Boolean)
        .join(" • ")}
    </Text>

  </View>
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
  }}
>

  <TouchableOpacity
    onPress={() => {
      setEditingPosition(position);

      setNewPositionName(
        position.name || ""
      );

      setIsPrimaryLeadershipPosition(
        position.isPrimaryLeadership || false
      );

      setCanManageSubLeaders(
        position.canManageSubLeaders || false
      );

      setCanTakeAttendance(
        position.canTakeAttendance || false
      );

      setCanManageAttendanceDelegates(
        position.canManageAttendanceDelegates || false
      );

      setShowManagePositionsModal(false);
      setShowPositionModal(true);
    }}
  >
    <Text
      style={{
        color: "#4B3F72",
        fontWeight: "700",
        marginRight: 16,
      }}
    >
      Edit
    </Text>
  </TouchableOpacity>

 <View
  style={{
    flexDirection: "row",
    alignItems: "center",
  }}
>


  <TouchableOpacity
    onPress={() =>
      deleteMinistryPosition(position)
    }
  >
    <Text
      style={{
        color: "#C0392B",
        fontWeight: "700",
      }}
    >
      Delete
    </Text>
  </TouchableOpacity>

</View>

</View>

</View>

        )
      )}

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => {
          setShowManagePositionsModal(false);
          setShowPositionModal(true);
        }}
      >
        <Text
          style={{
            color: "#FFF",
            fontWeight: "700",
          }}
        >
          Add Position
        </Text>
      </TouchableOpacity>

    </ScrollView>

  </View>
</Modal>


<Modal
  visible={showCreateEntityModal}
  animationType="slide"
>
  <View style={{ flex: 1 }}>

    <AppHeader
      title={
        entityType === "office"
          ? "Add Office"
          : entityType === "committee"
          ? "Add Committee"
          : "Add Ministry"
      }
      onBack={() =>
        setShowCreateEntityModal(false)
      }
    />

    <View style={{ padding: 16 }}>
<TextInput
  style={styles.option}
  placeholder={
    entityType === "office"
      ? "Church Secretary"
      : entityType === "committee"
      ? "Finance Committee"
      : entityType === "governance"
      ? "Session"
      : "Men's Fellowship"
  }
  value={newEntityName}
  onChangeText={setNewEntityName}
/>


      <TouchableOpacity
        style={styles.saveBtn}
        onPress={saveEntity}
      >
       <Text
  style={{
    color: "#FFF",
    fontWeight: "700",
  }}
>
  Save {
    entityType === "office"
      ? "Office"
      : entityType === "committee"
      ? "Committee"
      : entityType === "governance"
      ? "Governance Body"
      : "Ministry"
  }
</Text>
      </TouchableOpacity>

    </View>

  </View>
</Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: "700" },
  leader: { marginTop: 8, color: "#666" },
  assignBtn: {
    backgroundColor: "#4B3F72",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  option: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  selected: { backgroundColor: "#DDE3FF" },
  memberName: { fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 12 },
  summaryCard: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 12, color: "#666" },
  summaryValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  summaryPosition: { marginTop: 8, color: "#4B3F72", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
  },
  term: {
  marginTop: 4,
  color: "#666",
  fontSize: 13,
},
dateCard: {
  backgroundColor: "#F5F5F5",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
  marginBottom: 16,
},

dateLabel: {
  fontWeight: "600",
  marginTop: 8,
  marginBottom: 6,
},
label: {
  marginTop: 10,
  fontSize: 12,
  color: "#777",
  textTransform: "uppercase",
  fontWeight: "600",
},

leaderName: {
  fontSize: 18,
  fontWeight: "700",
  color: "#222",
  marginTop: 2,
},

termRow: {
  marginTop: 10,
},

termText: {
  marginTop: 2,
  color: "#4B3F72",
  fontWeight: "600",
},
checkboxRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 10,
  marginBottom: 10,
},

checkboxIcon: {
  fontSize: 20,
},

checkboxLabel: {
  marginLeft: 8,
  fontSize: 15,
},

dateCard: {
  backgroundColor: "#F5F5F5",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
  marginBottom: 16,
},

dateLabel: {
  fontWeight: "600",
  marginTop: 8,
  marginBottom: 6,
},

});