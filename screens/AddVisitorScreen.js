import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import AppHeader from "../components/AppHeader";

import { addVisitor } from "../utils/visitorIntake";

import {
  VISITOR_TYPES,
} from "../constants/visitorConstants";

export default function AddVisitorScreen({
  navigation,
  route,
}) {

  const {
    organizationId,
    entityId,
  } = route.params || {};

  console.log("ADD VISITOR PARAMS", {
  organizationId,
  entityId,
});

  const [visitor, setVisitor] = useState({
    name: "",
    phone: "",
    address: "",
    suburb: "",

    invitedBy: "",

    notes: "",

    visitorType:
      VISITOR_TYPES.FIRST_TIME,
  });

  const saveVisitor = async () => {

  console.log("🔥 SAVE VISITOR CLICKED");

  console.log("🔥 ROUTE PARAMS", {
    organizationId,
    entityId,
  });

  console.log("🔥 VISITOR DATA", visitor);

  if (!visitor.name || !visitor.phone) {
    Alert.alert(
      "Required",
      "Name and phone are required."
    );
    return;
  }

  try {

    const result = await addVisitor({
      organizationId,
      entityId,

      ...visitor,
    });

    console.log(
      "✅ ADD VISITOR RESULT",
      result
    );

    if (
      !result.created &&
      result.duplicate
    ) {
      Alert.alert(
        "Duplicate Visitor",
        `${result.visitor.name} already exists.`
      );
      return;
    }

    Alert.alert(
      "Success",
      "Visitor recorded successfully."
    );

    navigation.goBack();

  } catch (e) {

    console.log(
      "❌ SAVE VISITOR ERROR",
      e
    );

    Alert.alert(
      "Error",
      e.message
    );
  }
};


  return (
    <SafeAreaView style={styles.safe}>

      <AppHeader
        title="Add Visitor"
        subtitle="Visitor follow-up registration"
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
      >
<Text style={{ color: "red", marginBottom: 5 }}>
  ORG: {organizationId || "MISSING"}
</Text>

<Text style={{ color: "red", marginBottom: 15 }}>
  ENTITY: {entityId || "MISSING"}
</Text>




        <View style={styles.card}>

          <Text style={styles.label}>
            FULL NAME *
          </Text>

          <TextInput
            style={styles.input}
            value={visitor.name}
            onChangeText={(t) =>
              setVisitor(prev => ({
                ...prev,
                name: t,
              }))
            }
          />

          <Text style={styles.label}>
            PHONE *
          </Text>

          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={visitor.phone}
            onChangeText={(t) =>
              setVisitor(prev => ({
                ...prev,
                phone: t,
              }))
            }
          />

          <Text style={styles.label}>
            ADDRESS
          </Text>

          <TextInput
            style={styles.input}
            value={visitor.address}
            onChangeText={(t) =>
              setVisitor(prev => ({
                ...prev,
                address: t,
              }))
            }
          />

          <Text style={styles.label}>
            SUBURB / AREA
          </Text>

          <TextInput
            style={styles.input}
            value={visitor.suburb}
            onChangeText={(t) =>
              setVisitor(prev => ({
                ...prev,
                suburb: t,
              }))
            }
          />

        </View>

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            VISITOR TYPE
          </Text>

          <View style={styles.chipWrap}>

            <TouchableOpacity
              style={[
                styles.chip,
                visitor.visitorType === VISITOR_TYPES.FIRST_TIME &&
                  styles.chipActive,
              ]}
              onPress={() =>
                setVisitor(prev => ({
                  ...prev,
                  visitorType:
                    VISITOR_TYPES.FIRST_TIME,
                }))
              }
            >
              <Text>
                First Time
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                visitor.visitorType === VISITOR_TYPES.RETURNING &&
                  styles.chipActive,
              ]}
              onPress={() =>
                setVisitor(prev => ({
                  ...prev,
                  visitorType:
                    VISITOR_TYPES.RETURNING,
                }))
              }
            >
              <Text>
                Returning
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                visitor.visitorType ===
                  VISITOR_TYPES.VISITING_MEMBER &&
                  styles.chipActive,
              ]}
              onPress={() =>
                setVisitor(prev => ({
                  ...prev,
                  visitorType:
                    VISITOR_TYPES.VISITING_MEMBER,
                }))
              }
            >
              <Text>
                Visiting Member
              </Text>
            </TouchableOpacity>

          </View>

        </View>

        <View style={styles.card}>

          <Text style={styles.label}>
            INVITED BY
          </Text>

          <TextInput
            style={styles.input}
            value={visitor.invitedBy}
            onChangeText={(t) =>
              setVisitor(prev => ({
                ...prev,
                invitedBy: t,
              }))
            }
          />

          <Text style={styles.label}>
            NOTES
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                height: 80,
              },
            ]}
            multiline
            value={visitor.notes}
            onChangeText={(t) =>
              setVisitor(prev => ({
                ...prev,
                notes: t,
              }))
            }
          />

        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={saveVisitor}
        >
          <Text style={styles.saveText}>
            Save Visitor
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  container: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  cardTitle: {
    fontWeight: "700",
    marginBottom: 12,
  },

  label: {
    marginTop: 10,
    marginBottom: 5,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#eee",
    borderRadius: 20,
  },

  chipActive: {
    backgroundColor: "#DDE3FF",
  },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
});
