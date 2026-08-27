import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";


import {
  doc,
  updateDoc,
  addDoc,
  collection,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";
import AppHeader from "../components/AppHeader";

export default function LeadershipAssignmentsCard({
  ministry,
  officers = [],
  members = [],
  organizationId,
  onRefresh,
  onManage,
  onAddPosition,
})

 {

 const removeHolder =
  async (officer) => {

    Alert.alert(
      "Remove Holder",
      `Remove ${officer.memberName} as ${officer.positionTitle}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Remove",

          onPress: async () => {

            try {

              await updateDoc(

                doc(
                  db,
                  "organizations",
                  organizationId,
                  "leadershipAssignments",
                  officer.id
                ),

                {
                  status: "completed",
                  endDate:
                    new Date()
                      .toISOString(),
                }

              );

              if (onRefresh) {
                await onRefresh();
              }

            } catch (e) {

              Alert.alert(
                "Error",
                e.message
              );

            }

          },

        },

      ]
    );

  };   

  const replaceHolder = async (
  officer,
  newMember
) => {

  try {

    // Complete current assignment

    await updateDoc(

      doc(
        db,
        "organizations",
        organizationId,
        "leadershipAssignments",
        officer.id
      ),

      {
        status: "completed",
        endDate:
          new Date()
            .toISOString(),
      }

    );

    // Create replacement assignment

    await addDoc(

      collection(
        db,
        "organizations",
        organizationId,
        "leadershipAssignments"
      ),

      {
        ministryId:
          ministry.id,

        ministryName:
          ministry.name,

        memberId:
          newMember.id,

        memberName:
          newMember.name,

        positionTitle:
          officer.positionTitle,

        category: "ministry",

        status: "active",

        startDate:
          new Date()
            .toISOString(),

        endDate: null,

        createdAt:
          new Date()
            .toISOString(),
      }

    );

    if (onRefresh) {
      await onRefresh();
    }

  } catch (e) {

    Alert.alert(
      "Error",
      e.message
    );

  }

};

const deletePosition = async (
  officer
) => {

  try {

    // Check if another active holder
    // still uses this position

    const snap =
      await getDocs(

        collection(
          db,
          "organizations",
          organizationId,
          "leadershipAssignments"
        )

      );

    const activeHolders =
      snap.docs.filter((d) => {

        const data = d.data();

        return (

          data.positionTitle ===
            officer.positionTitle &&

          data.ministryId ===
            ministry.id &&

          data.status ===
            "active"

        );

      });

    if (
      activeHolders.length > 0
    ) {

      Alert.alert(
        "Cannot Delete",
        `${officer.positionTitle} still has active holders. Remove or replace the holder first.`
      );

      return;

    }

    Alert.alert(
      "Delete Position",
      `Delete position "${officer.positionTitle}"?`,
      [

        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Delete",

          style: "destructive",

          onPress: async () => {

            try {

              await deleteDoc(

                doc(
                  db,
                  "organizations",
                  organizationId,
                  "ministries",
                  ministry.id,
                  "positions",
                  officer.positionId
                )

              );

              if (
                onRefresh
              ) {

                await onRefresh();

              }

            } catch (e) {

              Alert.alert(
                "Error",
                e.message
              );

            }

          },

        },

      ]
    );

  } catch (e) {

    Alert.alert(
      "Error",
      e.message
    );

  }

};


  const primaryLeader =
  officers.find(
    (o) =>
      o.positionIsPrimaryLeadership === true
  ) ||
  officers.find(
    (o) =>
      o.positionTitle === "Leader"
  );

const otherOfficers =
  officers.filter(
    (o) =>
      primaryLeader
        ? o.id !== primaryLeader.id
        : true
  );

const [
  selectedOfficer,
  setSelectedOfficer,
] = React.useState(null);

const [
  replacementMember,
  setReplacementMember,
] = React.useState(null);
const [
  showReplaceModal,
  setShowReplaceModal,
] = React.useState(false);


 return (
  <View>

    <Text
      style={{
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 12,
        color: "#222",
      }}
    >
      {ministry.name}
    </Text>


{officers.length === 0 && (
  <View
    style={{
      marginTop: 12,
      padding: 12,
      backgroundColor: "#F8F8F8",
      borderRadius: 10,
    }}
  >
    <Text style={{ color: "#777" }}>
      No leadership assignments yet.
    </Text>
  </View>
)}

      

    {primaryLeader && (

  <View
    style={{
      backgroundColor: "#FFF7E0",
      borderRadius: 12,
      padding: 14,
      marginTop: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#E6C35C",
      flexDirection: "row",
      alignItems: "center",
    }}
  >

    <View
      style={{
        backgroundColor: "#E6C35C",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 12,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: "#4A3A00",
          textTransform: "uppercase",
        }}
      >
        {primaryLeader.positionTitle}
      </Text>
    </View>

    <Text
      style={{
        flex: 1,
        fontSize: 22,
        fontWeight: "800",
        color: "#8A6A00",
      }}
    >
      {primaryLeader.memberName}
    </Text>

  </View>

)}
{primaryLeader && (

  <View
    style={{
      flexDirection: "row",
      marginBottom: 16,
    }}
  >

    <TouchableOpacity
      onPress={() => {
        setSelectedOfficer(primaryLeader);
        setReplacementMember(null);
        setShowReplaceModal(true);
      }}
      style={{
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
      }}
    >
      <Text
        style={{
          color: "#4B3F72",
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        Replace
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() =>
        removeHolder(primaryLeader)
      }
      style={{
        backgroundColor: "#FFF4E8",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
      }}
    >
      <Text
        style={{
          color: "#D35400",
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        Remove Holder
      </Text>
    </TouchableOpacity>

  </View>

)}
      {otherOfficers.map((officer) => (

        <View
          key={officer.id}
          style={{
            marginTop: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#EEE",
          }}
        >

          <Text
            style={{
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {officer.positionTitle}
          </Text>

         <Text
  style={{
    marginTop: 2,
    color: "#444",
  }}
>
  {officer.memberName}
</Text>

{(
  officer.canManageSubLeaders ||
  officer.canTakeAttendance ||
  officer.canManageAttendanceDelegates
) && (
  <Text
    style={{
      marginTop: 4,
      color: "#666",
      fontSize: 12,
    }}
  >
    {[
      officer.canManageSubLeaders
        ? "Manage Officers"
        : null,

      officer.canTakeAttendance
        ? "Attendance"
        : null,

      officer.canManageAttendanceDelegates
        ? "Attendance Delegates"
        : null,
    ]
      .filter(Boolean)
      .join(" • ")}
  </Text>
)}


<View
  style={{
    flexDirection: "row",
    marginTop: 10,
  }}
>


  <TouchableOpacity
    onPress={() => {
      setSelectedOfficer(officer);
      setReplacementMember(null);
      setShowReplaceModal(true);
    }}
    style={{
      backgroundColor: "#EEF2FF",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
    }}
  >
    <Text
      style={{
        color: "#4B3F72",
        fontWeight: "700",
        fontSize: 12,
      }}
    >
      Replace
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      removeHolder(officer)
    }
    style={{
      backgroundColor: "#FFF4E8",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
    }}
  >
    <Text
      style={{
        color: "#D35400",
        fontWeight: "700",
        fontSize: 12,
      }}
    >
      Remove Holder
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      deletePosition(officer)
    }
    style={{
      backgroundColor: "#FDECEC",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
    }}
  >
    <Text
      style={{
        color: "#C0392B",
        fontWeight: "700",
        fontSize: 12,
      }}
    >
      Delete Position
    </Text>
  </TouchableOpacity>

</View>

        </View>

      ))}

     <View
  style={{
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  }}
>
  <TouchableOpacity
    onPress={onManage}
    style={{
      flex: 1,
      backgroundColor: "#4B3F72",
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    }}
  >
    <Text
      style={{
        color: "#FFF",
        fontWeight: "700",
        fontSize: 13,
      }}
    >
      Assign Leadership
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={onAddPosition}
    style={{
      flex: 1,
      backgroundColor: "#1BA97F",
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    }}
  >
    <Text
  style={{
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  }}
>
  Manage Positions
</Text>
  </TouchableOpacity>
</View>


<Modal
  visible={showReplaceModal}
  animationType="slide"
  transparent={false}
  onRequestClose={() => {
    setShowReplaceModal(false);
    setReplacementMember(null);
    setSelectedOfficer(null);
  }}
>
<View style={{ flex: 1 }}>

<AppHeader
  title="Replace Officer"
  subtitle={
    selectedOfficer?.positionTitle || ""
  }
  onBack={() => {
    setShowReplaceModal(false);
    setReplacementMember(null);
    setSelectedOfficer(null);
  }}
/>

<ScrollView
  contentContainerStyle={{
    padding: 16,
  }}
>

<View
  style={{
    marginVertical: 16,
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
  }}
>
  <Text
    style={{
      fontSize: 12,
      color: "#666",
      marginBottom: 4,
    }}
  >
    CURRENT HOLDER
  </Text>

  <Text
    style={{
      fontSize: 18,
      fontWeight: "700",
      color: "#4B3F72",
    }}
  >
    {selectedOfficer?.memberName}
  </Text>
</View>

  {members
    .filter(
      (member) =>
        member.id !== selectedOfficer?.memberId
    )
    .map((member) => (

      <TouchableOpacity
        key={member.id}
        style={{
          backgroundColor:
            replacementMember?.id === member.id
              ? "#EEF2FF"
              : "#F8F8F8",

          borderWidth: 1,

          borderColor:
            replacementMember?.id === member.id
              ? "#4B3F72"
              : "#E5E5E5",

          padding: 14,
          borderRadius: 12,
          marginBottom: 10,
        }}
        onPress={() =>
          setReplacementMember(member)
        }
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontWeight:
                replacementMember?.id === member.id
                  ? "700"
                  : "500",

              color:
                replacementMember?.id === member.id
                  ? "#4B3F72"
                  : "#222",

              fontSize: 15,
            }}
          >
            {member.name}
          </Text>

          {replacementMember?.id === member.id && (
            <View
              style={{
                backgroundColor: "#4B3F72",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                Selected
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

    ))}

  <Text
    style={{
      marginTop: 12,
      marginBottom: 8,
      color: "#666",
      fontWeight: "600",
    }}
  >
    Replacement Officer:
    {" "}
    {replacementMember?.name || "None Selected"}
  </Text>

  <TouchableOpacity
    style={{
      backgroundColor: "#4B3F72",
      padding: 16,
      borderRadius: 12,
      marginTop: 20,
    }}
    onPress={async () => {

      if (
        !selectedOfficer ||
        !replacementMember
      ) {
        return;
      }

      if (
        selectedOfficer.memberId ===
        replacementMember.id
      ) {
        Alert.alert(
          "No Change",
          "Please select a different member."
        );
        return;
      }

      await replaceHolder(
        selectedOfficer,
        replacementMember
      );

      setSelectedOfficer(null);
      setReplacementMember(null);
      setShowReplaceModal(false);
    }}
  >
    <Text
      style={{
        color: "#FFF",
        textAlign: "center",
        fontWeight: "700",
      }}
    >
      {replacementMember
        ? "Confirm Replacement"
        : "Select Replacement"}
    </Text>
  </TouchableOpacity>

</ScrollView>

</View>

</Modal>

    </View>
  );
}
    