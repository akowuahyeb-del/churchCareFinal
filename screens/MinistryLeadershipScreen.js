import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import DateTimePicker
  from "@react-native-community/datetimepicker";

import AppHeader from "../components/AppHeader";

export default function MinistryLeadershipScreen({ navigation }) {
  const [ministries, setMinistries] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMinistry, setSelectedMinistry] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
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

  // FIX: pulled into a reusable function so we can call it again after
  // a successful assignment, instead of only ever running once on mount.
  const loadData = useCallback(async () => {
    const stored = await AsyncStorage.getItem("activeEntity");
    if (!stored) return;

    const entity = JSON.parse(stored);

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
    setMembers(membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

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
     return {
  ...ministry,

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

  // FIX: clears stale selection state so reopening the modal for a
  // different ministry doesn't carry over a previously picked member.
  const openAssignModal = (ministry) => {
    setSelectedMinistry(ministry);
    setSelectedMember(null);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedMinistry(null);
    setSelectedMember(null);
  };

  const assignLeader = async () => {
    if (!selectedMember || !selectedMinistry) {
      Alert.alert("Required", "Select a member.");
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

      const existingLeaders = existingSnap.docs.filter((d) => {
        const data = d.data();
        return (
          data.ministryId === selectedMinistry.id &&
          data.positionTitle === "Leader" &&
          data.status === "active"
        );
      });

      for (const leader of existingLeaders) {
        await updateDoc(
          doc(
            db,
            "organizations",
            entity.organizationId,
            "leadershipAssignments",
            leader.id
          ),
          {
            status: "completed",
            endDate: new Date().toISOString(),
          }
        );
      }

      await addDoc(
        collection(
          db,
          "organizations",
          entity.organizationId,
          "leadershipAssignments"
        ),
        {
          ministryId: selectedMinistry.id,
          ministryName: selectedMinistry.name,
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          positionTitle: "Leader",
          category: "ministry",
          status: "active",
         startDate:
  startDate.toISOString(),

endDate:
  openEnded
    ? null
    : endDate
      ? endDate.toISOString()
      : null,
          createdAt: new Date().toISOString(),
        }
      );

      Alert.alert("Success", "Leader assigned.");
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
            <Text style={styles.title}>
  {item.name}
</Text>

<Text style={styles.label}>
  Current Leader
</Text>

<Text style={styles.leaderName}>
  {item.leaderName}
</Text>

{item.startDate && (

  <View style={styles.termRow}>

    <Text style={styles.label}>
      CURRENT TERM
    </Text>

    <Text style={styles.termText}>
      {formatTerm(
        item.startDate,
        item.endDate
      )}
    </Text>

  </View>

)}





            <TouchableOpacity
              style={styles.assignBtn}
              onPress={() => openAssignModal(item)}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {item.leaderName === "Not Assigned"
                  ? "Assign Leader"
                  : "Change Leader"}
              </Text>
            </TouchableOpacity>
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
              <Text style={styles.summaryPosition}>Position: Leader</Text>
            </View>

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