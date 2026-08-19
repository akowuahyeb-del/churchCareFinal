import React, {
  useState,
  useEffect,
} from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import AsyncStorage from "@react-native-async-storage/async-storage";

import AppHeader from "../components/AppHeader";
import { db } from "../firebase";

export default function VisitorRegisterScreen({
  navigation,
}) {

  const [visitors, setVisitors] =
    useState([]);

  useEffect(() => {
  const unsubscribe = navigation.addListener(
    "focus",
    () => {
      loadVisitors();
    }
  );

  return unsubscribe;
}, [navigation]);

  const loadVisitors = async () => {

    try {

      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (!stored) return;

      const {
        organizationId,
        entityId,
      } = JSON.parse(stored);

      const snap = await getDocs(
        collection(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "visitors"
        )
      );

      const data =
        snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

      setVisitors(data);

    } catch (e) {

      console.log(
        "❌ LOAD VISITOR REGISTER",
        e
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title="Visitor Register"
        subtitle="All visitors"
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >

        {/* Table Header */}
<View style={styles.headerRow}>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Name
  </Text>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Phone
  </Text>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Area
  </Text>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Date
  </Text>

  <Text style={[styles.headerCell,{ flex: 1 }]}>
    Status
  </Text>

</View>

       {visitors.map((item) => (

  <TouchableOpacity
    key={item.id}
    style={styles.row}
    onPress={() =>
      navigation.navigate(
        "VisitorProfile",
        {
          visitor: item,
        }
      )
    }
  >

    <Text
      style={[
        styles.cell,
        { flex: 2 },
      ]}
      numberOfLines={1}
    >
      {item.name}
    </Text>

    <Text
      style={[
        styles.cell,
        { flex: 2 },
      ]}
      numberOfLines={1}
    >
      {item.phone}
    </Text>

    <Text
      style={[
        styles.cell,
        { flex: 2 },
      ]}
      numberOfLines={1}
    >
      {item.suburb || "-"}
    </Text>

    <Text
      style={[
        styles.cell,
        { flex: 2 },
      ]}
      numberOfLines={1}
    >
      {item.firstVisitDate || "-"}
    </Text>

    <View
      style={[
        styles.statusBadge,

        item.followUpStatus === "new" &&
          styles.statusNew,

        item.followUpStatus === "contacted" &&
          styles.statusContacted,

        item.followUpStatus === "interested" &&
          styles.statusInterested,

        item.followUpStatus === "converted" &&
          styles.statusConverted,
      ]}
    >
      <Text style={styles.statusText}>
        {item.followUpStatus || "new"}
      </Text>
    </View>

  </TouchableOpacity>

))}

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({

  headerRow: {
    flexDirection: "row",
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 8,
  },

  headerCell: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  cell: {
    fontSize: 12,
    color: "#333",
  },
statusBadge: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: "flex-start",
},

statusText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "700",
  textTransform: "capitalize",
},

statusNew: {
  backgroundColor: "#3B82F6",
},

statusContacted: {
  backgroundColor: "#F59E0B",
},

statusInterested: {
  backgroundColor: "#10B981",
},

statusConverted: {
  backgroundColor: "#8B5CF6",
},
});