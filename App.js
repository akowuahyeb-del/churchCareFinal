import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

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
      <Tab.Navigator screenOptions={{ headerShown: false }}>

        {/* ✅ EXISTING */}
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Members" component={MembersScreen} />
        <Tab.Screen name="Attendance" component={AttendanceScreen} />

        {/* ✅ NEW */}
        <Tab.Screen name="Upload" component={AdminUploadFlyer} />
        <Tab.Screen name="Settings" component={SettingsScreen} />

      </Tab.Navigator>
    </NavigationContainer>
  );
}