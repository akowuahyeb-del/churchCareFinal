import React from "react";
import { db } from "../firebase";
import AsyncStorage
  from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";


import AppHeader from "../components/AppHeader";

export default function ApprovalRequestDetailScreen({
  navigation,
  route,
}) {

  const request =
    route?.params?.request || {};

  const handleApprove = async () => {

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

    const requestRef =
      doc(
        db,
        "organizations",
        entity.organizationId,
        "approvalRequests",
        request.id
      );

    await updateDoc(
      requestRef,
      {
        approvals: arrayUnion(
          "manual-test"
        ),
      }
    );

    Alert.alert(
      "Approved",
      "Approval recorded."
    );

  } catch (error) {

    Alert.alert(
      "Error",
      error.message
    );

  }

};

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title="Approval Request"
        subtitle={
          request.nominationType ||
          "Request"
        }
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >

        <Text>
          Member:
        </Text>

        <Text>
          {request.memberName}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Governance Body:
        </Text>

        <Text>
          {request.governanceBodyName}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Requested By:
        </Text>

        <Text>
          {request.requestedByName ||
            "Unknown"}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Request Type:
        </Text>

        <Text>
          {request.nominationType}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Status:
        </Text>

        <Text>
          {request.status}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Approvals:
        </Text>

        <Text>
          {(request.approvedBy || []).length}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Rejections:
        </Text>

        <Text>
          {(request.rejectedBy || []).length}
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#2E7D32",
            padding: 14,
            borderRadius: 10,
            marginTop: 24,
            alignItems: "center",
          }}
          onPress={handleApprove}
        >
          <Text
            style={{
              color: "#FFF",
              fontWeight: "700",
            }}
          >
            Approve
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#B00020",
            padding: 14,
            borderRadius: 10,
            marginTop: 12,
            alignItems: "center",
          }}
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Rejection logic will be implemented next."
            )
          }
        >
          <Text
            style={{
              color: "#FFF",
              fontWeight: "700",
            }}
          >
            Reject
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </View>
  );
}