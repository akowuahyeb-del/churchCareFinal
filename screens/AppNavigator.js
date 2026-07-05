// navigation/AppNavigator.js
//
// ✅ Single source of routing truth. Every navigation decision in the
// app flows through here — no screen decides its own next destination.
// This is what was missing: auth state, org status, and onboarding
// completion were checked in three different places with no coordination.

import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection, query, where, onSnapshot,
  getDocs, doc, getDoc
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Auth screens
import AuthScreen           from "../screens/AuthScreen";
// Onboarding screens
import RegisterChurchScreen from "../screens/RegisterChurchScreen";
import PendingScreen        from "../screens/PendingScreen";
import OnboardingScreen     from "../screens/OnboardingScreen";
// Main app
import MainNavigator        from "./MainNavigator";
// Developer only
import SuperAdminScreen     from "../screens/SuperAdminScreen";

const Stack = createNativeStackNavigator();

// ─────────────────────────────────────────────────────────────────
// USER STATES — what phase of the lifecycle they're in
// ─────────────────────────────────────────────────────────────────
const USER_STATE = {
  LOADING:              "loading",           // checking auth
  UNAUTHENTICATED:      "unauthenticated",   // no firebase user
  NO_ORG:               "no_org",            // logged in, no church submitted
  ORG_PENDING:          "org_pending",       // submitted, awaiting approval
  ORG_REJECTED:         "org_rejected",      // rejected
  ONBOARDING:           "onboarding",        // approved, onboarding not done
  ACTIVE:               "active",            // fully set up
  DEVELOPER:            "developer",         // super admin
};

export default function AppNavigator() {
  const [userState, setUserState]   = useState(USER_STATE.LOADING);
  const [currentUser, setCurrentUser] = useState(null);
  const [orgData, setOrgData]       = useState(null);

  const orgUnsubRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────
  // AUTH STATE LISTENER — the entry point for everything
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Clean up any org listener from previous session
        if (orgUnsubRef.current) { orgUnsubRef.current(); orgUnsubRef.current = null; }
        setCurrentUser(null);
        setOrgData(null);
        setUserState(USER_STATE.UNAUTHENTICATED);
        return;
      }

      setCurrentUser(user);

      // ✅ Check if this is a developer account
      // Store a "developer: true" custom claim or check a Firestore
      // allowlist — we use a simple Firestore doc here
      try {
        const devSnap = await getDoc(doc(db, "platform", "developers", user.uid));
        if (devSnap.exists() && devSnap.data().active) {
          setUserState(USER_STATE.DEVELOPER);
          return;
        }
      } catch (_) {}

      // ✅ Start listening to this user's organization in real time
      // so when the developer approves it, the user's screen updates
      // automatically without needing to log out and back in.
      watchUserOrg(user.uid);
    });

    return () => {
      unsubAuth();
      if (orgUnsubRef.current) orgUnsubRef.current();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // REAL-TIME ORG WATCHER
  // ✅ This is the fix for "disconnected onboarding": instead of a
  // one-time check at login, we keep a live listener on the org doc.
  // The moment a developer approves the church, `status` changes to
  // "active" and this fires — the user sees the approval notification
  // without touching the app.
  // ─────────────────────────────────────────────────────────────────
  const watchUserOrg = (uid) => {
    if (orgUnsubRef.current) { orgUnsubRef.current(); orgUnsubRef.current = null; }

    const q = query(
      collection(db, "organizations"),
      where("submittedByUid", "==", uid)
    );

    orgUnsubRef.current = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        setOrgData(null);
        setUserState(USER_STATE.NO_ORG);
        return;
      }

      const orgDoc = snap.docs[0];
      const org = { id: orgDoc.id, ...orgDoc.data() };
      setOrgData(org);

      if (org.status === "rejected") {
        setUserState(USER_STATE.ORG_REJECTED);
        return;
      }

      if (org.status === "pending") {
        setUserState(USER_STATE.ORG_PENDING);
        return;
      }

      // Status is "active" — check onboarding completion
      if (org.status === "active") {
        const onboardingDone = await checkOnboardingComplete(uid, org.id);

        if (!onboardingDone) {
          // ✅ Store activeEntity now — onboarding needs it, and the
          // dashboard reads from it. This is what was missing: the link
          // between "your org was approved" and "this device knows which
          // org to use".
          await storeActiveEntity(org);
          setUserState(USER_STATE.ONBOARDING);
        } else {
          await storeActiveEntity(org);
          setUserState(USER_STATE.ACTIVE);
        }
      }
    }, (e) => {
      console.log("❌ watchUserOrg error:", e);
      setUserState(USER_STATE.NO_ORG);
    });
  };

  const checkOnboardingComplete = async (uid, orgId) => {
    try {
      // Check the user's own onboarding record under the org
      const snap = await getDoc(
        doc(db, "organizations", orgId, "onboarding", uid)
      );
      return snap.exists() && snap.data().completed === true;
    } catch (_) {
      return false;
    }
  };

  // ✅ Store activeEntity in AsyncStorage — this is what every other
  // screen in the app reads to scope its Firestore queries. Until now
  // there was no single place that reliably set this after approval.
  const storeActiveEntity = async (org) => {
    try {
      // Find the primary entity for this org
      const entitiesSnap = await getDocs(
        collection(db, "organizations", org.id, "entities")
      );
      if (entitiesSnap.empty) return;

      const entity = entitiesSnap.docs[0];
      const activeEntity = {
        organizationId: org.id,
        entityId: entity.id,
        name: entity.data().name || org.name,
        organizationName: org.name,
      };

      await AsyncStorage.setItem("activeEntity", JSON.stringify(activeEntity));
    } catch (e) {
      console.log("❌ storeActiveEntity:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  if (userState === USER_STATE.LOADING) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#4B3F72" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {userState === USER_STATE.UNAUTHENTICATED && (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}

        {userState === USER_STATE.NO_ORG && (
          <Stack.Screen
            name="RegisterChurch"
            component={RegisterChurchScreen}
            initialParams={{ uid: currentUser?.uid, email: currentUser?.email }}
          />
        )}

        {userState === USER_STATE.ORG_PENDING && (
          <Stack.Screen
            name="Pending"
            component={PendingScreen}
            initialParams={{ org: orgData }}
          />
        )}

        {userState === USER_STATE.ORG_REJECTED && (
          <Stack.Screen
            name="Rejected"
            component={RejectedScreen}
            initialParams={{ org: orgData, uid: currentUser?.uid }}
          />
        )}

        {userState === USER_STATE.ONBOARDING && (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            initialParams={{
              org: orgData,
              uid: currentUser?.uid,
              email: currentUser?.email,
            }}
          />
        )}

        {userState === USER_STATE.ACTIVE && (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}

        {userState === USER_STATE.DEVELOPER && (
          <>
            <Stack.Screen name="SuperAdmin" component={SuperAdminScreen} />
            <Stack.Screen name="Main" component={MainNavigator} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Simple rejected screen inline — too small to need its own file
function RejectedScreen({ route, navigation }) {
  const { org } = route?.params || {};
  const { signOut } = require("firebase/auth");
  const { auth } = require("../firebase");
  const { View, Text, TouchableOpacity, StyleSheet: S } = require("react-native");
  const { Ionicons } = require("@expo/vector-icons");

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fb", alignItems: "center", justifyContent: "center", padding: 30 }}>
      <Ionicons name="close-circle" size={56} color="#e74c3c" />
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#222", marginTop: 16 }}>Registration Not Approved</Text>
      <Text style={{ fontSize: 13, color: "#888", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
        {org?.rejectionReason
          ? `Reason: ${org.rejectionReason}`
          : "Your church registration was not approved. Please contact support for more information."}
      </Text>
      <TouchableOpacity
        onPress={() => signOut(auth)}
        style={{ marginTop: 30, backgroundColor: "#4B3F72", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center" },
});