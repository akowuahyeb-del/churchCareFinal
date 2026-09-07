import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase";
import MemberProfileScreen from "./MemberProfileScreen";

export default function MyProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  
  const [errorState, setErrorState] = useState(null); // "no-account" | "no-church" | "not-found" | "load-failed" | null

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorState(null);

    try {
      const userRaw =
        (await AsyncStorage.getItem("currentUser")) ||
        (await AsyncStorage.getItem("user"));

      const entityRaw = await AsyncStorage.getItem("activeEntity");

      if (!userRaw) {
        setErrorState("no-account");
        return;
      }
      if (!entityRaw) {
        setErrorState("no-church");
        return;
      }

      const currentUser = JSON.parse(userRaw);
      const activeEntity = JSON.parse(entityRaw);

      const resolvedUid = currentUser.uid || currentUser.id || null;

      // FIX: pull the viewer's real roles from the same "userRoles" key
      // HomeScreen writes, instead of hardcoding ["member"]. An admin
      // or pastor viewing their own profile should get their actual
      // permission level here too, not be silently downgraded.
      let resolvedPermissions = ["member"];
      try {
        const rolesRaw = await AsyncStorage.getItem("userRoles");
        if (rolesRaw) {
          const parsedRoles = JSON.parse(rolesRaw);
          if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
            resolvedPermissions = parsedRoles;
          }
        }
      } catch (rolesError) {
        console.log("MY PROFILE ROLES ERROR:", rolesError);
        // Fall back to ["member"] — least-privilege default, same
        // reasoning as the HomeScreen fix.
      }

      const snap = await getDocs(
        collection(
          db,
          "organizations",
          activeEntity.organizationId,
          "entities",
          activeEntity.entityId,
          "members"
        )
      );

      const member = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .find((m) => {
          if (resolvedUid && m.uid && m.uid === resolvedUid) return true;
          if (currentUser.email && m.email && m.email === currentUser.email) return true;
          if (currentUser.phone && m.phone && m.phone === currentUser.phone) return true;
          return false;
        });

      if (!member) {
        setErrorState("not-found");
        return;
      }

 navigation.replace("MyMemberProfile", {
  memberId: member.id,

  viewerMemberId: member.id,

  viewerUid: resolvedUid,

  viewerName: currentUser?.name || "",

  viewerPermissions: resolvedPermissions,

  organizationId:
    activeEntity.organizationId,

  entityId:
    activeEntity.entityId,
});

return;
    } catch (e) {
      console.log("MY PROFILE ERROR:", e);
      setErrorState("load-failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
   

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4B3F72" />
      </View>
    );
  }

  if (errorState) {
    const messages = {
      "no-account": "We couldn't find your account. Please sign in again.",
      "no-church": "No church is currently selected. Please choose your church first.",
      "not-found": "Your member record could not be located. Contact your church admin if this seems wrong.",
      "load-failed": "Something went wrong loading your profile.",
    };

    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{messages[errorState]}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  
return (
  <View style={styles.center}>
    <ActivityIndicator
      size="large"
      color="#4B3F72"
    />
  </View>
);


 

}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: "#4B3F72",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  retryBtnText: { color: "#fff", fontWeight: "700" },
  backText: { color: "#888", fontWeight: "600" },
});