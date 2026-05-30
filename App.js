import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

/* ✅ ICONS */
import { Ionicons } from "@expo/vector-icons";

/* ✅ SCREENS */
import HomeScreen from "./screens/HomeScreen";
import AdminUploadFlyer from "./screens/AdminUploadFlyer";
import MembersScreen from "./screens/MembersScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import SettingsScreen from "./screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,

          /* ✅ ICONS */
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Members") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Attendance") {
              iconName = focused ? "checkmark-circle" : "checkmark-circle-outline";
            } else if (route.name === "Upload") {
              iconName = focused ? "cloud-upload" : "cloud-upload-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={22} color={color} />;
          },

          /* ✅ COLORS */
          tabBarActiveTintColor: "#4B3F72",
          tabBarInactiveTintColor: "#999",

          /* ✅ ✅ ✅ FLOATING STYLE */
          tabBarStyle: {
            position: "absolute",
            bottom: 15,
            left: 15,
            right: 15,
            height: 65,
            borderRadius: 20,
            backgroundColor: "#fff",
            elevation: 8,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 10,
            paddingBottom: 8
          },

          tabBarLabelStyle: {
            fontSize: 11
          }
        })}
      >

        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Members" component={MembersScreen} />
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
        <Tab.Screen name="Upload" component={AdminUploadFlyer} />
        <Tab.Screen name="Settings" component={SettingsScreen} />

      </Tab.Navigator>
    </NavigationContainer>
  );
}