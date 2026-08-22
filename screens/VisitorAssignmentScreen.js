import React, {
  useState,
  useEffect,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import {
  doc,
  updateDoc,
  collection,
  getDocs,
  getDoc,
} from "firebase/firestore";

import AppHeader from "../components/AppHeader";
import { db } from "../firebase";

export default function VisitorAssignmentScreen({
  navigation,
  route,
}) {

  const { visitor } =
    route.params || {};

  const [assignmentType,
    setAssignmentType] =
      useState("member");
      const [selectedTarget,
  setSelectedTarget] =
    useState(null);

    const [members,
  setMembers] =
    useState([]);

    const [ministries,
  setMinistries] =
    useState([]);

    const [roles,
  setRoles] =
    useState([]);

    useEffect(() => {

  const loadMembers = async () => {

    try {

      const snap = await getDocs(

        collection(
          db,
          "organizations",
          visitor.organizationId,
          "entities",
          visitor.entityId,
          "members"
        )

      );

      const data =
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

      setMembers(data);

      const settingsSnap =
  await getDoc(
    doc(
      db,
      "organizations",
      visitor.organizationId,
      "settings",
      "lists"
    )
  );

if (settingsSnap.exists()) {

  setMinistries(
    settingsSnap.data()
      ?.ministries || []
  );

  setRoles(
  settingsSnap.data()?.roles || [
    "Elder",
    "Session Clerk",
    "Lay Preacher",
    "Evangelism Coordinator",
    "Catechist",
  ]
);

}


    } catch (e) {

      console.log(
        "❌ LOAD MEMBERS",
        e
      );

    }

  };

  if (visitor) {
    loadMembers();
  }

}, [visitor]);

  const saveAssignment =
    async () => {

        if (!selectedTarget) {

  Alert.alert(
    "Required",
    "Please select a member."
  );

  return;
}

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
            assignment: {
  type: assignmentType,

 id:
  assignmentType === "member"
    ? selectedTarget.id
    : selectedTarget,

name:
  assignmentType === "member"
    ? selectedTarget.name
    : selectedTarget,


              assignedAt:
                new Date()
                  .toISOString(),
            },
          }
        );

        Alert.alert(
          "Success",
          "Visitor assigned."
        );

        navigation.goBack();

      } catch (e) {

        Alert.alert(
          "Error",
          e.message
        );
      }
    };

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title="Assign Visitor"
        subtitle={visitor?.name}
        onBack={() =>
          navigation.goBack()
        }
      />

      <View style={styles.container}>

        <Text
          style={styles.label}
        >
          Assignment Type
        </Text>

        {[
          "member",
          "ministry",
          "role",
        ].map((item) => (


          <TouchableOpacity
            key={item}
            style={[
              styles.option,

              assignmentType === item &&
                styles.selected,
            ]}
            onPress={() =>
              setAssignmentType(
                item
              )
            }
          >
            <Text>
              {item.toUpperCase()}
            </Text>
          </TouchableOpacity>

        ))}

{assignmentType === "member" && (

  <>
    <Text style={styles.label}>
      Select Member
    </Text>

    {members.map((item) => (

      <TouchableOpacity
        key={item.id}
        style={[
          styles.option,
          selectedTarget?.id === item.id &&
            styles.selected,
        ]}
        onPress={() =>
          setSelectedTarget(item)
        }
      >
        <Text>
          {item.name}
        </Text>
      </TouchableOpacity>

    ))}
  </>

)}

{assignmentType === "ministry" && (

  <>
    <Text style={styles.label}>
      Select Ministry
    </Text>

    {ministries.map((item) => (

      <TouchableOpacity
        key={item}
        style={[
          styles.option,
          selectedTarget === item &&
            styles.selected,
        ]}
        onPress={() =>
          setSelectedTarget(item)
        }
      >
        <Text>
          {item}
        </Text>
      </TouchableOpacity>

    ))}
  </>

)}
{assignmentType === "role" && (

  <>
    <Text style={styles.label}>
      Select Role
    </Text>

    {roles.map((item) => (

      <TouchableOpacity
        key={item}
        style={[
          styles.option,
          selectedTarget === item &&
            styles.selected,
        ]}
        onPress={() =>
          setSelectedTarget(item)
        }
      >
        <Text>
          {item}
        </Text>
      </TouchableOpacity>

    ))}
  </>

)}


        <TouchableOpacity
          style={styles.saveBtn}
          onPress={
            saveAssignment
          }
        >
          <Text
            style={{
              color: "#fff",
            }}
          >
            Save Assignment
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles =
  StyleSheet.create({

    container: {
      padding: 16,
    },

    label: {
      fontWeight: "700",
      marginBottom: 10,
    },

    option: {
      backgroundColor:
        "#eee",
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    },

    selected: {
      backgroundColor:
        "#DDE3FF",
    },

    saveBtn: {
      backgroundColor:
        "#4B3F72",

      padding: 16,

      borderRadius: 12,

      marginTop: 20,

      alignItems:
        "center",
    },
});