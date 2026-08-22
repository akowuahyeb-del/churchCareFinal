import React, {
  useState,
} from "react";

import {
  doc,
  updateDoc,
} from "firebase/firestore";

import { Alert } from "react-native";

import { db } from "../firebase";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";

import AppHeader from "../components/AppHeader";


const formatDate = (dateString) => {

  if (!dateString) return "-";

  const d = new Date(dateString);

  const day = String(
    d.getDate()
  ).padStart(2, "0");

  const month = String(
    d.getMonth() + 1
  ).padStart(2, "0");

  const year =
    d.getFullYear();

  return `${day}/${month}/${year}`;
};

export default function VisitorProfileScreen({
  navigation,
  route,
}) {

  const { visitor } = route.params || {};
  const [status, setStatus] =
  useState(
    visitor?.followUpStatus || "new"
  );

  const [followUpNotes, setFollowUpNotes] =
  useState(
    visitor?.followUpNotes || ""
  );
const isConverted =
  visitor?.convertedToMember === true;


const saveFollowUpStatus = async () => {

  try {

  await updateDoc(
  doc(
    db,
    "organizations",
    visitor.organizationId,
    "entities",
    visitor.entityId,
    "visitors",
    visitor.id
  ),
  {
  followUpStatus: status,

  followUpNotes,

  followUpCount:
    (visitor.followUpCount || 0) + 1,

  lastFollowUpDate:
    new Date().toISOString(),

  membershipClassStartedDate:
    status === "membership_class"
      ? (
          visitor?.membershipClassStartedDate ||
          new Date().toISOString()
        )
      : visitor?.membershipClassStartedDate,

  updatedAt:
    new Date().toISOString(),
}
);


    Alert.alert(
      "Success",
      "Follow-up status updated."
    );

  } catch (e) {

    console.log(
      "❌ UPDATE VISITOR STATUS",
      e
    );

    Alert.alert(
      "Error",
      e.message
    );
  }
};

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title="Visitor Profile"
        subtitle="Follow-up details"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 120,
  }}
>


        <View style={styles.card}>

          <Text style={styles.name}>
            {visitor?.name}
          </Text>

          <Text style={styles.item}>
            Phone: {visitor?.phone || "-"}
          </Text>

          <Text style={styles.item}>
            Address: {visitor?.address || "-"}
          </Text>

          <Text style={styles.item}>
            Area: {visitor?.suburb || "-"}
          </Text>

          <Text style={styles.item}>
            Type: {visitor?.visitorType || "-"}
          </Text>

          <Text style={styles.item}>
  Follow-up:
  {" "}
  {visitor?.followUpStatus === "membership_class"
    ? "Membership Class"
    : visitor?.followUpStatus || "-"}
</Text>

{visitor?.followUpStatus === "membership_class" && (
    

  <View style={styles.membershipClassBanner}>

    <Text style={styles.membershipClassTitle}>
      Membership Class In Progress
    </Text>

    <Text style={styles.membershipClassText}>
      This visitor is currently undergoing
      membership onboarding and may be ready
      for conversion after successful completion.
    </Text>

  </View>

)}

{visitor?.followUpStatus === "membership_class" &&
 visitor?.membershipClassStartedDate && (

  <Text style={styles.item}>
    Class Started:
    {" "}
    {formatDate(
      visitor.membershipClassStartedDate
    )}
  </Text>

)}
          {visitor?.convertedToMember && (

  <Text style={styles.item}>
    Converted:
    {" "}
    {formatDate(
      visitor?.convertedDate
    )}
  </Text>

)}

<Text style={styles.item}>
  Follow-Ups:
  {" "}
  {visitor?.followUpCount || 0}
</Text>

<Text style={styles.item}>
  Last Follow-Up:
  {" "}
  {visitor?.lastFollowUpDate
    ? formatDate(
        visitor.lastFollowUpDate
      )
    : "Never"}
</Text>

          <Text style={styles.item}>
  First Visit:
  {" "}
  {formatDate(
    visitor?.firstVisitDate
  )}
</Text>

          <Text style={styles.item}>
            Invited By:
            {" "}
            {visitor?.invitedBy || "-"}
          </Text>

          <Text style={styles.item}>
            Notes:
            {" "}
            {visitor?.notes || "-"}
          </Text>

        </View>


{!isConverted && (

<View style={styles.card}>

  <Text
    style={{
      fontWeight: "700",
      marginBottom: 12,
    }}
  >
    Follow-up Status
  </Text>

  {[
    "new",
    "contacted",
    "visited",
    "interested",
    "membership_class",
  ].map((item) => (

    <TouchableOpacity
      key={item}
      style={[
        styles.statusOption,
        status === item &&
          styles.statusSelected,
      ]}
      onPress={() =>
        setStatus(item)
      }
    >
      <Text>
        {item}
      </Text>
    </TouchableOpacity>

  ))}

</View>

)}


<View style={styles.assignmentCard}>

  <Text style={styles.assignmentTitle}>
    FOLLOW-UP ASSIGNMENT
  </Text>

  {visitor?.assignment ? (

    <>
      <View style={styles.assignmentBadge}>
        <Text style={styles.assignmentBadgeText}>
          ASSIGNED
        </Text>
      </View>

      <Text style={styles.assignmentName}>
        {visitor.assignment.name}
      </Text>

      {!isConverted && (
        <TouchableOpacity
          style={styles.reassignBtn}
          onPress={() =>
            navigation.navigate(
              "VisitorAssignment",
              { visitor }
            )
          }
        >
          <Text style={styles.reassignText}>
            Reassign Visitor
          </Text>
        </TouchableOpacity>
      )}

    </>

  ) : (

    !isConverted && (
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate(
            "VisitorAssignment",
            { visitor }
          )
        }
      >
        <Text style={styles.buttonText}>
          Assign Visitor
        </Text>
      </TouchableOpacity>
    )

  )}

</View>



{!isConverted && (

  <View style={styles.card}>

    <Text
      style={{
        fontWeight: "700",
        marginBottom: 10,
      }}
    >
      Follow-up Notes
    </Text>

    <TextInput
      style={styles.notesInput}
      multiline
      placeholder="Add follow-up notes..."
      value={followUpNotes}
      onChangeText={setFollowUpNotes}
    />

  </View>

)}


{!isConverted && (

<TouchableOpacity
  style={styles.button}
  onPress={saveFollowUpStatus}
>
  <Text style={styles.buttonText}>
    Save Follow-up Status
  </Text>
</TouchableOpacity>

)}




{!isConverted ? (

  <TouchableOpacity
    style={styles.button}
    onPress={() =>
      navigation.navigate(
        "AddVisitor",
        {
          editingId: visitor.id,
          visitorData: visitor,
          organizationId:
            visitor.organizationId,
          entityId:
            visitor.entityId,
        }
      )
    }
  >
    <Text style={styles.buttonText}>
      Edit Visitor's Details ({visitor?.name})
    </Text>
  </TouchableOpacity>

) : (

  <View
    style={[
      styles.button,
      {
        backgroundColor: "#9CA3AF",
      },
    ]}
  >
    <Text style={styles.buttonText}>
      Visitor Converted To Member
    </Text>
  </View>

)}


    {!isConverted ? (

  <TouchableOpacity
    style={[
      styles.button,
      {
        backgroundColor: "#22c55e",
      },
    ]}
    onPress={() =>
      navigation.navigate(
        "AddMember",
        {
          convertMode: true,
          visitorData: visitor,
          organizationId:
            visitor.organizationId,
          entityId:
            visitor.entityId,
        }
      )
    }
  >
    <Text style={styles.buttonText}>
      Convert To Member
    </Text>
  </TouchableOpacity>

) : (

  <View
    style={[
      styles.button,
      {
        backgroundColor: "#9CA3AF",
      },
    ]}
  >
    <Text style={styles.buttonText}>
      Already Converted To Member
    </Text>
  </View>

)}


      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
  backgroundColor: "#fff",
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
},

  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },

  item: {
    marginBottom: 10,
  },

  button: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  statusOption: {
  padding: 12,
  backgroundColor: "#eee",
  borderRadius: 10,
  marginBottom: 8,
},

statusSelected: {
  backgroundColor: "#DDE3FF",
},
notesInput: {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  padding: 12,
  minHeight: 100,
  textAlignVertical: "top",
},
assignmentCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
},

assignmentTitle: {
  fontWeight: "700",
  marginBottom: 10,
  color: "#555",
},

assignmentName: {
  fontSize: 18,
  fontWeight: "700",
  color: "#222",
},



reassignBtn: {
  backgroundColor: "#4B3F72",
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 16,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 12,
},

reassignText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
  textAlign: "center",
},

assignmentBadge: {
  alignSelf: "flex-start",
  backgroundColor: "#4B3F72",
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 5,
  marginBottom: 10,
},

assignmentBadgeText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 12,
},
membershipClassBanner: {
  backgroundColor: "#EEF0FA",
  borderLeftWidth: 4,
  borderLeftColor: "#4B3F72",
  padding: 12,
  borderRadius: 10,
  marginTop: 10,
  marginBottom: 10,
},

membershipClassTitle: {
  color: "#4B3F72",
  fontWeight: "700",
  marginBottom: 4,
},

membershipClassText: {
  color: "#555",
  lineHeight: 20,
},

});