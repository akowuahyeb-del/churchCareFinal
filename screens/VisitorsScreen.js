import React, {
  useState,
  useEffect,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";

import AppHeader from "../components/AppHeader";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { db } from "../firebase";

import {
  VISITOR_TYPES,
} from "../constants/visitorConstants";


export default function VisitorsScreen({
  navigation,
}) {

const [visitors, setVisitors] =
  useState([]);


    useEffect(() => {
  loadVisitors();
}, []);

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
      "❌ LOAD VISITORS:",
      e
    );
  }
};

const firstTimeCount =
  visitors.filter(
    v =>
      v.visitorType ===
      VISITOR_TYPES.FIRST_TIME
  ).length;

const returningCount =
  visitors.filter(
    v =>
      v.visitorType ===
      VISITOR_TYPES.RETURNING
  ).length;

const visitingMemberCount =
  visitors.filter(
    v =>
      v.visitorType ===
      VISITOR_TYPES.VISITING_MEMBER
  ).length;

const interestedCount =
  visitors.filter(
    v =>
      v.interestedInMembership === true
  ).length;

const convertedCount =
  visitors.filter(
    v =>
      v.convertedToMember === true
  ).length;

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title="Visitors"
        subtitle="Follow-up & Outreach"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >

        {/* Dashboard Stats */}

<View style={styles.statsRow}>

  <View style={styles.statCard}>
    <Text style={styles.statNumber}>0</Text>
    <Text style={styles.statLabel}>
      First Time Visitors
    </Text>
  </View>

  <View style={styles.statCard}>
    <Text style={styles.statNumber}>0</Text>
    <Text style={styles.statLabel}>
      Returning Visitors
    </Text>
  </View>

</View>

<View style={styles.statsRow}>

  <View style={styles.statCard}>
    <Text style={styles.statNumber}>0</Text>
    <Text style={styles.statLabel}>
      Interested
    </Text>
  </View>

  <View style={styles.statCard}>
    <Text style={styles.statNumber}>0</Text>
    <Text style={styles.statLabel}>
      Converted
    </Text>
  </View>

</View>

<View style={styles.statsRow}>

  <View style={styles.statCard}>
    <Text style={styles.statNumber}>0</Text>
    <Text style={styles.statLabel}>
      Visiting Members
    </Text>
  </View>

  <View style={styles.statCard}>
    <Text style={styles.statNumber}>0</Text>
    <Text style={styles.statLabel}>
      Total Visitors
    </Text>
  </View>

</View>

        {/* Actions */}

       <TouchableOpacity
  style={styles.actionBtn}
  onPress={async () => {

    const data =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    if (!data) {
      Alert.alert(
        "Error",
        "No active church selected"
      );
      return;
    }

    const {
      entityId,
      organizationId,
    } = JSON.parse(data);

    navigation.navigate(
      "AddVisitor",
      {
        entityId,
        organizationId,
      }
    );
  }}
>
  <Text style={styles.actionText}>
    + Add Visitor
  </Text>
</TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>
            Visitor QR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>
            Share Visitor Link
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#4B3F72",
  },

  statLabel: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
  },

  actionBtn: {
    backgroundColor: "#4B3F72",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },

  actionText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
});