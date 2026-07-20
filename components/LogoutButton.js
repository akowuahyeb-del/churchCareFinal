// components/LogoutButton.js
//
// ✅ Fully clears session before navigating to Login:
//   1. Clear AsyncStorage FIRST (so LoginScreen useEffect sees no session)
//   2. Sign out Firebase (await propagation)
//   3. Navigate with reset (not replace) so back-nav can't return to Home

import React from "react";
import { TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function LogoutButton() {
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      "Sign Out?",
      "You will need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              // ✅ 1. Clear stored session FIRST
              await AsyncStorage.multiRemove([
                "isLoggedIn",
                "currentUser",
                "activeEntity",
                "role",
                "userToken",
                "userProfile"
              ]);

              // ✅ 2. Sign out Firebase and await propagation
              await signOut(auth);

              // ✅ 3. Reset navigation stack to Login (not replace)
              //     This wipes the stack so nothing can auto-return to Home
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                })
              );
            } catch (error) {
              console.log("❌ LOGOUT ERROR:", error);
              Alert.alert("Error", "Failed to log out");
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleLogout}>
      <Text style={styles.text}>Logout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#e74c3c",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});