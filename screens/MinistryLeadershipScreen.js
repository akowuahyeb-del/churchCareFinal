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

export default function MinistryLeadershipScreen({ navigation }) {
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
      collection(db, "organizations", entity.organizationId, "ministries")
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

    const data = ministriesSnap.docs.map((docSnap) => {
      const ministry = { id: docSnap.id, ...docSnap.data() };
      const leader = assignments.find(
        (a) =>
          a.ministryId === ministry.id &&
          a.positionTitle === "Leader" &&
          a.status === "active"
      );
    const officers =
  assignments.filter(
    (a) =>
      a.ministryId === ministry.id &&
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
        "ministries",
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
      newPositionName.trim().toLowerCase()
  );

if (existing) {

  Alert.alert(
    "Position Exists",
    "This position already exists."
  );

  return;
}

    await addDoc(

      collection(
        db,
        "organizations",
        entity.organizationId,
        "ministries",
        selectedMinistry.id,
        "positions"
      ),

      {
        name:
          newPositionName.trim(),

        active: true,

        createdAt:
          new Date()
            .toISOString(),
      }

    );

    setNewPositionName("");

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
                "ministries",
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

    ministryId:
      selectedMinistry.id,

    ministryName:
      selectedMinistry.name,

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

    category:
      "ministry",

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

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Ministry Leadership"
        subtitle="Manage ministry leaders"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {ministries.map((item) => (
          <View key={item.id} style={styles.card}>
       
<LeadershipAssignmentsCard
  ministry={item}
  officers={item.officers || []}
  members={members}
  organizationId={
    activeEntity?.organizationId
  }
  onRefresh={loadData}
  onManage={() =>
    openAssignModal(item)
  }
 onAddPosition={() => {
  setSelectedMinistry(item);
  loadPositions(item.id);
  setShowManagePositionsModal(true);
}}
/>


          </View>
        ))}
      </ScrollView>

      <Modal visible={showAssignModal} animationType="slide">
        <View style={{ flex: 1 }}>
          <AppHeader
            title="Assign Ministry Leader"
            subtitle={selectedMinistry?.name || ""}
            onBack={closeAssignModal}
          />

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Ministry</Text>
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
      title="Add Position"
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
          Save Position
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
      title="Manage Positions"
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
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {position.name}
            </Text>

            <TouchableOpacity
              onPress={() =>
                deleteMinistryPosition(
                  position
                )
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