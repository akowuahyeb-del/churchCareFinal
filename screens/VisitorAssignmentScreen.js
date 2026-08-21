import React, {
  useState,
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

  const saveAssignment =
    async () => {

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
              type:
                assignmentType,

              id: null,

              name:
                assignmentType,

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