import React from "react";
import { TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function LogoutButton() {
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // ✅ CLEAR STORAGE
              await AsyncStorage.clear();

              // ✅ RESET NAVIGATION (VERY CLEAN)
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });

            } catch (error) {
              console.log("Logout error:", error);
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