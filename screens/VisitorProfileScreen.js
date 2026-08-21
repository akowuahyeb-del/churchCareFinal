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
    updatedAt: new Date().toISOString(),
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
            Follow-up: {visitor?.followUpStatus || "-"}
          </Text>

          <Text style={styles.item}>
            First Visit:
            {" "}
            {visitor?.firstVisitDate || "-"}
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

<TouchableOpacity
  style={styles.button}
  onPress={saveFollowUpStatus}
>
  <Text style={styles.buttonText}>
    Save Follow-up Status
  </Text>
</TouchableOpacity>

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


      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
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
});