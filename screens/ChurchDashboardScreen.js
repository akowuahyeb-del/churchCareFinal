import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function ChurchDashboardScreen({ navigation, route }) {
  const churchId = route?.params?.churchId;

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        Church Dashboard
      </Text>

      <TouchableOpacity
        onPress={() => navigation.navigate("Members", { churchId })}
      >
        <Text style={{ marginTop: 20 }}>
          Go to Members
        </Text>
      </TouchableOpacity>
    </View>
  );
}