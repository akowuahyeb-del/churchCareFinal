import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

/* SCREENS */
import HomeScreen from "./screens/HomeScreen";
import MembersScreen from "./screens/MembersScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import SettingsScreen from "./screens/SettingsScreen";
import MemberProfileScreen from "./screens/MemberProfileScreen";
import AdminDashboard from "./screens/AdminDashboard";
import DashboardDetailsScreen from "./screens/DashboardDetailsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MembersMain" component={MembersScreen} />
      <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Members" component={MembersStack} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="DashboardDetails" component={DashboardDetailsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
``