import React from "react";
import {
  View,
  Text,
  ScrollView,
} from "react-native";

import AppHeader from "../components/AppHeader";

export default function ApprovalRequestDetailScreen({
  navigation,
  route,
}) {

  const request =
    route?.params?.request || {};

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

      </ScrollView>

    </View>
  );
}